const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');
const Razorpay = require('razorpay');
const crypto = require('crypto');

// Initialize Razorpay
let razorpay;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_ID !== 'your_razorpay_key_id') {
  razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
} else {
  console.warn('Warning: Razorpay keys not configured. Payment features will be unavailable.');
}

// Helper to generate order number
const generateOrderNumber = async (connection) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');

  const [lastOrder] = await connection.query(
    'SELECT order_number FROM sales_orders ORDER BY id DESC LIMIT 1'
  );

  let sequence = 1;
  if (lastOrder.length > 0) {
    const lastNum = parseInt(lastOrder[0].order_number.split('-').pop());
    sequence = lastNum + 1;
  }

  return `SO-${year}${month}-${String(sequence).padStart(4, '0')}`;
};

// Create order (checkout)
router.post('/create-order',
  [
    body('customer_name').notEmpty().withMessage('Name is required'),
    body('customer_phone').notEmpty().withMessage('Phone is required'),
    body('shipping_address').notEmpty().withMessage('Shipping address is required'),
    body('payment_method').isIn(['cod', 'online', 'bank_transfer']).withMessage('Invalid payment method'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const {
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        billing_address,
        payment_method,
        notes
      } = req.body;

      // Get cart
      const cartId = req.cookies.cart_id;
      if (!cartId) {
        await connection.rollback();
        return res.status(400).json({ message: 'Cart not found' });
      }

      // Get cart items with stock check
      const [items] = await connection.query(`
        SELECT ci.*, pv.selling_price, pv.stock_quantity, pv.tax_rate, pv.cost_price,
               p.name as product_name, pv.variant_name
        FROM cart_items ci
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        LEFT JOIN products p ON pv.product_id = p.id
        WHERE ci.cart_id = ?
      `, [cartId]);

      if (items.length === 0) {
        await connection.rollback();
        return res.status(400).json({ message: 'Cart is empty' });
      }

      // Check stock for all items
      for (const item of items) {
        if (item.quantity > item.stock_quantity) {
          await connection.rollback();
          return res.status(400).json({
            message: `Insufficient stock for ${item.product_name} - ${item.variant_name}`,
            available: item.stock_quantity
          });
        }
      }

      // Calculate totals
      let subtotal = 0;
      let taxAmount = 0;

      for (const item of items) {
        const itemSubtotal = item.quantity * item.selling_price;
        subtotal += itemSubtotal;
        taxAmount += itemSubtotal * ((item.tax_rate || 0) / 100);
      }

      // Get cart coupon
      const [cart] = await connection.query('SELECT * FROM carts WHERE id = ?', [cartId]);
      const discountAmount = cart[0]?.coupon_discount || 0;

      // Get shipping
      const [shippingSettings] = await connection.query(`
        SELECT setting_key, setting_value FROM settings
        WHERE setting_key IN ('free_shipping_threshold', 'default_shipping_charge')
      `);

      let shippingCharge = 50;
      let freeThreshold = 1000;

      shippingSettings.forEach(s => {
        if (s.setting_key === 'default_shipping_charge') shippingCharge = parseFloat(s.setting_value);
        if (s.setting_key === 'free_shipping_threshold') freeThreshold = parseFloat(s.setting_value);
      });

      if (subtotal >= freeThreshold) shippingCharge = 0;

      const totalAmount = subtotal + taxAmount - discountAmount + shippingCharge;

      // Get customer ID if logged in
      let customerId = null;
      if (req.cookies.customer_token) {
        try {
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(req.cookies.customer_token, process.env.JWT_SECRET);
          customerId = decoded.id;
        } catch {}
      }

      // Generate order number
      const orderNumber = await generateOrderNumber(connection);

      // Create order
      const [orderResult] = await connection.query(`
        INSERT INTO sales_orders (
          order_number, customer_id, customer_name, customer_email, customer_phone,
          shipping_address, billing_address, subtotal, tax_amount, discount_amount,
          shipping_charge, total_amount, payment_method, status, payment_status, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'unpaid', ?)
      `, [
        orderNumber, customerId, customer_name, customer_email, customer_phone,
        shipping_address, billing_address || shipping_address, subtotal, taxAmount,
        discountAmount, shippingCharge, totalAmount, payment_method, notes
      ]);

      const orderId = orderResult.insertId;

      // Insert order items and update stock
      for (const item of items) {
        await connection.query(`
          INSERT INTO sales_order_items (
            sales_order_id, variant_id, quantity, unit_price, cost_price, tax_rate, tax_amount, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          orderId, item.variant_id, item.quantity, item.selling_price, item.cost_price,
          item.tax_rate || 0, (item.quantity * item.selling_price * (item.tax_rate || 0) / 100),
          item.quantity * item.selling_price
        ]);

        // Reserve stock (deduct from available)
        await connection.query(`
          UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?
        `, [item.quantity, item.variant_id]);

        // Record stock movement
        await connection.query(`
          INSERT INTO stock_movements (variant_id, movement_type, quantity, reference_type, reference_id, notes)
          VALUES (?, 'sale', ?, 'sales_order', ?, 'Stock reserved for order ${orderNumber}')
        `, [item.variant_id, -item.quantity, orderId]);
      }

      // Update coupon usage
      if (cart[0]?.coupon_id) {
        await connection.query(
          'UPDATE coupons SET usage_count = usage_count + 1 WHERE id = ?',
          [cart[0].coupon_id]
        );
      }

      // Clear cart
      await connection.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);
      await connection.query('UPDATE carts SET coupon_id = NULL, coupon_discount = 0 WHERE id = ?', [cartId]);

      await connection.commit();

      // If online payment, create Razorpay order
      if (payment_method === 'online') {
        try {
          const razorpayOrder = await razorpay.orders.create({
            amount: Math.round(totalAmount * 100), // Convert to paise
            currency: 'INR',
            receipt: orderNumber,
            notes: {
              order_id: orderId,
              customer_phone
            }
          });

          // Store Razorpay order ID
          await db.query(
            'UPDATE sales_orders SET razorpay_order_id = ? WHERE id = ?',
            [razorpayOrder.id, orderId]
          );

          return res.json({
            message: 'Order created',
            order_id: orderId,
            order_number: orderNumber,
            total: totalAmount,
            payment_method: 'online',
            razorpay: {
              order_id: razorpayOrder.id,
              amount: razorpayOrder.amount,
              currency: razorpayOrder.currency,
              key: process.env.RAZORPAY_KEY_ID
            }
          });
        } catch (razorpayError) {
          console.error('Razorpay error:', razorpayError);
          // Continue without Razorpay if it fails
        }
      }

      res.json({
        message: 'Order placed successfully',
        order_id: orderId,
        order_number: orderNumber,
        total: totalAmount,
        payment_method
      });
    } catch (error) {
      await connection.rollback();
      console.error('Create order error:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      connection.release();
    }
  }
);

// Verify Razorpay payment
router.post('/verify-payment',
  [
    body('razorpay_order_id').notEmpty(),
    body('razorpay_payment_id').notEmpty(),
    body('razorpay_signature').notEmpty(),
  ],
  async (req, res) => {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      // Verify signature
      const body = razorpay_order_id + '|' + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: 'Invalid payment signature' });
      }

      // Get order by Razorpay order ID
      const [orders] = await db.query(
        'SELECT * FROM sales_orders WHERE razorpay_order_id = ?',
        [razorpay_order_id]
      );

      if (orders.length === 0) {
        return res.status(404).json({ message: 'Order not found' });
      }

      const order = orders[0];

      // Update order payment status
      await db.query(`
        UPDATE sales_orders
        SET payment_status = 'paid', status = 'confirmed', razorpay_payment_id = ?
        WHERE id = ?
      `, [razorpay_payment_id, order.id]);

      // Create invoice
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const [lastInvoice] = await db.query('SELECT invoice_number FROM invoices ORDER BY id DESC LIMIT 1');

      let invoiceSeq = 1;
      if (lastInvoice.length > 0) {
        const lastNum = parseInt(lastInvoice[0].invoice_number.split('-').pop());
        invoiceSeq = lastNum + 1;
      }
      const invoiceNumber = `INV-${year}${month}-${String(invoiceSeq).padStart(4, '0')}`;

      const [invoiceResult] = await db.query(`
        INSERT INTO invoices (invoice_number, sales_order_id, subtotal, tax_amount, discount_amount, total_amount, payment_status)
        VALUES (?, ?, ?, ?, ?, ?, 'paid')
      `, [invoiceNumber, order.id, order.subtotal, order.tax_amount, order.discount_amount, order.total_amount]);

      // Record payment
      await db.query(`
        INSERT INTO payments (invoice_id, amount, payment_method, payment_reference, payment_date)
        VALUES (?, ?, 'razorpay', ?, NOW())
      `, [invoiceResult.insertId, order.total_amount, razorpay_payment_id]);

      res.json({
        message: 'Payment verified successfully',
        order_number: order.order_number,
        invoice_number: invoiceNumber
      });
    } catch (error) {
      console.error('Verify payment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get order confirmation details
router.get('/confirmation/:orderNumber', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT so.*
      FROM sales_orders so
      WHERE so.order_number = ?
    `, [req.params.orderNumber]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Get items
    const [items] = await db.query(`
      SELECT soi.*, p.name as product_name, pv.variant_name,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
      FROM sales_order_items soi
      LEFT JOIN product_variants pv ON soi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE soi.sales_order_id = ?
    `, [order.id]);

    order.items = items;

    res.json(order);
  } catch (error) {
    console.error('Get confirmation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
