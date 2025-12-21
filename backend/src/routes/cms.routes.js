const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Get all pages (public)
router.get('/pages', async (req, res) => {
  try {
    const [pages] = await db.query(`
      SELECT id, title, slug, meta_title, meta_description, is_published, updated_at
      FROM site_content
      WHERE type = 'page'
      ORDER BY title
    `);
    res.json(pages);
  } catch (error) {
    console.error('Get pages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single page by slug (public)
router.get('/pages/:slug', async (req, res) => {
  try {
    const [pages] = await db.query(`
      SELECT * FROM site_content
      WHERE slug = ? AND type = 'page' AND is_published = 1
    `, [req.params.slug]);

    if (pages.length === 0) {
      return res.status(404).json({ message: 'Page not found' });
    }

    res.json(pages[0]);
  } catch (error) {
    console.error('Get page error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all content
router.get('/admin/content', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const { type } = req.query;

    let query = 'SELECT * FROM site_content';
    const params = [];

    if (type) {
      query += ' WHERE type = ?';
      params.push(type);
    }

    query += ' ORDER BY updated_at DESC';

    const [content] = await db.query(query, params);
    res.json(content);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get single content by ID
router.get('/admin/content/:id', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const [content] = await db.query('SELECT * FROM site_content WHERE id = ?', [req.params.id]);

    if (content.length === 0) {
      return res.status(404).json({ message: 'Content not found' });
    }

    res.json(content[0]);
  } catch (error) {
    console.error('Get content error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create content
router.post('/admin/content',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('slug').notEmpty().withMessage('Slug is required'),
    body('type').isIn(['page', 'banner', 'block']).withMessage('Invalid type'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { title, slug, type, content, meta_title, meta_description, is_published } = req.body;

      // Check if slug exists
      const [existing] = await db.query('SELECT id FROM site_content WHERE slug = ?', [slug]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Slug already exists' });
      }

      const [result] = await db.query(`
        INSERT INTO site_content (title, slug, type, content, meta_title, meta_description, is_published, created_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [title, slug, type, content, meta_title, meta_description, is_published ? 1 : 0, req.user.id]);

      res.status(201).json({
        message: 'Content created',
        id: result.insertId
      });
    } catch (error) {
      console.error('Create content error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Update content
router.put('/admin/content/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      const { title, slug, content, meta_title, meta_description, is_published } = req.body;

      // Check if slug exists for other content
      if (slug) {
        const [existing] = await db.query(
          'SELECT id FROM site_content WHERE slug = ? AND id != ?',
          [slug, req.params.id]
        );
        if (existing.length > 0) {
          return res.status(400).json({ message: 'Slug already exists' });
        }
      }

      await db.query(`
        UPDATE site_content
        SET title = COALESCE(?, title),
            slug = COALESCE(?, slug),
            content = COALESCE(?, content),
            meta_title = COALESCE(?, meta_title),
            meta_description = COALESCE(?, meta_description),
            is_published = COALESCE(?, is_published),
            updated_by = ?
        WHERE id = ?
      `, [title, slug, content, meta_title, meta_description, is_published, req.user.id, req.params.id]);

      res.json({ message: 'Content updated' });
    } catch (error) {
      console.error('Update content error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Delete content
router.delete('/admin/content/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      await db.query('DELETE FROM site_content WHERE id = ?', [req.params.id]);
      res.json({ message: 'Content deleted' });
    } catch (error) {
      console.error('Delete content error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Get banners (public)
router.get('/banners', async (req, res) => {
  try {
    const { position } = req.query;

    let query = `
      SELECT * FROM site_content
      WHERE type = 'banner' AND is_published = 1
    `;
    const params = [];

    if (position) {
      query += ' AND JSON_EXTRACT(content, "$.position") = ?';
      params.push(position);
    }

    query += ' ORDER BY JSON_EXTRACT(content, "$.order") ASC';

    const [banners] = await db.query(query, params);

    // Parse JSON content
    const parsedBanners = banners.map(b => ({
      ...b,
      content: JSON.parse(b.content || '{}')
    }));

    res.json(parsedBanners);
  } catch (error) {
    console.error('Get banners error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get email templates (admin only)
router.get('/admin/email-templates', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const [templates] = await db.query(`
      SELECT * FROM email_templates ORDER BY name
    `);
    res.json(templates);
  } catch (error) {
    console.error('Get templates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update email template
router.put('/admin/email-templates/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      const { subject, body_html, body_text } = req.body;

      await db.query(`
        UPDATE email_templates
        SET subject = COALESCE(?, subject),
            body_html = COALESCE(?, body_html),
            body_text = COALESCE(?, body_text),
            updated_at = NOW()
        WHERE id = ?
      `, [subject, body_html, body_text, req.params.id]);

      res.json({ message: 'Template updated' });
    } catch (error) {
      console.error('Update template error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
