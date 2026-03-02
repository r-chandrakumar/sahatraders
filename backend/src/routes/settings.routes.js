const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');
const { body, validationResult } = require('express-validator');

// Get all settings (public - non-sensitive)
router.get('/public', async (req, res) => {
  try {
    const [settings] = await db.query(`
      SELECT setting_key, setting_value FROM settings
      WHERE is_public = 1
    `);

    const settingsObj = {};
    settings.forEach(s => {
      try {
        settingsObj[s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        settingsObj[s.setting_key] = s.setting_value;
      }
    });

    res.json(settingsObj);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all settings (admin)
router.get('/', authenticateToken, authorizeRoles('super_admin', 'admin'), async (req, res) => {
  try {
    const { group } = req.query;

    let query = 'SELECT * FROM settings';
    const params = [];

    if (group) {
      query += ' WHERE setting_group = ?';
      params.push(group);
    }

    query += ' ORDER BY setting_group, setting_key';

    const [settings] = await db.query(query, params);

    // Group settings
    const grouped = {};
    settings.forEach(s => {
      if (!grouped[s.setting_group]) {
        grouped[s.setting_group] = {};
      }
      try {
        grouped[s.setting_group][s.setting_key] = JSON.parse(s.setting_value);
      } catch {
        grouped[s.setting_group][s.setting_key] = s.setting_value;
      }
    });

    res.json(grouped);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// --- Tax rate routes (MUST be before /:key wildcard) ---

// Get tax rates
router.get('/tax/rates', authenticateToken, async (req, res) => {
  try {
    const [rates] = await db.query('SELECT * FROM tax_rates WHERE is_active = 1 ORDER BY rate');
    res.json(rates);
  } catch (error) {
    console.error('Get tax rates error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create tax rate
router.post('/tax/rates',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('rate').isNumeric().withMessage('Rate must be a number'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, rate, type = 'inclusive', is_default = false } = req.body;

      // If setting as default, unset others
      if (is_default) {
        await db.query('UPDATE tax_rates SET is_default = 0');
      }

      const [result] = await db.query(`
        INSERT INTO tax_rates (name, rate, type, is_default, is_active)
        VALUES (?, ?, ?, ?, 1)
      `, [name, rate, type, is_default ? 1 : 0]);

      res.status(201).json({
        message: 'Tax rate created',
        id: result.insertId
      });
    } catch (error) {
      console.error('Create tax rate error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Update tax rate
router.put('/tax/rates/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      const { name, rate, type, is_default, is_active } = req.body;

      if (is_default) {
        await db.query('UPDATE tax_rates SET is_default = 0');
      }

      await db.query(`
        UPDATE tax_rates
        SET name = COALESCE(?, name),
            rate = COALESCE(?, rate),
            type = COALESCE(?, type),
            is_default = COALESCE(?, is_default),
            is_active = COALESCE(?, is_active)
        WHERE id = ?
      `, [name, rate, type, is_default, is_active, req.params.id]);

      res.json({ message: 'Tax rate updated' });
    } catch (error) {
      console.error('Update tax rate error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete tax rate
router.delete('/tax/rates/:id',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      await db.query('DELETE FROM tax_rates WHERE id = ?', [req.params.id]);
      res.json({ message: 'Tax rate deleted' });
    } catch (error) {
      console.error('Delete tax rate error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// --- Payment method routes (MUST be before /:key wildcard) ---

// Get payment methods
router.get('/payment-methods', async (req, res) => {
  try {
    const [methods] = await db.query('SELECT * FROM payment_methods ORDER BY sort_order');
    res.json(methods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Toggle payment method
router.put('/payment-methods/:id/toggle',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      await db.query(`
        UPDATE payment_methods SET is_active = NOT is_active WHERE id = ?
      `, [req.params.id]);
      res.json({ message: 'Payment method toggled' });
    } catch (error) {
      console.error('Toggle payment method error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// --- Wildcard routes (MUST be after specific routes) ---

// Get single setting
router.get('/:key', authenticateToken, async (req, res) => {
  try {
    const [settings] = await db.query(
      'SELECT * FROM settings WHERE setting_key = ?',
      [req.params.key]
    );

    if (settings.length === 0) {
      return res.status(404).json({ message: 'Setting not found' });
    }

    const setting = settings[0];
    try {
      setting.setting_value = JSON.parse(setting.setting_value);
    } catch {}

    res.json(setting);
  } catch (error) {
    console.error('Get setting error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update setting
router.put('/:key',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    try {
      const { value } = req.body;
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // Check if setting exists
      const [existing] = await db.query(
        'SELECT id FROM settings WHERE setting_key = ?',
        [req.params.key]
      );

      if (existing.length === 0) {
        return res.status(404).json({ message: 'Setting not found' });
      }

      await db.query(`
        UPDATE settings SET setting_value = ?, updated_at = NOW()
        WHERE setting_key = ?
      `, [stringValue, req.params.key]);

      // Log audit
      await db.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value)
        VALUES (?, 'update', 'setting', ?, ?, ?)
      `, [req.user.id, existing[0].id, null, stringValue]);

      res.json({ message: 'Setting updated' });
    } catch (error) {
      console.error('Update setting error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Bulk update settings
router.put('/',
  authenticateToken,
  authorizeRoles('super_admin', 'admin'),
  async (req, res) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const { settings } = req.body;

      for (const [key, value] of Object.entries(settings)) {
        const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

        await connection.query(`
          INSERT INTO settings (setting_key, setting_value, setting_group)
          VALUES (?, ?, 'general')
          ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = NOW()
        `, [key, stringValue, stringValue]);
      }

      await connection.commit();
      res.json({ message: 'Settings updated' });
    } catch (error) {
      await connection.rollback();
      console.error('Bulk update settings error:', error);
      res.status(500).json({ message: 'Server error' });
    } finally {
      connection.release();
    }
  }
);

// Create setting
router.post('/',
  authenticateToken,
  authorizeRoles('super_admin'),
  [
    body('key').notEmpty().withMessage('Key is required'),
    body('value').exists().withMessage('Value is required'),
    body('group').optional(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { key, value, group = 'general', is_public = false, description } = req.body;
      const stringValue = typeof value === 'object' ? JSON.stringify(value) : String(value);

      // Check if exists
      const [existing] = await db.query('SELECT id FROM settings WHERE setting_key = ?', [key]);
      if (existing.length > 0) {
        return res.status(400).json({ message: 'Setting already exists' });
      }

      await db.query(`
        INSERT INTO settings (setting_key, setting_value, setting_group, is_public, description)
        VALUES (?, ?, ?, ?, ?)
      `, [key, stringValue, group, is_public ? 1 : 0, description]);

      res.status(201).json({ message: 'Setting created' });
    } catch (error) {
      console.error('Create setting error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Delete setting
router.delete('/:key',
  authenticateToken,
  authorizeRoles('super_admin'),
  async (req, res) => {
    try {
      await db.query('DELETE FROM settings WHERE setting_key = ?', [req.params.key]);
      res.json({ message: 'Setting deleted' });
    } catch (error) {
      console.error('Delete setting error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
