require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateEnquiryItems() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Running enquiry items migration...');

    // Create enquiry_items table for storing multiple products with quantities
    await connection.query(`
      CREATE TABLE IF NOT EXISTS enquiry_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        enquiry_id INT NOT NULL,
        variant_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        unit_price DECIMAL(10,2),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (enquiry_id) REFERENCES enquiries(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
      )
    `);
    console.log('Created enquiry_items table');

    // Add address column to enquiries if not exists
    try {
      await connection.query(`
        ALTER TABLE enquiries ADD COLUMN address TEXT AFTER message
      `);
      console.log('Added address column to enquiries');
    } catch (e) {
      console.log('Address column might already exist');
    }

    // Add estimated_total column to enquiries if not exists
    try {
      await connection.query(`
        ALTER TABLE enquiries ADD COLUMN estimated_total DECIMAL(12,2) DEFAULT 0 AFTER address
      `);
      console.log('Added estimated_total column to enquiries');
    } catch (e) {
      console.log('estimated_total column might already exist');
    }

    console.log('Enquiry items migration completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await connection.end();
  }
}

migrateEnquiryItems();
