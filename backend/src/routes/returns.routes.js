const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Get return statistics - MUST be before /:id route
router.get('/stats/summary', authenticate, async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as processed,
        SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN refund_amount ELSE 0 END), 0) as total_refunded
      FROM returns
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    res.json(stats[0]);
  } catch (error) {
    console.error('Get return stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all returns
router.get('/', authenticate, async (req, res) => {
  try {
    const { status, type, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT r.*, so.order_number, so.customer_name, so.customer_phone,
             u.name as processed_by_name
      FROM returns r
      LEFT JOIN sales_orders so ON r.sales_order_id = so.id
      LEFT JOIN users u ON r.processed_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }

    if (type) {
      query += ' AND r.type = ?';
      params.push(type);
    }

    if (search) {
      query += ' AND (r.return_number LIKE ? OR so.order_number LIKE ? OR so.customer_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Get total count
    const countQuery = query.replace('SELECT r.*, so.order_number, so.customer_name, so.customer_phone, u.name as processed_by_name', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult?.[0]?.total || 0;

    // Get paginated results
    query += ' ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [returns] = await db.query(query, params);

    // Get items for each return
    for (let ret of returns) {
      const [items] = await db.query(`
        SELECT ri.*, pv.sku, p.name as product_name, pv.variant_name
        FROM return_items ri
        LEFT JOIN product_variants pv ON ri.variant_id = pv.id
        LEFT JOIN products p ON pv.product_id = p.id
        WHERE ri.return_id = ?
      `, [ret.id]);
      ret.items = items;
    }

    res.json({
      returns,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get returns error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single return
router.get('/:id', authenticate, async (req, res) => {
  try {
    const [returns] = await db.query(`
      SELECT r.*, so.order_number, so.customer_name, so.customer_phone, so.customer_email,
             u.name as processed_by_name
      FROM returns r
      LEFT JOIN sales_orders so ON r.sales_order_id = so.id
      LEFT JOIN users u ON r.processed_by = u.id
      WHERE r.id = ?
    `, [req.params.id]);

    if (returns.length === 0) {
      return res.status(404).json({ message: 'Return not found' });
    }

    const returnData = returns[0];

    // Get items
    const [items] = await db.query(`
      SELECT ri.*, pv.sku, p.name as product_name, pv.variant_name
      FROM return_items ri
      LEFT JOIN product_variants pv ON ri.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE ri.return_id = ?
    `, [req.params.id]);

    returnData.items = items;

    res.json(returnData);
  } catch (error) {
    console.error('Get return error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create return request
router.post('/',
  authenticate,
  [
    body('sales_order_id').notEmpty().withMessage('Order is required'),
    body('type').isIn(['return', 'credit_note']).withMessage('Invalid type'),
    body('reason').notEmpty().withMessage('Reason is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { sales_order_id, type, reason, items, notes } = req.body;

      // Verify order exists
      const [orders] = await connection.query(
        'SELECT * FROM sales_orders WHERE id = ?',
        [sales_order_id]
      );

      if (orders.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Order not found' });
      }

      // Generate return number
      const year = new Date().getFullYear();
      const month = String(new Date().getMonth() + 1).padStart(2, '0');
      const [lastReturn] = await connection.query(
        'SELECT return_number FROM returns ORDER BY id DESC LIMIT 1'
      );

      let sequence = 1;
      if (lastReturn.length > 0) {
        const lastNum = parseInt(lastReturn[0].return_number.split('-').pop());
        sequence = lastNum + 1;
      }
      const return_number = `RET-${year}${month}-${String(sequence).padStart(4, '0')}`;

      // Calculate total amount
      let total_amount = 0;
      for (const item of items) {
        total_amount += item.quantity * item.unit_price;
      }

      // Create return
      const [result] = await connection.query(`
        INSERT INTO returns (return_number, sales_order_id, type, status, reason, notes, total_amount, created_by)
        VALUES (?, ?, ?, 'pending', ?, ?, ?, ?)
      `, [return_number, sales_order_id, type, reason, notes, total_amount, req.user.id]);

      const returnId = result.insertId;

      // Insert items
      for (const item of items) {
        await connection.query(`
          INSERT INTO return_items (return_id, variant_id, quantity, unit_price, refund_amount, reason)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [returnId, item.variant_id, item.quantity, item.unit_price, item.quantity * item.unit_price, item.reason || reason]);
      }

      await connection.commit();

      res.status(201).json({
        message: 'Return request created',
        return_id: returnId,
        return_number
      });
    } catch (error) {
      await connection.rollback();
      console.error('Create return error:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      connection.release();
    }
  }
);

// Approve return
router.put('/:id/approve',
  authenticate,
  authorize('super_admin', 'admin'),
  async (req, res) => {
    try {
      const [returns] = await db.query('SELECT * FROM returns WHERE id = ?', [req.params.id]);

      if (returns.length === 0) {
        return res.status(404).json({ message: 'Return not found' });
      }

      if (returns[0].status !== 'pending') {
        return res.status(400).json({ message: 'Return is not pending' });
      }

      await db.query(`
        UPDATE returns SET status = 'approved', processed_by = ?, processed_at = NOW()
        WHERE id = ?
      `, [req.user.id, req.params.id]);

      res.json({ message: 'Return approved' });
    } catch (error) {
      console.error('Approve return error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Reject return
router.put('/:id/reject',
  authenticate,
  authorize('super_admin', 'admin'),
  [
    body('rejection_reason').notEmpty().withMessage('Rejection reason is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const [returns] = await db.query('SELECT * FROM returns WHERE id = ?', [req.params.id]);

      if (returns.length === 0) {
        return res.status(404).json({ message: 'Return not found' });
      }

      if (returns[0].status !== 'pending') {
        return res.status(400).json({ message: 'Return is not pending' });
      }

      await db.query(`
        UPDATE returns SET status = 'rejected', rejection_reason = ?, processed_by = ?, processed_at = NOW()
        WHERE id = ?
      `, [req.body.rejection_reason, req.user.id, req.params.id]);

      res.json({ message: 'Return rejected' });
    } catch (error) {
      console.error('Reject return error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Process return (complete and update stock)
router.put('/:id/process',
  authenticate,
  authorize('super_admin', 'admin', 'inventory_manager'),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [returns] = await connection.query('SELECT * FROM returns WHERE id = ?', [req.params.id]);

      if (returns.length === 0) {
        await connection.rollback();
        return res.status(404).json({ message: 'Return not found' });
      }

      if (returns[0].status !== 'approved') {
        await connection.rollback();
        return res.status(400).json({ message: 'Return must be approved first' });
      }

      // Get return items
      const [items] = await connection.query(
        'SELECT * FROM return_items WHERE return_id = ?',
        [req.params.id]
      );

      // Update stock for each item (add back to inventory)
      for (const item of items) {
        // Update variant stock
        await connection.query(`
          UPDATE product_variants SET stock_quantity = stock_quantity + ?
          WHERE id = ?
        `, [item.quantity, item.variant_id]);

        // Record stock movement
        await connection.query(`
          INSERT INTO stock_movements (variant_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
          VALUES (?, 'return', ?, 'return', ?, 'Stock returned from return #${returns[0].return_number}', ?)
        `, [item.variant_id, item.quantity, req.params.id, req.user.id]);
      }

      // Update return status
      await connection.query(`
        UPDATE returns SET status = 'processed', processed_by = ?, processed_at = NOW()
        WHERE id = ?
      `, [req.user.id, req.params.id]);

      await connection.commit();

      res.json({ message: 'Return processed and stock updated' });
    } catch (error) {
      await connection.rollback();
      console.error('Process return error:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      connection.release();
    }
  }
);

module.exports = router;
