const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate } = require('../utils/helpers');

// Get stock overview
router.get('/stock', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, low_stock, category_id, q } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT pv.*, p.name as product_name, p.sku as product_sku, c.name as category_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pv.track_stock = true AND pv.is_active = true AND p.is_active = true
    `;
    let countQuery = `
      SELECT COUNT(*) as total
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.track_stock = true AND pv.is_active = true AND p.is_active = true
    `;
    const params = [];
    const countParams = [];

    if (low_stock === 'true') {
      query += ' AND pv.stock_qty <= pv.low_stock_threshold';
      countQuery += ' AND pv.stock_qty <= pv.low_stock_threshold';
    }

    if (category_id) {
      query += ' AND p.category_id = ?';
      countQuery += ' AND p.category_id = ?';
      params.push(category_id);
      countParams.push(category_id);
    }

    if (q) {
      query += ' AND (p.name LIKE ? OR pv.sku LIKE ? OR pv.variant_name LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR pv.sku LIKE ? OR pv.variant_name LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY pv.stock_qty ASC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [stock] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);

    res.json(formatResponse(stock, {
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

// Get stock movements
router.get('/movements', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, variant_id, reason, from_date, to_date } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT sm.*, pv.sku, pv.variant_name, p.name as product_name, u.name as created_by_name
      FROM stock_movements sm
      JOIN product_variants pv ON sm.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN users u ON sm.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (variant_id) {
      query += ' AND sm.variant_id = ?';
      params.push(variant_id);
    }

    if (reason) {
      query += ' AND sm.reason = ?';
      params.push(reason);
    }

    if (from_date) {
      query += ' AND DATE(sm.created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(sm.created_at) <= ?';
      params.push(to_date);
    }

    query += ' ORDER BY sm.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [movements] = await pool.query(query, params);

    res.json(formatResponse(movements));
  } catch (error) {
    next(error);
  }
});

// Create stock adjustment
router.post('/adjustments', authenticate, authorize('super_admin', 'admin', 'inventory_manager'), [
  body('variant_id').isInt(),
  body('new_qty').isNumeric(),
  body('reason').notEmpty()
], async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { variant_id, new_qty, reason, notes } = req.body;

    // Get current stock
    const [variant] = await connection.query(
      'SELECT stock_qty FROM product_variants WHERE id = ?',
      [variant_id]
    );

    if (!variant.length) {
      return res.status(404).json({ success: false, message: 'Variant not found' });
    }

    const old_qty = parseFloat(variant[0].stock_qty);
    const change_qty = parseFloat(new_qty) - old_qty;

    // Get default location
    const [locations] = await connection.query(
      'SELECT id FROM stock_locations WHERE is_default = true LIMIT 1'
    );
    const locationId = locations.length ? locations[0].id : null;

    // Create stock movement
    await connection.query(
      `INSERT INTO stock_movements
       (variant_id, location_id, change_qty, reason, notes, created_by)
       VALUES (?, ?, ?, 'adjustment', ?, ?)`,
      [variant_id, locationId, change_qty, `${reason}: ${notes || ''}`, req.user.id]
    );

    // Update variant stock
    await connection.query(
      'UPDATE product_variants SET stock_qty = ? WHERE id = ?',
      [new_qty, variant_id]
    );

    // Log audit
    await connection.query(
      `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values)
       VALUES (?, 'stock_adjustment', 'product_variant', ?, ?, ?)`,
      [req.user.id, variant_id, JSON.stringify({ stock_qty: old_qty }), JSON.stringify({ stock_qty: new_qty, reason })]
    );

    await connection.commit();

    res.json(formatResponse({
      variant_id,
      old_qty,
      new_qty,
      change_qty,
      reason
    }));
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Get low stock alerts
router.get('/alerts/low-stock', authenticate, async (req, res, next) => {
  try {
    const [alerts] = await pool.query(`
      SELECT pv.*, p.name as product_name, p.sku as product_sku, c.name as category_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pv.track_stock = true
        AND pv.stock_qty <= pv.low_stock_threshold
        AND pv.is_active = true
        AND p.is_active = true
      ORDER BY pv.stock_qty ASC
      LIMIT 50
    `);

    res.json(formatResponse(alerts));
  } catch (error) {
    next(error);
  }
});

// Get stock valuation
router.get('/valuation', authenticate, async (req, res, next) => {
  try {
    const [valuation] = await pool.query(`
      SELECT
        SUM(pv.stock_qty * pv.buy_price) as total_cost_value,
        SUM(pv.stock_qty * pv.sell_price) as total_retail_value,
        SUM(pv.stock_qty) as total_units,
        COUNT(DISTINCT pv.id) as total_variants
      FROM product_variants pv
      WHERE pv.track_stock = true AND pv.is_active = true
    `);

    const [byCategory] = await pool.query(`
      SELECT
        c.id, c.name,
        SUM(pv.stock_qty * pv.buy_price) as cost_value,
        SUM(pv.stock_qty * pv.sell_price) as retail_value,
        SUM(pv.stock_qty) as units
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pv.track_stock = true AND pv.is_active = true
      GROUP BY c.id, c.name
      ORDER BY cost_value DESC
    `);

    res.json(formatResponse({
      summary: valuation[0],
      by_category: byCategory
    }));
  } catch (error) {
    next(error);
  }
});

// Get stock locations
router.get('/locations', authenticate, async (req, res, next) => {
  try {
    const [locations] = await pool.query('SELECT * FROM stock_locations ORDER BY is_default DESC, name ASC');
    res.json(formatResponse(locations));
  } catch (error) {
    next(error);
  }
});

// Create stock location
router.post('/locations', authenticate, authorize('super_admin', 'admin'), [
  body('name').notEmpty().trim()
], async (req, res, next) => {
  try {
    const { name, address, is_default } = req.body;

    // If setting as default, unset other defaults
    if (is_default) {
      await pool.query('UPDATE stock_locations SET is_default = false');
    }

    const [result] = await pool.query(
      'INSERT INTO stock_locations (name, address, is_default) VALUES (?, ?, ?)',
      [name, address, is_default || false]
    );

    const [newLocation] = await pool.query('SELECT * FROM stock_locations WHERE id = ?', [result.insertId]);
    res.status(201).json(formatResponse(newLocation[0]));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
