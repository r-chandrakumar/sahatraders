const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate, generateInvoiceNumber } = require('../utils/helpers');

// Get all invoices
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, from_date, to_date } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT i.*, so.order_number, so.customer_name
      FROM invoices i
      LEFT JOIN sales_orders so ON i.sales_order_id = so.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM invoices WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND i.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (from_date) {
      query += ' AND i.invoice_date >= ?';
      countQuery += ' AND invoice_date >= ?';
      params.push(from_date);
      countParams.push(from_date);
    }

    if (to_date) {
      query += ' AND i.invoice_date <= ?';
      countQuery += ' AND invoice_date <= ?';
      params.push(to_date);
      countParams.push(to_date);
    }

    query += ' ORDER BY i.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [invoices] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);

    res.json(formatResponse(invoices, {
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

// Get invoice by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [invoices] = await pool.query(
      `SELECT i.*, so.order_number, so.customer_name, so.customer_phone, so.customer_email,
        so.shipping_address, so.shipping_city, so.shipping_state, so.shipping_pincode
       FROM invoices i
       LEFT JOIN sales_orders so ON i.sales_order_id = so.id
       WHERE i.id = ?`,
      [req.params.id]
    );

    if (!invoices.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    // Get order items for invoice
    let items = [];
    if (invoices[0].sales_order_id) {
      const [orderItems] = await pool.query(
        `SELECT soi.*, pv.sku
         FROM sales_order_items soi
         JOIN product_variants pv ON soi.variant_id = pv.id
         WHERE soi.sales_order_id = ?`,
        [invoices[0].sales_order_id]
      );
      items = orderItems;
    }

    // Get payments
    const [payments] = await pool.query(
      'SELECT * FROM payments WHERE invoice_id = ? ORDER BY payment_date DESC',
      [req.params.id]
    );

    res.json(formatResponse({
      ...invoices[0],
      items,
      payments
    }));
  } catch (error) {
    next(error);
  }
});

// Create invoice from sales order
router.post('/', authenticate, authorize('super_admin', 'admin', 'sales_clerk'), [
  body('sales_order_id').isInt()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { sales_order_id, due_date, notes } = req.body;

    // Get order details
    const [orders] = await pool.query('SELECT * FROM sales_orders WHERE id = ?', [sales_order_id]);
    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Sales order not found' });
    }

    const order = orders[0];
    const invoice_number = generateInvoiceNumber();
    const invoice_date = new Date().toISOString().split('T')[0];

    const [result] = await pool.query(
      `INSERT INTO invoices
       (invoice_number, sales_order_id, invoice_date, due_date, subtotal, tax_amount, total_amount, status, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'issued', ?, ?)`,
      [invoice_number, sales_order_id, invoice_date, due_date, order.subtotal, order.tax_amount, order.total_amount, notes, req.user.id]
    );

    const [newInvoice] = await pool.query('SELECT * FROM invoices WHERE id = ?', [result.insertId]);

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'invoice', result.insertId, JSON.stringify(newInvoice[0])]
    );

    res.status(201).json(formatResponse(newInvoice[0]));
  } catch (error) {
    next(error);
  }
});

// Record payment against invoice
router.post('/:id/payments', authenticate, authorize('super_admin', 'admin', 'sales_clerk'), [
  body('amount').isNumeric(),
  body('payment_method').notEmpty(),
  body('payment_date').notEmpty()
], async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const { amount, payment_method, payment_date, reference, notes } = req.body;

    // Get invoice
    const [invoices] = await connection.query('SELECT * FROM invoices WHERE id = ?', [id]);
    if (!invoices.length) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const invoice = invoices[0];

    // Create payment
    const [result] = await connection.query(
      `INSERT INTO payments (invoice_id, sales_order_id, payment_date, amount, payment_method, reference, notes, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, invoice.sales_order_id, payment_date, amount, payment_method, reference, notes, req.user.id]
    );

    // Update invoice paid amount and status
    const newPaidAmount = parseFloat(invoice.paid_amount) + parseFloat(amount);
    let newStatus = invoice.status;

    if (newPaidAmount >= invoice.total_amount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }

    await connection.query(
      'UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?',
      [newPaidAmount, newStatus, id]
    );

    await connection.commit();

    const [newPayment] = await pool.query('SELECT * FROM payments WHERE id = ?', [result.insertId]);

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'payment', result.insertId, JSON.stringify(newPayment[0])]
    );

    res.status(201).json(formatResponse(newPayment[0]));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Get all payments
router.get('/payments/all', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, from_date, to_date } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT p.*, i.invoice_number, so.order_number, so.customer_name
      FROM payments p
      LEFT JOIN invoices i ON p.invoice_id = i.id
      LEFT JOIN sales_orders so ON p.sales_order_id = so.id
      WHERE 1=1
    `;
    const params = [];

    if (from_date) {
      query += ' AND p.payment_date >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND p.payment_date <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY p.payment_date DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [payments] = await pool.query(query, params);

    res.json(formatResponse(payments));
  } catch (error) {
    next(error);
  }
});

// Update invoice status
router.put('/:id/status', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query('UPDATE invoices SET status = ? WHERE id = ?', [status, id]);

    const [updated] = await pool.query('SELECT * FROM invoices WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
