const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate } = require('../utils/helpers');

// Get all users (super admin only)
router.get('/', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, role, active_only } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = 'SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM users WHERE 1=1';
    const params = [];
    const countParams = [];

    if (role) {
      query += ' AND role = ?';
      countQuery += ' AND role = ?';
      params.push(role);
      countParams.push(role);
    }

    if (active_only === 'true') {
      query += ' AND is_active = true';
      countQuery += ' AND is_active = true';
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [users] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);

    res.json(formatResponse(users, {
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

// Get user by ID
router.get('/:id', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const [users] = await pool.query(
      'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = ?',
      [req.params.id]
    );

    if (!users.length) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json(formatResponse(users[0]));
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', authenticate, authorize('super_admin'), [
  body('name').notEmpty().trim(),
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('role').isIn(['super_admin', 'admin', 'inventory_manager', 'sales_clerk'])
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, role, phone } = req.body;

    // Check if email exists
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Email already in use' });
    }

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash, role, phone) VALUES (?, ?, ?, ?, ?)',
      [name, email, password_hash, role, phone]
    );

    const [newUser] = await pool.query(
      'SELECT id, name, email, role, phone, is_active, created_at FROM users WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json(formatResponse(newUser[0]));
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, phone, is_active, password } = req.body;

    // Check if email exists for other user
    if (email) {
      const [existing] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, id]);
      if (existing.length) {
        return res.status(400).json({ success: false, message: 'Email already in use' });
      }
    }

    let query = `UPDATE users SET
      name = COALESCE(?, name),
      email = COALESCE(?, email),
      role = COALESCE(?, role),
      phone = COALESCE(?, phone),
      is_active = COALESCE(?, is_active)`;

    const params = [name, email, role, phone, is_active];

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      query += ', password_hash = ?';
      params.push(password_hash);
    }

    query += ' WHERE id = ?';
    params.push(id);

    await pool.query(query, params);

    const [updated] = await pool.query(
      'SELECT id, name, email, role, phone, is_active, created_at, updated_at FROM users WHERE id = ?',
      [id]
    );

    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', authenticate, authorize('super_admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Prevent deleting self
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot delete your own account' });
    }

    await pool.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get roles
router.get('/meta/roles', authenticate, (req, res) => {
  res.json(formatResponse([
    { value: 'super_admin', label: 'Super Admin', description: 'Full system access' },
    { value: 'admin', label: 'Admin', description: 'Manage products, orders, invoices' },
    { value: 'inventory_manager', label: 'Inventory Manager', description: 'Manage stock and POs' },
    { value: 'sales_clerk', label: 'Sales Clerk', description: 'Process orders and payments' }
  ]));
});

module.exports = router;
