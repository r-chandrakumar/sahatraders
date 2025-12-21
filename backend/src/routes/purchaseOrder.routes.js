const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate, generatePONumber } = require('../utils/helpers');

// Get all purchase orders
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, supplier_id } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT po.*, s.name as supplier_name
      FROM purchase_orders po
      JOIN suppliers s ON po.supplier_id = s.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM purchase_orders WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND po.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (supplier_id) {
      query += ' AND po.supplier_id = ?';
      countQuery += ' AND supplier_id = ?';
      params.push(supplier_id);
      countParams.push(supplier_id);
    }

    query += ' ORDER BY po.created_at DESC LIMIT ? OFFSET ?';
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

// Get purchase order by ID
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [orders] = await pool.query(
      `SELECT po.*, s.name as supplier_name, s.email as supplier_email, s.phone as supplier_phone
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = ?`,
      [req.params.id]
    );

    if (!orders.length) {
      return res.status(404).json({ success: false, message: 'Purchase order not found' });
    }

    // Get items
    const [items] = await pool.query(
      `SELECT poi.*, pv.sku, pv.variant_name, p.name as product_name
       FROM purchase_order_items poi
       JOIN product_variants pv ON poi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE poi.po_id = ?`,
      [req.params.id]
    );

    res.json(formatResponse({
      ...orders[0],
      items
    }));
  } catch (error) {
    next(error);
  }
});

// Create purchase order
router.post('/', authenticate, authorize('super_admin', 'admin', 'inventory_manager'), [
  body('supplier_id').isInt(),
  body('items').isArray({ min: 1 })
], async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { supplier_id, items, expected_date, notes } = req.body;
    const po_number = generatePONumber();

    // Calculate totals
    let subtotal = 0;
    let tax_amount = 0;

    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price;
      const lineTax = lineTotal * (item.tax_percent || 0) / 100;
      subtotal += lineTotal;
      tax_amount += lineTax;
    }

    const total_amount = subtotal + tax_amount;

    // Create PO
    const [result] = await connection.query(
      `INSERT INTO purchase_orders
       (po_number, supplier_id, status, subtotal, tax_amount, total_amount, expected_date, notes, created_by)
       VALUES (?, ?, 'draft', ?, ?, ?, ?, ?, ?)`,
      [po_number, supplier_id, subtotal, tax_amount, total_amount, expected_date, notes, req.user.id]
    );

    // Create PO items
    for (const item of items) {
      const lineTotal = item.quantity * item.unit_price * (1 + (item.tax_percent || 0) / 100);
      await connection.query(
        `INSERT INTO purchase_order_items (po_id, variant_id, quantity, unit_price, tax_percent, total_line)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [result.insertId, item.variant_id, item.quantity, item.unit_price, item.tax_percent || 0, lineTotal]
      );
    }

    await connection.commit();

    // Fetch created PO
    const [newPO] = await pool.query(
      `SELECT po.*, s.name as supplier_name
       FROM purchase_orders po
       JOIN suppliers s ON po.supplier_id = s.id
       WHERE po.id = ?`,
      [result.insertId]
    );

    const [poItems] = await pool.query('SELECT * FROM purchase_order_items WHERE po_id = ?', [result.insertId]);

    res.status(201).json(formatResponse({
      ...newPO[0],
      items: poItems
    }));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Update purchase order status
router.put('/:id/status', authenticate, authorize('super_admin', 'admin', 'inventory_manager'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    await pool.query('UPDATE purchase_orders SET status = ? WHERE id = ?', [status, id]);

    const [updated] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Receive purchase order items
router.put('/:id/receive', authenticate, authorize('super_admin', 'admin', 'inventory_manager'), async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const { id } = req.params;
    const { items } = req.body; // [{ item_id, received_qty }]

    // Get default location
    const [locations] = await connection.query(
      'SELECT id FROM stock_locations WHERE is_default = true LIMIT 1'
    );
    const locationId = locations.length ? locations[0].id : null;

    let allReceived = true;

    for (const item of items) {
      // Get current item data
      const [currentItem] = await connection.query(
        'SELECT * FROM purchase_order_items WHERE id = ?',
        [item.item_id]
      );

      if (!currentItem.length) continue;

      const newReceivedQty = parseFloat(currentItem[0].received_qty) + parseFloat(item.received_qty);

      // Update received qty
      await connection.query(
        'UPDATE purchase_order_items SET received_qty = ? WHERE id = ?',
        [newReceivedQty, item.item_id]
      );

      // Create stock movement
      await connection.query(
        `INSERT INTO stock_movements
         (variant_id, location_id, change_qty, reason, reference_type, reference_id, cost_price, created_by)
         VALUES (?, ?, ?, 'purchase_receipt', 'purchase_order', ?, ?, ?)`,
        [currentItem[0].variant_id, locationId, item.received_qty, id, currentItem[0].unit_price, req.user.id]
      );

      // Update variant stock
      await connection.query(
        'UPDATE product_variants SET stock_qty = stock_qty + ? WHERE id = ?',
        [item.received_qty, currentItem[0].variant_id]
      );

      if (newReceivedQty < currentItem[0].quantity) {
        allReceived = false;
      }
    }

    // Update PO status
    const newStatus = allReceived ? 'received' : 'partial';
    await connection.query(
      'UPDATE purchase_orders SET status = ?, received_date = CURDATE() WHERE id = ?',
      [newStatus, id]
    );

    await connection.commit();

    // Fetch updated PO
    const [updatedPO] = await pool.query('SELECT * FROM purchase_orders WHERE id = ?', [id]);
    const [poItems] = await pool.query(
      `SELECT poi.*, pv.sku, pv.variant_name, p.name as product_name
       FROM purchase_order_items poi
       JOIN product_variants pv ON poi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE poi.po_id = ?`,
      [id]
    );

    res.json(formatResponse({
      ...updatedPO[0],
      items: poItems
    }));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Delete purchase order (only draft)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const [po] = await pool.query('SELECT status FROM purchase_orders WHERE id = ?', [id]);
    if (po[0]?.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete draft purchase orders'
      });
    }

    await pool.query('DELETE FROM purchase_orders WHERE id = ?', [id]);
    res.json({ success: true, message: 'Purchase order deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
