require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seed() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders'
  });

  try {
    // Create default admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await connection.query(`
      INSERT INTO users (name, email, password_hash, role, is_active)
      VALUES ('Super Admin', 'admin@sahaatraders.com', ?, 'super_admin', true)
      ON DUPLICATE KEY UPDATE name = name
    `, [hashedPassword]);

    // Create default stock location
    await connection.query(`
      INSERT INTO stock_locations (name, address, is_default, is_active)
      VALUES ('Main Warehouse', 'Default Location', true, true)
      ON DUPLICATE KEY UPDATE name = name
    `);

    // Create sample categories
    const categories = [
      { name: 'Spices', slug: 'spices', description: 'Premium quality spices' },
      { name: 'Oils', slug: 'oils', description: 'Pure cooking oils' },
      { name: 'Grains & Pulses', slug: 'grains-pulses', description: 'Whole grains and pulses' },
      { name: 'Dry Fruits', slug: 'dry-fruits', description: 'Premium dry fruits and nuts' }
    ];

    for (const cat of categories) {
      await connection.query(`
        INSERT INTO categories (name, slug, description, is_active)
        VALUES (?, ?, ?, true)
        ON DUPLICATE KEY UPDATE name = name
      `, [cat.name, cat.slug, cat.description]);
    }

    // Create sample products
    const products = [
      {
        sku: 'CUM001',
        name: 'Cumin Seeds',
        slug: 'cumin-seeds',
        description: 'Premium quality cumin seeds, perfect for Indian cooking',
        category: 'spices',
        variants: [
          { sku: 'CUM001-100G', name: '100g Pack', buy: 25, sell: 40, weight: 100 },
          { sku: 'CUM001-250G', name: '250g Pack', buy: 60, sell: 95, weight: 250 },
          { sku: 'CUM001-500G', name: '500g Pack', buy: 115, sell: 180, weight: 500 }
        ]
      },
      {
        sku: 'PEP001',
        name: 'Black Pepper',
        slug: 'black-pepper',
        description: 'Aromatic black pepper corns',
        category: 'spices',
        variants: [
          { sku: 'PEP001-100G', name: '100g Pack', buy: 80, sell: 120, weight: 100 },
          { sku: 'PEP001-250G', name: '250g Pack', buy: 190, sell: 280, weight: 250 }
        ]
      },
      {
        sku: 'TUR001',
        name: 'Turmeric Powder',
        slug: 'turmeric-powder',
        description: 'Pure turmeric powder with rich golden color',
        category: 'spices',
        variants: [
          { sku: 'TUR001-100G', name: '100g Pack', buy: 20, sell: 35, weight: 100 },
          { sku: 'TUR001-500G', name: '500g Pack', buy: 90, sell: 150, weight: 500 }
        ]
      },
      {
        sku: 'OIL001',
        name: 'Groundnut Oil',
        slug: 'groundnut-oil',
        description: 'Pure cold-pressed groundnut oil',
        category: 'oils',
        variants: [
          { sku: 'OIL001-1L', name: '1 Litre', buy: 180, sell: 250, weight: 1000 },
          { sku: 'OIL001-5L', name: '5 Litre', buy: 850, sell: 1150, weight: 5000 }
        ]
      },
      {
        sku: 'ALM001',
        name: 'California Almonds',
        slug: 'california-almonds',
        description: 'Premium California almonds, rich in nutrients',
        category: 'dry-fruits',
        variants: [
          { sku: 'ALM001-250G', name: '250g Pack', buy: 280, sell: 400, weight: 250 },
          { sku: 'ALM001-500G', name: '500g Pack', buy: 540, sell: 750, weight: 500 }
        ]
      }
    ];

    for (const prod of products) {
      // Get category ID
      const [catRows] = await connection.query('SELECT id FROM categories WHERE slug = ?', [prod.category]);
      const categoryId = catRows[0]?.id;

      // Insert product
      const [result] = await connection.query(`
        INSERT INTO products (sku, name, slug, description, category_id, type, is_active)
        VALUES (?, ?, ?, ?, ?, 'inhouse', true)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, [prod.sku, prod.name, prod.slug, prod.description, categoryId]);

      // Get product ID
      const [prodRows] = await connection.query('SELECT id FROM products WHERE sku = ?', [prod.sku]);
      const productId = prodRows[0]?.id;

      // Insert variants
      for (const v of prod.variants) {
        await connection.query(`
          INSERT INTO product_variants (product_id, sku, variant_name, buy_price, sell_price, stock_qty, weight, weight_unit, is_active)
          VALUES (?, ?, ?, ?, ?, 100, ?, 'g', true)
          ON DUPLICATE KEY UPDATE variant_name = VALUES(variant_name)
        `, [productId, v.sku, v.name, v.buy, v.sell, v.weight]);
      }
    }

    // Insert default settings
    const settings = [
      { key: 'company_name', value: 'Sahaa Traders', type: 'string' },
      { key: 'company_email', value: 'contact@sahaatraders.com', type: 'string' },
      { key: 'company_phone', value: '+91 98765 43210', type: 'string' },
      { key: 'company_address', value: '123 Market Street, City, State - 123456', type: 'string' },
      { key: 'currency', value: 'INR', type: 'string' },
      { key: 'currency_symbol', value: '₹', type: 'string' },
      { key: 'tax_rate', value: '18', type: 'number' },
      { key: 'low_stock_threshold', value: '10', type: 'number' }
    ];

    for (const s of settings) {
      await connection.query(`
        INSERT INTO settings (setting_key, setting_value, setting_type)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
      `, [s.key, s.value, s.type]);
    }

    // Insert sample site content
    await connection.query(`
      INSERT INTO site_content (slug, title, content, meta_title, is_published)
      VALUES
        ('about', 'About Us', '<p>Welcome to Sahaa Traders, your trusted partner for quality spices and grocery items.</p>', 'About Us - Sahaa Traders', true),
        ('contact', 'Contact Us', '<p>Get in touch with us for any queries.</p>', 'Contact Us - Sahaa Traders', true)
      ON DUPLICATE KEY UPDATE title = VALUES(title)
    `);

    console.log('Seed data inserted successfully!');
    console.log('Default admin login: admin@sahaatraders.com / admin123');
  } catch (error) {
    console.error('Seeding failed:', error.message);
  } finally {
    await connection.end();
  }
}

seed();
