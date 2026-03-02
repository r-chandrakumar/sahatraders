const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize, optionalAuth } = require('../middleware/auth.middleware');
const { slugify, formatResponse, paginate } = require('../utils/helpers');

// Get all products (public with filters)
router.get('/', optionalAuth, async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 12,
      category,
      category_slug,
      q,
      min_price,
      max_price,
      in_stock,
      sort = 'newest',
      active_only = 'true'
    } = req.query;

    const { limit: pageLimit, offset } = paginate(page, limit);

    let query = `
      SELECT DISTINCT p.*,
        c.name as category_name,
        c.slug as category_slug,
        (SELECT MIN(pv.sell_price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as min_price,
        (SELECT MAX(pv.sell_price) FROM product_variants pv WHERE pv.product_id = p.id AND pv.is_active = true) as max_price,
        (SELECT SUM(pv.stock_qty) FROM product_variants pv WHERE pv.product_id = p.id) as total_stock
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_variants pv ON p.id = pv.product_id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (active_only === 'true') {
      query += ' AND p.is_active = true';
      countQuery += ' AND p.is_active = true';
    }

    if (category) {
      query += ' AND p.category_id = ?';
      countQuery += ' AND p.category_id = ?';
      params.push(category);
      countParams.push(category);
    }

    if (category_slug) {
      query += ' AND c.slug = ?';
      countQuery += ' AND c.slug = ?';
      params.push(category_slug);
      countParams.push(category_slug);
    }

    if (q) {
      query += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      countQuery += ' AND (p.name LIKE ? OR p.description LIKE ? OR p.sku LIKE ?)';
      const searchTerm = `%${q}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    if (min_price) {
      query += ' AND pv.sell_price >= ?';
      countQuery += ' AND pv.sell_price >= ?';
      params.push(min_price);
      countParams.push(min_price);
    }

    if (max_price) {
      query += ' AND pv.sell_price <= ?';
      countQuery += ' AND pv.sell_price <= ?';
      params.push(max_price);
      countParams.push(max_price);
    }

    if (in_stock === 'true') {
      query += ' AND pv.stock_qty > 0';
      countQuery += ' AND pv.stock_qty > 0';
    }

    // Sorting
    switch (sort) {
      case 'price_low':
        query += ' ORDER BY min_price ASC';
        break;
      case 'price_high':
        query += ' ORDER BY min_price DESC';
        break;
      case 'name':
        query += ' ORDER BY p.name ASC';
        break;
      case 'oldest':
        query += ' ORDER BY p.created_at ASC';
        break;
      default:
        query += ' ORDER BY p.created_at DESC';
    }

    query += ' LIMIT ? OFFSET ?';
    params.push(pageLimit, offset);

    const [products] = await pool.query(query, params);
    const [totalResult] = await pool.query(countQuery, countParams);
    const total = totalResult[0].total;

    // Fetch variants and images for each product
    const productIds = products.map(p => p.id);
    if (productIds.length > 0) {
      const [variants] = await pool.query(
        'SELECT * FROM product_variants WHERE product_id IN (?) AND is_active = true ORDER BY sell_price ASC',
        [productIds]
      );
      const [images] = await pool.query(
        'SELECT * FROM product_images WHERE product_id IN (?) ORDER BY sort_order ASC',
        [productIds]
      );

      // Group variants and images by product_id
      products.forEach(product => {
        product.variants = variants.filter(v => v.product_id === product.id);
        product.images = images.filter(i => i.product_id === product.id);
      });
    }

    res.json(formatResponse(products, {
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total,
        totalPages: Math.ceil(total / pageLimit)
      }
    }));
  } catch (error) {
    next(error);
  }
});

// Get product by slug (public)
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, c.name as category_name, c.slug as category_slug
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.slug = ?`,
      [req.params.slug]
    );

    if (!products.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];

    // Get variants
    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? AND is_active = true ORDER BY sell_price ASC',
      [product.id]
    );

    // Get images
    const [images] = await pool.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
      [product.id]
    );

    res.json(formatResponse({
      ...product,
      variants,
      images
    }));
  } catch (error) {
    next(error);
  }
});

// Get product by ID
router.get('/:id', async (req, res, next) => {
  try {
    const [products] = await pool.query(
      `SELECT p.*, c.name as category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (!products.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const product = products[0];

    // Get variants
    const [variants] = await pool.query(
      'SELECT * FROM product_variants WHERE product_id = ? ORDER BY sell_price ASC',
      [product.id]
    );

    // Get images
    const [images] = await pool.query(
      'SELECT * FROM product_images WHERE product_id = ? ORDER BY sort_order ASC',
      [product.id]
    );

    res.json(formatResponse({
      ...product,
      variants,
      images
    }));
  } catch (error) {
    next(error);
  }
});

// Create product (admin)
router.post('/', authenticate, authorize('super_admin', 'admin'), [
  body('sku').notEmpty().trim(),
  body('name').notEmpty().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const {
      sku, name, description, category_id, brand, type, supplier_id,
      default_image, seo_title, seo_description
    } = req.body;

    const slug = slugify(name);

    // Check if SKU or slug exists
    const [existing] = await pool.query(
      'SELECT id FROM products WHERE sku = ? OR slug = ?',
      [sku, slug]
    );
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Product with this SKU or name already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO products (sku, name, slug, description, category_id, brand, type, supplier_id, default_image, seo_title, seo_description)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [sku, name, slug, description, category_id, brand, type || 'inhouse', supplier_id || null, default_image, seo_title, seo_description]
    );

    const [newProduct] = await pool.query('SELECT * FROM products WHERE id = ?', [result.insertId]);

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values) VALUES (?, ?, ?, ?, ?)',
      [req.user.id, 'create', 'product', result.insertId, JSON.stringify(newProduct[0])]
    );

    res.status(201).json(formatResponse(newProduct[0]));
  } catch (error) {
    next(error);
  }
});

// Update product (admin)
router.put('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      sku, name, description, category_id, brand, type, supplier_id,
      default_image, seo_title, seo_description, is_active
    } = req.body;

    const [existing] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    let slug = existing[0].slug;
    if (name && name !== existing[0].name) {
      slug = slugify(name);
    }

    await pool.query(
      `UPDATE products SET
        sku = COALESCE(?, sku),
        name = COALESCE(?, name),
        slug = ?,
        description = COALESCE(?, description),
        category_id = ?,
        brand = COALESCE(?, brand),
        type = COALESCE(?, type),
        supplier_id = ?,
        default_image = COALESCE(?, default_image),
        seo_title = COALESCE(?, seo_title),
        seo_description = COALESCE(?, seo_description),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [sku, name, slug, description, category_id, brand, type, supplier_id || null, default_image, seo_title, seo_description, is_active, id]
    );

    const [updated] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values) VALUES (?, ?, ?, ?, ?, ?)',
      [req.user.id, 'update', 'product', id, JSON.stringify(existing[0]), JSON.stringify(updated[0])]
    );

    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Delete product (admin)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if product has orders
    const [orders] = await pool.query(
      `SELECT COUNT(*) as count FROM sales_order_items soi
       JOIN product_variants pv ON soi.variant_id = pv.id
       WHERE pv.product_id = ?`,
      [id]
    );

    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete product with order history. Deactivate it instead.'
      });
    }

    await pool.query('DELETE FROM products WHERE id = ?', [id]);

    // Log audit
    await pool.query(
      'INSERT INTO audit_logs (user_id, action, entity_type, entity_id) VALUES (?, ?, ?, ?)',
      [req.user.id, 'delete', 'product', id]
    );

    res.json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add variant to product (admin)
router.post('/:id/variants', authenticate, authorize('super_admin', 'admin'), [
  body('sku').notEmpty().trim(),
  body('variant_name').notEmpty().trim(),
  body('sell_price').isNumeric()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { id } = req.params;
    const {
      sku, variant_name, attributes, buy_price, sell_price, compare_price,
      tax_percent, barcode, stock_qty, low_stock_threshold, weight, weight_unit
    } = req.body;

    // Check if variant SKU exists
    const [existing] = await pool.query('SELECT id FROM product_variants WHERE sku = ?', [sku]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Variant SKU already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO product_variants
       (product_id, sku, variant_name, attributes, buy_price, sell_price, compare_price,
        tax_percent, barcode, stock_qty, low_stock_threshold, weight, weight_unit, track_stock, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true, true)`,
      [id, sku, variant_name, JSON.stringify(attributes || {}), buy_price || 0, sell_price,
       compare_price, tax_percent || 0, barcode, stock_qty || 0, low_stock_threshold || 10, weight, weight_unit || 'g']
    );

    // Create initial stock movement if stock_qty > 0
    if (stock_qty > 0) {
      await pool.query(
        `INSERT INTO stock_movements (variant_id, change_qty, reason, cost_price, created_by)
         VALUES (?, ?, 'initial', ?, ?)`,
        [result.insertId, stock_qty, buy_price || 0, req.user.id]
      );
    }

    const [newVariant] = await pool.query('SELECT * FROM product_variants WHERE id = ?', [result.insertId]);
    res.status(201).json(formatResponse(newVariant[0]));
  } catch (error) {
    next(error);
  }
});

// Update variant (admin)
router.put('/:productId/variants/:variantId', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { variantId } = req.params;
    const {
      sku, variant_name, attributes, buy_price, sell_price, compare_price,
      tax_percent, barcode, low_stock_threshold, weight, weight_unit, is_active
    } = req.body;

    await pool.query(
      `UPDATE product_variants SET
        sku = COALESCE(?, sku),
        variant_name = COALESCE(?, variant_name),
        attributes = COALESCE(?, attributes),
        buy_price = COALESCE(?, buy_price),
        sell_price = COALESCE(?, sell_price),
        compare_price = ?,
        tax_percent = COALESCE(?, tax_percent),
        barcode = COALESCE(?, barcode),
        low_stock_threshold = COALESCE(?, low_stock_threshold),
        weight = COALESCE(?, weight),
        weight_unit = COALESCE(?, weight_unit),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [sku, variant_name, JSON.stringify(attributes), buy_price, sell_price, compare_price,
       tax_percent, barcode, low_stock_threshold, weight, weight_unit, is_active, variantId]
    );

    const [updated] = await pool.query('SELECT * FROM product_variants WHERE id = ?', [variantId]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Delete variant (admin)
router.delete('/:productId/variants/:variantId', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { variantId } = req.params;

    // Check if variant has orders
    const [orders] = await pool.query(
      'SELECT COUNT(*) as count FROM sales_order_items WHERE variant_id = ?',
      [variantId]
    );

    if (orders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete variant with order history. Deactivate it instead.'
      });
    }

    await pool.query('DELETE FROM product_variants WHERE id = ?', [variantId]);
    res.json({ success: true, message: 'Variant deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Add image to product (admin)
router.post('/:id/images', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { url, variant_id, alt_text, sort_order } = req.body;

    const [result] = await pool.query(
      'INSERT INTO product_images (product_id, variant_id, url, alt_text, sort_order) VALUES (?, ?, ?, ?, ?)',
      [id, variant_id || null, url, alt_text, sort_order || 0]
    );

    const [newImage] = await pool.query('SELECT * FROM product_images WHERE id = ?', [result.insertId]);
    res.status(201).json(formatResponse(newImage[0]));
  } catch (error) {
    next(error);
  }
});

// Delete image (admin)
router.delete('/:productId/images/:imageId', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    await pool.query('DELETE FROM product_images WHERE id = ?', [req.params.imageId]);
    res.json({ success: true, message: 'Image deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
