const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const pool = require('../config/database');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { slugify, formatResponse, paginate } = require('../utils/helpers');

// Get all categories (public)
router.get('/', async (req, res, next) => {
  try {
    const { parent_id, active_only = 'true' } = req.query;

    let query = `
      SELECT c.*,
        (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = true) as product_count
      FROM categories c
      WHERE 1=1
    `;
    const params = [];

    if (active_only === 'true') {
      query += ' AND c.is_active = true';
    }

    if (parent_id === 'null') {
      query += ' AND c.parent_id IS NULL';
    } else if (parent_id) {
      query += ' AND c.parent_id = ?';
      params.push(parent_id);
    }

    query += ' ORDER BY c.sort_order ASC, c.name ASC';

    const [categories] = await pool.query(query, params);

    res.json(formatResponse(categories));
  } catch (error) {
    next(error);
  }
});

// Get category by slug (public)
router.get('/slug/:slug', async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      `SELECT c.*,
        (SELECT COUNT(*) FROM products WHERE category_id = c.id AND is_active = true) as product_count
       FROM categories c WHERE c.slug = ?`,
      [req.params.slug]
    );

    if (!categories.length) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json(formatResponse(categories[0]));
  } catch (error) {
    next(error);
  }
});

// Get category by ID
router.get('/:id', async (req, res, next) => {
  try {
    const [categories] = await pool.query(
      'SELECT * FROM categories WHERE id = ?',
      [req.params.id]
    );

    if (!categories.length) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    res.json(formatResponse(categories[0]));
  } catch (error) {
    next(error);
  }
});

// Create category (admin)
router.post('/', authenticate, authorize('super_admin', 'admin'), [
  body('name').notEmpty().trim(),
  body('description').optional().trim()
], async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, description, parent_id, image_url, seo_title, seo_description, sort_order } = req.body;
    const slug = slugify(name);

    // Check if slug exists
    const [existing] = await pool.query('SELECT id FROM categories WHERE slug = ?', [slug]);
    if (existing.length) {
      return res.status(400).json({ success: false, message: 'Category with this name already exists' });
    }

    const [result] = await pool.query(
      `INSERT INTO categories (name, slug, parent_id, description, image_url, seo_title, seo_description, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, parent_id || null, description, image_url, seo_title, seo_description, sort_order || 0]
    );

    const [newCategory] = await pool.query('SELECT * FROM categories WHERE id = ?', [result.insertId]);

    res.status(201).json(formatResponse(newCategory[0]));
  } catch (error) {
    next(error);
  }
});

// Update category (admin)
router.put('/:id', authenticate, authorize('super_admin', 'admin'), [
  body('name').optional().trim()
], async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, parent_id, image_url, seo_title, seo_description, sort_order, is_active } = req.body;

    const [existing] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    if (!existing.length) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    let slug = existing[0].slug;
    if (name && name !== existing[0].name) {
      slug = slugify(name);
      const [slugExists] = await pool.query('SELECT id FROM categories WHERE slug = ? AND id != ?', [slug, id]);
      if (slugExists.length) {
        return res.status(400).json({ success: false, message: 'Category with this name already exists' });
      }
    }

    await pool.query(
      `UPDATE categories SET
        name = COALESCE(?, name),
        slug = ?,
        parent_id = ?,
        description = COALESCE(?, description),
        image_url = COALESCE(?, image_url),
        seo_title = COALESCE(?, seo_title),
        seo_description = COALESCE(?, seo_description),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, slug, parent_id, description, image_url, seo_title, seo_description, sort_order, is_active, id]
    );

    const [updated] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
    res.json(formatResponse(updated[0]));
  } catch (error) {
    next(error);
  }
});

// Delete category (admin)
router.delete('/:id', authenticate, authorize('super_admin', 'admin'), async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if category has products
    const [products] = await pool.query('SELECT COUNT(*) as count FROM products WHERE category_id = ?', [id]);
    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with products. Move or delete products first.'
      });
    }

    // Check if category has subcategories
    const [subcats] = await pool.query('SELECT COUNT(*) as count FROM categories WHERE parent_id = ?', [id]);
    if (subcats[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with subcategories.'
      });
    }

    await pool.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
