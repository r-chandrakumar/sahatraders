const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Get all audit logs with filters
router.get('/', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, action, entity_type, user_id, start_date, end_date } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += ` AND al.action = ?`;
      params.push(action);
    }

    if (entity_type) {
      query += ` AND al.entity_type = ?`;
      params.push(entity_type);
    }

    if (user_id) {
      query += ` AND al.user_id = ?`;
      params.push(user_id);
    }

    if (start_date) {
      query += ` AND DATE(al.created_at) >= ?`;
      params.push(start_date);
    }

    if (end_date) {
      query += ` AND DATE(al.created_at) <= ?`;
      params.push(end_date);
    }

    // Get total count
    const [countResult] = await db.query(
      query.replace('SELECT al.*, u.name as user_name, u.email as user_email', 'SELECT COUNT(*) as total'),
      params
    );
    const total = countResult[0].total;

    // Get paginated results
    query += ` ORDER BY al.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [logs] = await db.query(query, params);

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

// Get audit log by ID
router.get('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT al.*, u.name as user_name, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.id = ?
    `, [req.params.id]);

    if (logs.length === 0) {
      return res.status(404).json({ success: false, message: 'Audit log not found' });
    }

    res.json({ success: true, data: logs[0] });
  } catch (error) {
    console.error('Error fetching audit log:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch audit log' });
  }
});

module.exports = router;
