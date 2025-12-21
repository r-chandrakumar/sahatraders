const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Get all coupons (admin)
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = 'SELECT * FROM coupons WHERE 1=1';
    const params = [];

    if (status === 'active') {
      query += ' AND is_active = 1 AND (end_date IS NULL OR end_date >= NOW())';
    } else if (status === 'expired') {
      query += ' AND (is_active = 0 OR end_date < NOW())';
    }

    // Get total
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [coupons] = await db.query(query, params);

    res.json({
      coupons,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get coupons error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single coupon
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const [coupons] = await db.query('SELECT * FROM coupons WHERE id = ?', [req.params.id]);

    if (coupons.length === 0) {
      return res.status(404).json({ message: 'Coupon not found' });
    }

    res.json(coupons[0]);
  } catch (error) {
    console.error('Get coupon error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create coupon
router.post('/',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  [
    body('code').notEmpty().withMessage('Code is required'),
    body('discount_type').isIn(['percentage', 'fixed']).withMessage('Invalid discount type'),
    body('discount_value').isNumeric().withMessage('Discount value must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const {
        code,
        description,
        discount_type,
        discount_value,
        min_order_amount,
        max_discount,
        usage_limit,
        start_date,
        end_date,
        is_active = true
      } = req.body;

      // Check if code exists
      const [existing] = await db.query('SELECT id FROM coupons WHERE code = ?', [code.toUpperCase()]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Coupon code already exists' });
      }

      const [result] = await db.query(`
        INSERT INTO coupons (
          code, description, discount_type, discount_value, min_order_amount,
          max_discount, usage_limit, start_date, end_date, is_active, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        code.toUpperCase(), description, discount_type, discount_value,
        min_order_amount, max_discount, usage_limit, start_date, end_date,
        is_active ? 1 : 0, req.user.id
      ]);

      res.status(201).json({
        message: 'Coupon created',
        id: result.insertId
      });
    } catch (error) {
      console.error('Create coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update coupon
router.put('/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      const {
        code,
        description,
        discount_type,
        discount_value,
        min_order_amount,
        max_discount,
        usage_limit,
        start_date,
        end_date,
        is_active
      } = req.body;

      // Check if code exists for other coupon
      if (code) {
        const [existing] = await db.query(
          'SELECT id FROM coupons WHERE code = ? AND id != ?',
          [code.toUpperCase(), req.params.id]
        );
        if (existing.length > 0) {
          return res.status(400).json({ message: 'Coupon code already exists' });
        }
      }

      await db.query(`
        UPDATE coupons SET
          code = COALESCE(?, code),
          description = COALESCE(?, description),
          discount_type = COALESCE(?, discount_type),
          discount_value = COALESCE(?, discount_value),
          min_order_amount = ?,
          max_discount = ?,
          usage_limit = ?,
          start_date = ?,
          end_date = ?,
          is_active = COALESCE(?, is_active)
        WHERE id = ?
      `, [
        code?.toUpperCase(), description, discount_type, discount_value,
        min_order_amount, max_discount, usage_limit, start_date, end_date,
        is_active, req.params.id
      ]);

      res.json({ message: 'Coupon updated' });
    } catch (error) {
      console.error('Update coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete coupon
router.delete('/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      await db.query('DELETE FROM coupons WHERE id = ?', [req.params.id]);
      res.json({ message: 'Coupon deleted' });
    } catch (error) {
      console.error('Delete coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Toggle coupon status
router.put('/:id/toggle',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      await db.query('UPDATE coupons SET is_active = NOT is_active WHERE id = ?', [req.params.id]);
      res.json({ message: 'Coupon status toggled' });
    } catch (error) {
      console.error('Toggle coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Validate coupon (public)
router.post('/validate',
  [
    body('code').notEmpty().withMessage('Coupon code is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { code, cart_total } = req.body;

      const [coupons] = await db.query(`
        SELECT * FROM coupons
        WHERE code = ? AND is_active = 1
          AND (start_date IS NULL OR start_date <= NOW())
          AND (end_date IS NULL OR end_date >= NOW())
          AND (usage_limit IS NULL OR usage_count < usage_limit)
      `, [code.toUpperCase()]);

      if (coupons.length === 0) {
        return res.status(400).json({
          valid: false,
          message: 'Invalid or expired coupon'
        });
      }

      const coupon = coupons[0];

      // Check minimum order
      if (cart_total && coupon.min_order_amount && cart_total < coupon.min_order_amount) {
        return res.status(400).json({
          valid: false,
          message: `Minimum order amount is ₹${coupon.min_order_amount}`
        });
      }

      // Calculate discount
      let discount = 0;
      if (cart_total) {
        if (coupon.discount_type === 'percentage') {
          discount = (cart_total * coupon.discount_value) / 100;
          if (coupon.max_discount && discount > coupon.max_discount) {
            discount = coupon.max_discount;
          }
        } else {
          discount = coupon.discount_value;
        }
      }

      res.json({
        valid: true,
        coupon: {
          code: coupon.code,
          description: coupon.description,
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          max_discount: coupon.max_discount,
          min_order_amount: coupon.min_order_amount
        },
        discount_amount: discount
      });
    } catch (error) {
      console.error('Validate coupon error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get coupon usage report
router.get('/:id/usage',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      const [coupon] = await db.query('SELECT * FROM coupons WHERE id = ?', [req.params.id]);

      if (coupon.length === 0) {
        return res.status(404).json({ message: 'Coupon not found' });
      }

      // Get orders that used this coupon
      const [orders] = await db.query(`
        SELECT so.id, so.order_number, so.customer_name, so.total_amount, so.discount_amount, so.created_at
        FROM sales_orders so
        WHERE so.coupon_id = ?
        ORDER BY so.created_at DESC
        LIMIT 50
      `, [req.params.id]);

      res.json({
        coupon: coupon[0],
        usage: {
          count: coupon[0].usage_count,
          limit: coupon[0].usage_limit,
          orders
        }
      });
    } catch (error) {
      console.error('Get coupon usage error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
