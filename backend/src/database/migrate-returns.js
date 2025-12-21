require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateReturns() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders',
    multipleStatements: true
  });

  try {
    console.log('Starting returns table migration...');

    // Disable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 0');

    // Check if returns table exists and has the old schema
    const [tables] = await connection.query("SHOW TABLES LIKE 'returns'");

    if (tables.length > 0) {
      // Check if it has the old schema (variant_id column)
      const [columns] = await connection.query("SHOW COLUMNS FROM returns LIKE 'variant_id'");

      if (columns.length > 0) {
        console.log('Dropping old returns table...');
        await connection.query('DROP TABLE IF EXISTS returns');
      }
    }

    // Drop return_items if exists (to recreate with correct schema)
    await connection.query('DROP TABLE IF EXISTS return_items');

    // Create new returns table
    console.log('Creating returns table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS returns (
        id INT PRIMARY KEY AUTO_INCREMENT,
        return_number VARCHAR(50) UNIQUE NOT NULL,
        sales_order_id INT NOT NULL,
        type ENUM('return', 'credit_note') DEFAULT 'return',
        reason TEXT,
        notes TEXT,
        status ENUM('pending', 'approved', 'rejected', 'processed', 'completed') DEFAULT 'pending',
        total_amount DECIMAL(12,2) DEFAULT 0,
        refund_amount DECIMAL(12,2),
        rejection_reason TEXT,
        processed_by INT,
        processed_at TIMESTAMP NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (sales_order_id) REFERENCES sales_orders(id) ON DELETE RESTRICT,
        FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    // Create return_items table
    console.log('Creating return_items table...');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        return_id INT NOT NULL,
        variant_id INT NOT NULL,
        quantity DECIMAL(10,2) NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        refund_amount DECIMAL(12,2),
        reason TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
      )
    `);

    // Re-enable foreign key checks
    await connection.query('SET FOREIGN_KEY_CHECKS = 1');

    console.log('Returns migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
  } finally {
    await connection.end();
  }
}

migrateReturns();
