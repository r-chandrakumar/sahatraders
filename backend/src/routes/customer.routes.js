const express = require('express');
const router = express.Router();
const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

// Middleware to authenticate customer
const authenticateCustomer = async (req, res, next) => {
  try {
    const token = req.cookies.customer_token || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [customers] = await db.query('SELECT * FROM customers WHERE id = ? AND is_active = 1', [decoded.id]);

    if (customers.length === 0) {
      return res.status(401).json({ message: 'Customer not found' });
    }

    req.customer = customers[0];
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Customer Registration
router.post('/register',
  [
    body('name').notEmpty().trim().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, email, phone, password, address } = req.body;

      // Check if email or phone already exists
      const [existing] = await db.query(
        'SELECT * FROM customers WHERE email = ? OR phone = ?',
        [email, phone]
      );

      if (existing.length > 0) {
        return res.status(400).json({
          message: existing[0].email === email ? 'Email already registered' : 'Phone already registered'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create customer
      const [result] = await db.query(`
        INSERT INTO customers (name, email, phone, password, address, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
      `, [name, email, phone, hashedPassword, address]);

      // Generate token
      const token = jwt.sign(
        { id: result.insertId, email, type: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.cookie('customer_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
      });

      res.status(201).json({
        message: 'Registration successful',
        customer: {
          id: result.insertId,
          name,
          email,
          phone
        },
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Customer Login
router.post('/login',
  [
    body('email').notEmpty().withMessage('Email or phone is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;

      // Find customer by email or phone
      const [customers] = await db.query(
        'SELECT * FROM customers WHERE (email = ? OR phone = ?) AND is_active = 1',
        [email, email]
      );

      if (customers.length === 0) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const customer = customers[0];

      // Check password
      const isMatch = await bcrypt.compare(password, customer.password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      // Update last login
      await db.query('UPDATE customers SET last_login = NOW() WHERE id = ?', [customer.id]);

      // Generate token
      const token = jwt.sign(
        { id: customer.id, email: customer.email, type: 'customer' },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );

      res.cookie('customer_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      res.json({
        message: 'Login successful',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          phone: customer.phone
        },
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Customer Logout
router.post('/logout', (req, res) => {
  res.clearCookie('customer_token');
  res.json({ message: 'Logged out successfully' });
});

// Get current customer
router.get('/me', authenticateCustomer, async (req, res) => {
  const { password, ...customer } = req.customer;
  res.json(customer);
});

// Update customer profile
router.put('/profile',
  authenticateCustomer,
  [
    body('name').optional().trim(),
    body('phone').optional(),
    body('address').optional(),
  ],
  async (req, res) => {
    try {
      const { name, phone, address } = req.body;

      // Check if phone is already used by another customer
      if (phone && phone !== req.customer.phone) {
        const [existing] = await db.query(
          'SELECT id FROM customers WHERE phone = ? AND id != ?',
          [phone, req.customer.id]
        );
        if (existing.length > 0) {
          return res.status(400).json({ message: 'Phone already in use' });
        }
      }

      await db.query(`
        UPDATE customers SET name = COALESCE(?, name), phone = COALESCE(?, phone), address = COALESCE(?, address)
        WHERE id = ?
      `, [name, phone, address, req.customer.id]);

      res.json({ message: 'Profile updated' });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Change password
router.put('/change-password',
  authenticateCustomer,
  [
    body('current_password').notEmpty().withMessage('Current password is required'),
    body('new_password').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { current_password, new_password } = req.body;

      // Verify current password
      const isMatch = await bcrypt.compare(current_password, req.customer.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Current password is incorrect' });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(new_password, 10);

      await db.query('UPDATE customers SET password = ? WHERE id = ?', [hashedPassword, req.customer.id]);

      res.json({ message: 'Password changed successfully' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get customer orders
router.get('/orders', authenticateCustomer, async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT so.*,
             (SELECT COUNT(*) FROM sales_order_items WHERE sales_order_id = so.id) as item_count
      FROM sales_orders so
      WHERE so.customer_id = ?
    `;
    const params = [req.customer.id];

    if (status) {
      query += ' AND so.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace('SELECT so.*, (SELECT COUNT(*) FROM sales_order_items WHERE sales_order_id = so.id) as item_count', 'SELECT COUNT(*) as total');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;

    query += ' ORDER BY so.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const [orders] = await db.query(query, params);

    res.json({
      orders,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single order details
router.get('/orders/:id', authenticateCustomer, async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT so.*
      FROM sales_orders so
      WHERE so.id = ? AND so.customer_id = ?
    `, [req.params.id, req.customer.id]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.query(`
      SELECT soi.*, p.name as product_name, p.slug as product_slug, pv.variant_name, pv.sku,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image
      FROM sales_order_items soi
      LEFT JOIN product_variants pv ON soi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE soi.sales_order_id = ?
    `, [req.params.id]);

    order.items = items;

    // Get payments
    const [payments] = await db.query(`
      SELECT * FROM payments WHERE invoice_id IN (
        SELECT id FROM invoices WHERE sales_order_id = ?
      )
    `, [req.params.id]);

    order.payments = payments;

    res.json(order);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Track order by order number (public - no auth required)
router.get('/track/:orderNumber', async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT so.id, so.order_number, so.status, so.payment_status, so.total_amount,
             so.shipping_address, so.created_at, so.customer_name
      FROM sales_orders so
      WHERE so.order_number = ?
    `, [req.params.orderNumber]);

    if (orders.length === 0) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const order = orders[0];

    // Get order items (basic info only)
    const [items] = await db.query(`
      SELECT soi.quantity, p.name as product_name, pv.variant_name
      FROM sales_order_items soi
      LEFT JOIN product_variants pv ON soi.variant_id = pv.id
      LEFT JOIN products p ON pv.product_id = p.id
      WHERE soi.sales_order_id = ?
    `, [order.id]);

    order.items = items;

    // Get order timeline/status history
    const timeline = [
      { status: 'pending', label: 'Order Placed', date: order.created_at }
    ];

    if (['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)) {
      timeline.push({ status: 'confirmed', label: 'Order Confirmed', date: order.created_at });
    }
    if (['processing', 'shipped', 'delivered'].includes(order.status)) {
      timeline.push({ status: 'processing', label: 'Processing', date: order.created_at });
    }
    if (['shipped', 'delivered'].includes(order.status)) {
      timeline.push({ status: 'shipped', label: 'Shipped', date: order.created_at });
    }
    if (order.status === 'delivered') {
      timeline.push({ status: 'delivered', label: 'Delivered', date: order.created_at });
    }

    order.timeline = timeline;

    res.json(order);
  } catch (error) {
    console.error('Track order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get customer addresses
router.get('/addresses', authenticateCustomer, async (req, res) => {
  try {
    const [addresses] = await db.query(
      'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC',
      [req.customer.id]
    );
    res.json(addresses);
  } catch (error) {
    console.error('Get addresses error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add address
router.post('/addresses',
  authenticateCustomer,
  [
    body('label').notEmpty().withMessage('Label is required'),
    body('address_line1').notEmpty().withMessage('Address is required'),
    body('city').notEmpty().withMessage('City is required'),
    body('state').notEmpty().withMessage('State is required'),
    body('pincode').notEmpty().withMessage('Pincode is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { label, address_line1, address_line2, city, state, pincode, is_default } = req.body;

      // If this is set as default, unset other defaults
      if (is_default) {
        await db.query('UPDATE customer_addresses SET is_default = 0 WHERE customer_id = ?', [req.customer.id]);
      }

      const [result] = await db.query(`
        INSERT INTO customer_addresses (customer_id, label, address_line1, address_line2, city, state, pincode, is_default)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [req.customer.id, label, address_line1, address_line2, city, state, pincode, is_default ? 1 : 0]);

      res.status(201).json({
        message: 'Address added',
        id: result.insertId
      });
    } catch (error) {
      console.error('Add address error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete address
router.delete('/addresses/:id', authenticateCustomer, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM customer_addresses WHERE id = ? AND customer_id = ?',
      [req.params.id, req.customer.id]
    );
    res.json({ message: 'Address deleted' });
  } catch (error) {
    console.error('Delete address error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get wishlist
router.get('/wishlist', authenticateCustomer, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT w.*, p.name, p.slug, p.description,
             (SELECT image_url FROM product_images WHERE product_id = p.id AND is_primary = 1 LIMIT 1) as image,
             (SELECT MIN(selling_price) FROM product_variants WHERE product_id = p.id) as min_price,
             (SELECT MAX(selling_price) FROM product_variants WHERE product_id = p.id) as max_price
      FROM customer_wishlist w
      LEFT JOIN products p ON w.product_id = p.id
      WHERE w.customer_id = ?
      ORDER BY w.created_at DESC
    `, [req.customer.id]);

    res.json(items);
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add to wishlist
router.post('/wishlist/:productId', authenticateCustomer, async (req, res) => {
  try {
    // Check if already in wishlist
    const [existing] = await db.query(
      'SELECT id FROM customer_wishlist WHERE customer_id = ? AND product_id = ?',
      [req.customer.id, req.params.productId]
    );

    if (existing.length > 0) {
      return res.status(400).json({ message: 'Already in wishlist' });
    }

    await db.query(
      'INSERT INTO customer_wishlist (customer_id, product_id) VALUES (?, ?)',
      [req.customer.id, req.params.productId]
    );

    res.status(201).json({ message: 'Added to wishlist' });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove from wishlist
router.delete('/wishlist/:productId', authenticateCustomer, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM customer_wishlist WHERE customer_id = ? AND product_id = ?',
      [req.customer.id, req.params.productId]
    );
    res.json({ message: 'Removed from wishlist' });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// =====================================================
// ADMIN ROUTES FOR CUSTOMER MANAGEMENT
// =====================================================

const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate } = require('../utils/helpers');

// Get customer stats summary (admin) - MUST be before /admin/:id
router.get('/admin/stats/summary', authenticate, async (req, res, next) => {
  try {
    const [stats] = await db.query(`
      SELECT
        COUNT(*) as total_customers,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_customers,
        SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) as new_this_month,
        (SELECT COUNT(DISTINCT customer_id) FROM sales_orders WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as ordering_customers
      FROM customers
    `);

    res.json(formatResponse(stats[0]));
  } catch (error) {
    console.error('Get customer stats error:', error);
    next(error);
  }
});

// Get all customers (admin)
router.get('/admin/list', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, q, status } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT c.id, c.name, c.email, c.phone, c.address, c.is_active, c.last_login, c.created_at,
             (SELECT COUNT(*) FROM sales_orders WHERE customer_id = c.id) as total_orders,
             (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE customer_id = c.id AND status != 'cancelled') as total_spent
      FROM customers c
      WHERE 1=1
    `;
    let countQuery = 'SELECT COUNT(*) as total FROM customers WHERE 1=1';
    const params = [];
    const countParams = [];

    if (q) {
      query += ' AND (c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ?)';
      countQuery += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (status === 'active') {
      query += ' AND c.is_active = 1';
      countQuery += ' AND is_active = 1';
    } else if (status === 'inactive') {
      query += ' AND c.is_active = 0';
      countQuery += ' AND is_active = 0';
    }

    query += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [customers] = await db.query(query, params);
    const [totalResult] = await db.query(countQuery, countParams);

    res.json(formatResponse(customers, {
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: totalResult[0].total,
        totalPages: Math.ceil(totalResult[0].total / pageLimit)
      }
    }));
  } catch (error) {
    console.error('Get customers error:', error);
    next(error);
  }
});

// Get customer details with sales data (admin)
router.get('/admin/:id', authenticate, async (req, res, next) => {
  try {
    const [customers] = await db.query(
      'SELECT id, name, email, phone, address, is_active, last_login, created_at FROM customers WHERE id = ?',
      [req.params.id]
    );

    if (!customers.length) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const customer = customers[0];

    // Get order summary
    const [orderSummary] = await db.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status IN ('pending', 'confirmed', 'processing', 'shipped') THEN 1 ELSE 0 END) as active_orders,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_orders,
        COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total_amount ELSE 0 END), 0) as total_spent,
        COALESCE(AVG(CASE WHEN status != 'cancelled' THEN total_amount ELSE NULL END), 0) as avg_order_value,
        MAX(created_at) as last_order_date
      FROM sales_orders
      WHERE customer_id = ?
    `, [req.params.id]);

    // Get recent orders
    const [recentOrders] = await db.query(`
      SELECT id, order_number, status, total_amount, created_at
      FROM sales_orders
      WHERE customer_id = ?
      ORDER BY created_at DESC
      LIMIT 10
    `, [req.params.id]);

    // Get top purchased products
    const [topProducts] = await db.query(`
      SELECT
        p.id as product_id,
        p.name as product_name,
        pv.id as variant_id,
        pv.variant_name,
        pv.sku,
        SUM(soi.quantity) as total_qty,
        SUM(soi.quantity * soi.unit_price) as total_value,
        COUNT(DISTINCT so.id) as order_count
      FROM sales_order_items soi
      JOIN sales_orders so ON soi.sales_order_id = so.id
      JOIN product_variants pv ON soi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      WHERE so.customer_id = ? AND so.status != 'cancelled'
      GROUP BY p.id, p.name, pv.id, pv.variant_name, pv.sku
      ORDER BY total_qty DESC
      LIMIT 10
    `, [req.params.id]);

    // Get customer addresses
    const [addresses] = await db.query(
      'SELECT * FROM customer_addresses WHERE customer_id = ? ORDER BY is_default DESC',
      [req.params.id]
    );

    // Get monthly spending trend (last 6 months)
    const [spendingTrend] = await db.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as orders,
        SUM(total_amount) as amount
      FROM sales_orders
      WHERE customer_id = ? AND status != 'cancelled' AND created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `, [req.params.id]);

    res.json(formatResponse({
      ...customer,
      order_summary: orderSummary[0],
      recent_orders: recentOrders,
      top_products: topProducts,
      addresses,
      spending_trend: spendingTrend
    }));
  } catch (error) {
    console.error('Get customer details error:', error);
    next(error);
  }
});

// Update customer status (admin)
router.put('/admin/:id/status', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { is_active } = req.body;

    await db.query(
      'UPDATE customers SET is_active = ? WHERE id = ?',
      [is_active ? 1 : 0, req.params.id]
    );

    res.json({ success: true, message: `Customer ${is_active ? 'activated' : 'deactivated'} successfully` });
  } catch (error) {
    console.error('Update customer status error:', error);
    next(error);
  }
});

module.exports = router;
