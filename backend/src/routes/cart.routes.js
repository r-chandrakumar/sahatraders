const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { body, validationResult } = require('express-validator');

// Middleware to get or create cart
const getOrCreateCart = async (req, res, next) => {
  try {
    let cartId = req.cookies.cart_id;
    let customerId = null;

    // Check if customer is logged in
    if (req.cookies.customer_token) {
      try {
        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(req.cookies.customer_token, process.env.JWT_SECRET);
        customerId = decoded.id;
      } catch {}
    }

    if (cartId) {
      // Verify cart exists
      const [carts] = await db.query('SELECT * FROM carts WHERE id = ?', [cartId]);
      if (carts.length > 0) {
        req.cart = carts[0];

        // Link cart to customer if logged in
        if (customerId && !req.cart.customer_id) {
          await db.query('UPDATE carts SET customer_id = ? WHERE id = ?', [customerId, cartId]);
          req.cart.customer_id = customerId;
        }

        return next();
      }
    }

    // Check if customer has existing cart
    if (customerId) {
      const [customerCarts] = await db.query(
        'SELECT * FROM carts WHERE customer_id = ? ORDER BY created_at DESC LIMIT 1',
        [customerId]
      );
      if (customerCarts.length > 0) {
        req.cart = customerCarts[0];
        res.cookie('cart_id', req.cart.id, { maxAge: 30 * 24 * 60 * 60 * 1000 });
        return next();
      }
    }

    // Create new cart
    const [result] = await db.query(
      'INSERT INTO carts (customer_id) VALUES (?)',
      [customerId]
    );

    req.cart = { id: result.insertId, customer_id: customerId };
    res.cookie('cart_id', result.insertId, { maxAge: 30 * 24 * 60 * 60 * 1000 });

    next();
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get cart
router.get('/', getOrCreateCart, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT ci.*, pv.sku, pv.variant_name, pv.sell_price, pv.stock_qty as stock_quantity,
             p.id as product_id, p.name as product_name, p.slug,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
      FROM cart_items ci
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE ci.cart_id = ?
    `, [req.cart.id]);

    // Calculate totals
    let subtotal = 0;
    let totalItems = 0;

    const validItems = items.map(item => {
      const itemTotal = item.quantity * item.sell_price;
      subtotal += itemTotal;
      totalItems += item.quantity;

      return {
        ...item,
        item_total: itemTotal,
        in_stock: item.stock_quantity >= item.quantity
      };
    });

    res.json({
      cart_id: req.cart.id,
      items: validItems,
      subtotal,
      total_items: totalItems
    });
  } catch (error) {
    console.error('Get cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to cart
router.post('/add',
  getOrCreateCart,
  [
    body('variant_id').notEmpty().withMessage('Product variant is required'),
    body('quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { variant_id, quantity } = req.body;

      // Check variant exists and has stock
      const [variants] = await db.query(`
        SELECT pv.*, p.name as product_name
        FROM product_variants pv
        LEFT JOIN products p ON pv.product_id = p.id
        WHERE pv.id = ? AND p.is_active = 1
      `, [variant_id]);

      if (variants.length === 0) {
        return res.status(404).json({ message: 'Product not found' });
      }

      const variant = variants[0];

      // Check existing cart item
      const [existingItems] = await db.query(
        'SELECT * FROM cart_items WHERE cart_id = ? AND variant_id = ?',
        [req.cart.id, variant_id]
      );

      let newQuantity = quantity;
      if (existingItems.length > 0) {
        newQuantity = existingItems[0].quantity + quantity;
      }

      // Check stock
      if (newQuantity > variant.stock_quantity) {
        return res.status(400).json({
          message: `Only ${variant.stock_quantity} items available`,
          available_stock: variant.stock_quantity
        });
      }

      if (existingItems.length > 0) {
        // Update quantity
        await db.query(
          'UPDATE cart_items SET quantity = ? WHERE id = ?',
          [newQuantity, existingItems[0].id]
        );
      } else {
        // Insert new item
        await db.query(
          'INSERT INTO cart_items (cart_id, variant_id, quantity) VALUES (?, ?, ?)',
          [req.cart.id, variant_id, quantity]
        );
      }

      // Update cart timestamp
      await db.query('UPDATE carts SET updated_at = NOW() WHERE id = ?', [req.cart.id]);

      res.json({
        message: 'Added to cart',
        product_name: variant.product_name,
        variant_name: variant.variant_name,
        quantity: newQuantity
      });
    } catch (error) {
      console.error('Add to cart error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update cart item quantity
router.put('/items/:itemId',
  getOrCreateCart,
  [
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be 0 or more'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { quantity } = req.body;

      // Get cart item
      const [items] = await db.query(`
        SELECT ci.*, pv.stock_qty as stock_quantity
        FROM cart_items ci
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.id = ? AND ci.cart_id = ?
      `, [req.params.itemId, req.cart.id]);

      if (items.length === 0) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const item = items[0];

      if (quantity === 0) {
        // Remove item
        await db.query('DELETE FROM cart_items WHERE id = ?', [req.params.itemId]);
        return res.json({ message: 'Item removed from cart' });
      }

      // Check stock
      if (quantity > item.stock_quantity) {
        return res.status(400).json({
          message: `Only ${item.stock_quantity} items available`,
          available_stock: item.stock_quantity
        });
      }

      await db.query(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [quantity, req.params.itemId]
      );

      res.json({ message: 'Cart updated' });
    } catch (error) {
      console.error('Update cart error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Remove cart item
router.delete('/items/:itemId', getOrCreateCart, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM cart_items WHERE id = ? AND cart_id = ?',
      [req.params.itemId, req.cart.id]
    );
    res.json({ message: 'Item removed from cart' });
  } catch (error) {
    console.error('Remove cart item error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Clear cart
router.delete('/clear', getOrCreateCart, async (req, res) => {
  try {
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [req.cart.id]);
    res.json({ message: 'Cart cleared' });
  } catch (error) {
    console.error('Clear cart error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Apply coupon
router.post('/coupon',
  getOrCreateCart,
  [
    body('code').notEmpty().withMessage('Coupon code is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { code } = req.body;

      // Find coupon
      const [coupons] = await db.query(`
        SELECT * FROM coupons
        WHERE code = ? AND is_active = 1
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
          AND (usage_limit IS NULL OR usage_count < usage_limit)
      `, [code.toUpperCase()]);

      if (coupons.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired coupon' });
      }

      const coupon = coupons[0];

      // Get cart total
      const [cartItems] = await db.query(`
        SELECT SUM(ci.quantity * pv.sell_price) as subtotal
        FROM cart_items ci
        LEFT JOIN product_variants pv ON ci.variant_id = pv.id
        WHERE ci.cart_id = ?
      `, [req.cart.id]);

      const subtotal = cartItems[0].subtotal || 0;

      // Check minimum order
      if (coupon.min_order_amount && subtotal < coupon.min_order_amount) {
        return res.status(400).json({
          message: `Minimum order amount is ₹${coupon.min_order_amount}`
        });
      }

      // Calculate discount
      let discount = 0;
      if (coupon.discount_type === 'percentage') {
        discount = (subtotal * coupon.discount_value) / 100;
        if (coupon.max_discount && discount > coupon.max_discount) {
          discount = coupon.max_discount;
        }
      } else {
        discount = coupon.discount_value;
      }

      // Update cart with coupon
      await db.query(
        'UPDATE carts SET coupon_id = ?, coupon_discount = ? WHERE id = ?',
        [coupon.id, discount, req.cart.id]
      );

      res.json({
        message: 'Coupon applied',
        coupon: {
          code: coupon.code,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          discount_amount: discount
        }
      });
    } catch (error) {
      console.error('Apply coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Remove coupon
router.delete('/coupon', getOrCreateCart, async (req, res) => {
  try {
    await db.query(
      'UPDATE carts SET coupon_id = NULL, coupon_discount = 0 WHERE id = ?',
      [req.cart.id]
    );
    res.json({ message: 'Coupon removed' });
  } catch (error) {
    console.error('Remove coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get cart summary for checkout
router.get('/summary', getOrCreateCart, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT ci.*, pv.sell_price, pv.stock_qty as stock_quantity, pv.tax_percent,
             p.name as product_name
      FROM cart_items ci
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE ci.cart_id = ?
    `, [req.cart.id]);

    if (items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    let subtotal = 0;
    let tax = 0;

    for (const item of items) {
      const itemSubtotal = item.quantity * item.sell_price;
      subtotal += itemSubtotal;
      tax += itemSubtotal * ((item.tax_percent || 0) / 100);
    }

    // Get cart coupon
    const [cart] = await db.query('SELECT * FROM carts WHERE id = ?', [req.cart.id]);
    const discount = cart[0].coupon_discount || 0;

    // Get shipping settings
    const [shippingSettings] = await db.query(`
      SELECT setting_value FROM settings WHERE setting_key IN ('free_shipping_threshold', 'default_shipping_charge')
    `);

    let shippingCharge = 50; // default
    let freeShippingThreshold = 1000;

    shippingSettings.forEach(s => {
      if (s.setting_key === 'default_shipping_charge') shippingCharge = parseFloat(s.setting_value);
      if (s.setting_key === 'free_shipping_threshold') freeShippingThreshold = parseFloat(s.setting_value);
    });

    if (subtotal >= freeShippingThreshold) {
      shippingCharge = 0;
    }

    const total = subtotal + tax - discount + shippingCharge;

    res.json({
      subtotal,
      tax,
      discount,
      shipping: shippingCharge,
      total,
      free_shipping_threshold: freeShippingThreshold,
      items_count: items.length
    });
  } catch (error) {
    console.error('Get cart summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
