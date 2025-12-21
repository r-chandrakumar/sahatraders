const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate } = require('../utils/helpers');

// Create enquiry (public)
router.post('/', [
  body('name').notEmpty().trim(),
  body('phone').notEmpty().trim(),
], async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, phone, type, product_id, variant_id, message, address, items, estimated_total } = req.body;

    await connection.beginTransaction();

    // Insert enquiry
    const [result] = await connection.query(
      `INSERT INTO enquiries (name, email, phone, type, product_id, variant_id, message, address, estimated_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        name,
        email || null,
        phone,
        type || 'general',
        product_id || null,
        variant_id || null,
        message || '',
        address || null,
        estimated_total || 0
      ]
    );

    const enquiryId = result.insertId;

    // Insert enquiry items if provided
    if (items && items.length > 0) {
      for (const item of items) {
        await connection.query(
          `INSERT INTO enquiry_items (enquiry_id, variant_id, quantity, unit_price)
           VALUES (?, ?, ?, ?)`,
          [enquiryId, item.variant_id, item.quantity, item.unit_price || null]
        );
      }
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Enquiry submitted successfully. We will get back to you soon.',
      data: { id: enquiryId }
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
});

// Get all enquiries (admin)
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, type, assigned_to } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT e.*, p.name as product_name, pv.variant_name, u.name as assigned_to_name,
             (SELECT COUNT(*) FROM enquiry_items WHERE enquiry_id = e.id) as items_count
      FROM enquiries e
      LEFT JOIN products p ON e.product_id = p.id
      LEFT JOIN product_variants pv ON e.variant_id = pv.id
      LEFT JOIN users u ON e.assigned_to = u.id
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM enquiries WHERE 1=1';
    const params = [];
    const countParams = [];

    if (status) {
      query += ' AND e.status = ?';
      countQuery += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (type) {
      query += ' AND e.type = ?';
      countQuery += ' AND type = ?';
      params.push(type);
      countParams.push(type);
    }

    if (assigned_to) {
      query += ' AND e.assigned_to = ?';
      countQuery += ' AND assigned_to = ?';
      params.push(assigned_to);
      countParams.push(assigned_to);
    }

    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [enquiries] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);

    res.json(formatResponse(enquiries, {
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

// Get enquiry by ID (admin)
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [enquiries] = await pool.query(
      `SELECT e.*, p.name as product_name, pv.variant_name, u.name as assigned_to_name
       FROM enquiries e
       LEFT JOIN products p ON e.product_id = p.id
       LEFT JOIN product_variants pv ON e.variant_id = pv.id
       LEFT JOIN users u ON e.assigned_to = u.id
       WHERE e.id = ?`,
      [req.params.id]
    );

    if (!enquiries.length) {
      return res.status(404).json({ success: false, message: 'Enquiry not found' });
    }

    // Fetch enquiry items
    const [items] = await pool.query(
      `SELECT ei.*, pv.variant_name, pv.sku, p.name as product_name, p.default_image
       FROM enquiry_items ei
       JOIN product_variants pv ON ei.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE ei.enquiry_id = ?`,
      [req.params.id]
    );

    const enquiry = enquiries[0];
    enquiry.items = items;

    res.json(formatResponse(enquiry));
  } catch (error) {
    next(error);
  }
});

// Update enquiry (admin)
router.put('/:id', authenticate, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, assigned_to, internal_notes } = req.body;

    await pool.query(
      `UPDATE enquiries SET
        status = COALESCE(?, status),
        assigned_to = ?,
        internal_notes = COALESCE(?, internal_notes)
       WHERE id = ?`,
      [status, assigned_to, internal_notes, id]
    );

    const [updated] = await pool.query('SELECT * FROM enquiries WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Delete enquiry (admin)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM enquiries WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Enquiry deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get enquiry stats (admin)
router.get('/stats/summary', authenticate, async (req, res, next) => {
  try {
    const [stats] = await pool.query(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
        SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) as responded_count,
        SUM(CASE WHEN status = 'converted' THEN 1 ELSE 0 END) as converted_count,
        SUM(CASE WHEN type = 'product' THEN 1 ELSE 0 END) as product_enquiries,
        SUM(CASE WHEN type = 'order' THEN 1 ELSE 0 END) as order_enquiries,
        SUM(CASE WHEN type = 'general' THEN 1 ELSE 0 END) as general_enquiries
      FROM enquiries
    `);

    res.json(formatResponse(stats[0]));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
