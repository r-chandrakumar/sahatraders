const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { formatResponse, paginate } = require('../utils/helpers');

// Get all suppliers
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, q, active_only } = req.query;
    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = 'SELECT * FROM suppliers WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as total FROM suppliers WHERE 1=1';
    const params = [];
    const countParams = [];

    if (active_only === 'true') {
      query += ' AND is_active = true';
      countQuery += ' AND is_active = true';
    }

    if (q) {
      query += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      countQuery += ' AND (name LIKE ? OR contact_person LIKE ? OR email LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' ORDER BY name ASC LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [suppliers] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);

    res.json(formatResponse(suppliers, {
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

// Get supplier by ID with full details
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const [suppliers] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [req.params.id]);

    if (!suppliers.length) {
      return res.status(404).json({ success: false, message: 'Supplier not found' });
    }

    // Get supplier products (from supplier_products table)
    const [products] = await pool.query(
      `SELECT sp.*, p.name as product_name, p.sku as product_sku, pv.variant_name
       FROM supplier_products sp
       JOIN products p ON sp.product_id = p.id
       LEFT JOIN product_variants pv ON sp.variant_id = pv.id
       WHERE sp.supplier_id = ?`,
      [req.params.id]
    );

    // Get purchase orders summary
    const [poSummary] = await pool.query(
      `SELECT
        COUNT(*) as total_orders,
        SUM(CASE WHEN status = 'received' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN status = 'pending' OR status = 'ordered' THEN 1 ELSE 0 END) as pending_orders,
        SUM(total_amount) as total_value,
        MAX(created_at) as last_order_date
       FROM purchase_orders
       WHERE supplier_id = ?`,
      [req.params.id]
    );

    // Get recent purchase orders
    const [recentPOs] = await pool.query(
      `SELECT id, po_number, status, total_amount, created_at, expected_date
       FROM purchase_orders
       WHERE supplier_id = ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [req.params.id]
    );

    // Get products purchased through POs (with quantities)
    const [purchasedProducts] = await pool.query(
      `SELECT
        p.id as product_id,
        p.name as product_name,
        p.sku as product_sku,
        pv.id as variant_id,
        pv.variant_name,
        pv.sku as variant_sku,
        SUM(poi.quantity) as total_qty_purchased,
        SUM(poi.quantity * poi.unit_price) as total_value,
        COUNT(DISTINCT po.id) as order_count,
        AVG(poi.unit_price) as avg_unit_price,
        MAX(po.created_at) as last_purchased
       FROM purchase_order_items poi
       JOIN purchase_orders po ON poi.po_id = po.id
       JOIN product_variants pv ON poi.variant_id = pv.id
       JOIN products p ON pv.product_id = p.id
       WHERE po.supplier_id = ?
       GROUP BY p.id, p.name, p.sku, pv.id, pv.variant_name, pv.sku
       ORDER BY total_qty_purchased DESC`,
      [req.params.id]
    );

    res.json(formatResponse({
      ...suppliers[0],
      products,
      po_summary: poSummary[0],
      recent_orders: recentPOs,
      purchased_products: purchasedProducts
    }));
  } catch (error) {
    next(error);
  }
});

// Create supplier
router.post('/', authenticate, authorize('super_admin', 'admin'), [
  body('name').notEmpty().trim(),
  body('email').optional().isEmail()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      name, contact_person, phone, email, address, city, state, pincode,
      gst_number, payment_terms, notes
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO suppliers
       (name, contact_person, phone, email, address, city, state, pincode, gst_number, payment_terms, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, contact_person, phone, email, address, city, state, pincode, gst_number, payment_terms, notes]
    );

    const [newSupplier] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [result.insertId]);
    res.status(201).json(formatResponse(newSupplier[0]));
  } catch (error) {
    next(error);
  }
});

// Update supplier
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, contact_person, phone, email, address, city, state, pincode,
      gst_number, payment_terms, notes, is_active
    } = req.body;

    await pool.query(
      `UPDATE suppliers SET
        name = COALESCE(?, name),
        contact_person = COALESCE(?, contact_person),
        phone = COALESCE(?, phone),
        email = COALESCE(?, email),
        address = COALESCE(?, address),
        city = COALESCE(?, city),
        state = COALESCE(?, state),
        pincode = COALESCE(?, pincode),
        gst_number = COALESCE(?, gst_number),
        payment_terms = COALESCE(?, payment_terms),
        notes = COALESCE(?, notes),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, contact_person, phone, email, address, city, state, pincode, gst_number, payment_terms, notes, is_active, id]
    );

    const [updated] = await pool.query('SELECT * FROM suppliers WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Delete supplier
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if supplier has POs
    const [pos] = await pool.query('SELECT COUNT(*) as count FROM purchase_orders WHERE supplier_id = ?', [id]);
    if (pos[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete supplier with purchase order history. Deactivate instead.'
      });
    }

    await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
    res.json({ success: true, message: 'Supplier deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add product to supplier
router.post('/:id/products', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { product_id, variant_id, supplier_sku, supplier_buy_price, lead_time_days, is_preferred } = req.body;

    const [result] = await pool.query(
      `INSERT INTO supplier_products
       (supplier_id, product_id, variant_id, supplier_sku, supplier_buy_price, lead_time_days, is_preferred)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, product_id, variant_id, supplier_sku, supplier_buy_price, lead_time_days || 7, is_preferred || false]
    );

    const [newRecord] = await pool.query('SELECT * FROM supplier_products WHERE id = ?', [result.insertId]);
    res.status(201).json(formatResponse(newRecord[0]));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
