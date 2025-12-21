const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate, generateOrderNumber } = require('../utils/helpers');

// Get all sales orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, source, q } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT so.*,
        (SELECT SUM(amount) FROM payments WHERE sales_order_id = so.id) as paid_amount
      FROM sales_orders so
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM sales_orders WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND so.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (source) {
      query += ' AND so.source = ?';
      countQuery += ' AND source = ?';
      params.push(source);
      countParams.push(source);
    }

    if (q) {
      query += ' AND (so.order_number LIKE ? OR so.customer_name LIKE ? OR so.customer_email LIKE ?)';
      countQuery += ' AND (order_number LIKE ? OR customer_name LIKE ? OR customer_email LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY so.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [orders] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);

    res.json(formatResponse(orders, {
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / pageLimit)
      }
    }));
  } catch (error) {
    next(error);
  }
});

// Get sales order by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      'SELECT * FROM sales_orders WHERE id = ?',
      [req.params.id]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // Get items
    const [items] = await pool.query(
      `SELECT soi.*, pv.sku, p.default_image
       FROM sales_order_items soi
       JOIN product_variants pv ON soi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE soi.sales_order_id = ?`,
      [req.params.id]
    );

    // Get payments
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE sales_order_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );

    // Get invoices
    const [invoices] = await pool.query(
      'SELECT * FROM invoices WHERE sales_order_id = ?',
      [req.params.id]
    );

    res.json(formatResponse({
      ...orders[0],
      items,
      payments,
      invoices
    }));
  } catch (error) {
    next(error);
  }
});

// Create sales order (from enquiry or direct)
router.post('/', authenticate, authorize('super_admin', 'admin', 'sales_clerk'), [
  body('customer_name').notEmpty().trim(),
  body('items').isArray({ min: 1 })
], async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      customer_id, customer_name, customer_phone, customer_email, items,
      shipping_address, shipping_city, shipping_state, shipping_pincode,
      notes, source, enquiry_id
    } = req.body;

    const order_number = generateOrderNumber();

    // Try to find customer_id if not provided but phone is given
    let finalCustomerId = customer_id || null;
    if (!finalCustomerId && customer_phone) {
      const [existingCustomer] = await connection.query(
        'SELECT id FROM customers WHERE phone = ? LIMIT 1',
        [customer_phone]
      );
      if (existingCustomer.length > 0) {
        finalCustomerId = existingCustomer[0].id;
      }
    }

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;

    for (const item of items) {
      const lineSubtotal = item.quantity * item.unit_price;
      const discount = lineSubtotal * (item.discount_percent || 0) / 100;
      const lineTax = (lineSubtotal - discount) * (item.tax_percent || 0) / 100;
      subtotal += lineSubtotal - discount;
      tax_amount += lineTax;
    }

    const total_amount = subtotal + tax_amount;

    // Create order
    const [result] = await connection.query(
      `INSERT INTO sales_orders
       (order_number, customer_id, customer_name, customer_phone, customer_email, status,
        subtotal, tax_amount, total_amount, shipping_address, shipping_city,
        shipping_state, shipping_pincode, notes, source, assigned_to)
       VALUES (?, ?, ?, ?, ?, 'confirmed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [order_number, finalCustomerId, customer_name, customer_phone, customer_email,
       subtotal, tax_amount, total_amount, shipping_address, shipping_city,
       shipping_state, shipping_pincode, notes, source || 'phone', req.user.id]
    );

    // Create order items
    for (const item of items) {
      // Get product and variant info
      const [variantInfo] = await connection.query(
        `SELECT pv.variant_name, p.name as product_name
         FROM product_variants pv
         JOIN products p ON pv.product_id = p.id
         WHERE pv.id = ?`,
        [item.variant_id]
      );

      const lineSubtotal = item.quantity * item.unit_price;
      const discount = lineSubtotal * (item.discount_percent || 0) / 100;
      const lineTax = (lineSubtotal - discount) * (item.tax_percent || 0) / 100;
      const lineTotal = lineSubtotal - discount + lineTax;

      await connection.query(
        `INSERT INTO sales_order_items
         (sales_order_id, variant_id, product_name, variant_name, quantity, unit_price, tax_percent, discount_percent, total_line)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [result.insertId, item.variant_id,
         variantInfo[0]?.product_name, variantInfo[0]?.variant_name,
         item.quantity, item.unit_price, item.tax_percent || 0, item.discount_percent || 0, lineTotal]
      );
    }

    // Update enquiry status if created from enquiry
    if (enquiry_id) {
      await connection.query(
        'UPDATE enquiries SET status = "converted" WHERE id = ?',
        [enquiry_id]
      );
    }

    await connection.commit();

    // Fetch created order
    const [newOrder] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [result.insertId]);
    const [orderItems] = await pool.query('SELECT * FROM sales_order_items WHERE sales_order_id = ?', [result.insertId]);

    res.status(201).json(formatResponse({
      ...newOrder[0],
      items: orderItems
    }));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Update sales order status
router.put('/:id/status', authenticate, authorize('super_admin', 'admin', 'sales_clerk'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { status } = req.body;

    const [order] = await connection.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
    if (!order.length) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    // If shipping, deduct stock
    if (status === 'shipped' && order[0].status !== 'shipped') {
      const [items] = await connection.query(
        'SELECT * FROM sales_order_items WHERE sales_order_id = ?',
        [id]
      );

      const [locations] = await connection.query(
        'SELECT id FROM stock_locations WHERE is_default = true LIMIT 1'
      );
      const locationId = locations.length ? locations[0].id : null;

      for (const item of items) {
        // Create stock movement (negative)
        await connection.query(
          `INSERT INTO stock_movements
           (variant_id, location_id, change_qty, reason, reference_type, reference_id, created_by)
           VALUES (?, ?, ?, 'sale', 'sales_order', ?, ?)`,
          [item.variant_id, locationId, -item.quantity, id, req.user.id]
        );

        // Update variant stock
        await connection.query(
          'UPDATE product_variants SET stock_qty = stock_qty - ? WHERE id = ?',
          [item.quantity, item.variant_id]
        );
      }
    }

    await connection.query('UPDATE sales_orders SET status = ? WHERE id = ?', [status, id]);
    await connection.commit();

    const [updated] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Update sales order
router.put('/:id', authenticate, authorize('super_admin', 'admin', 'sales_clerk'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      customer_name, customer_phone, customer_email,
      shipping_address, shipping_city, shipping_state, shipping_pincode,
      notes, internal_notes
    } = req.body;

    await pool.query(
      `UPDATE sales_orders SET
        customer_name = COALESCE(?, customer_name),
        customer_phone = COALESCE(?, customer_phone),
        customer_email = COALESCE(?, customer_email),
        shipping_address = COALESCE(?, shipping_address),
        shipping_city = COALESCE(?, shipping_city),
        shipping_state = COALESCE(?, shipping_state),
        shipping_pincode = COALESCE(?, shipping_pincode),
        notes = COALESCE(?, notes),
        internal_notes = COALESCE(?, internal_notes)
       WHERE id = ?`,
      [customer_name, customer_phone, customer_email, shipping_address,
       shipping_city, shipping_state, shipping_pincode, notes, internal_notes, id]
    );

    const [updated] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
