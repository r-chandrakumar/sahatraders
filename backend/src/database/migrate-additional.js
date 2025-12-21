require('dotenv').config();
const mysql = require('mysql2/promise');

async function migrateAdditional() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    multipleStatements: true
  });

  try {
    console.log('Running additional migrations...');

    // Customers table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customers (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(20) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        address TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        last_login DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created customers table');

    // Customer addresses
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_addresses (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        label VARCHAR(50) DEFAULT 'Home',
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(100) NOT NULL,
        state VARCHAR(100) NOT NULL,
        pincode VARCHAR(10) NOT NULL,
        is_default BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
      )
    `);
    console.log('Created customer_addresses table');

    // Customer wishlist
    await connection.query(`
      CREATE TABLE IF NOT EXISTS customer_wishlist (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY (customer_id, product_id),
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      )
    `);
    console.log('Created customer_wishlist table');

    // Carts table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS carts (
        id INT PRIMARY KEY AUTO_INCREMENT,
        customer_id INT,
        coupon_id INT,
        coupon_discount DECIMAL(10,2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      )
    `);
    console.log('Created carts table');

    // Cart items
    await connection.query(`
      CREATE TABLE IF NOT EXISTS cart_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        cart_id INT NOT NULL,
        variant_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE
      )
    `);
    console.log('Created cart_items table');

    // Coupons table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id INT PRIMARY KEY AUTO_INCREMENT,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        discount_type ENUM('percentage', 'fixed') NOT NULL,
        discount_value DECIMAL(10,2) NOT NULL,
        min_order_amount DECIMAL(10,2),
        max_discount DECIMAL(10,2),
        usage_limit INT,
        usage_count INT DEFAULT 0,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created coupons table');

    // Return items table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS return_items (
        id INT PRIMARY KEY AUTO_INCREMENT,
        return_id INT NOT NULL,
        variant_id INT NOT NULL,
        quantity INT NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        FOREIGN KEY (return_id) REFERENCES returns(id) ON DELETE CASCADE,
        FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      )
    `);
    console.log('Created return_items table');

    // Tax rates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS tax_rates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        rate DECIMAL(5,2) NOT NULL,
        type ENUM('inclusive', 'exclusive') DEFAULT 'inclusive',
        is_default BOOLEAN DEFAULT FALSE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created tax_rates table');

    // Payment methods table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        description TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INT DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('Created payment_methods table');

    // Email templates table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id INT PRIMARY KEY AUTO_INCREMENT,
        name VARCHAR(100) NOT NULL,
        code VARCHAR(50) UNIQUE NOT NULL,
        subject VARCHAR(255) NOT NULL,
        body_html TEXT,
        body_text TEXT,
        variables TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('Created email_templates table');

    // Add customer_id to sales_orders if not exists
    try {
      await connection.query(`
        ALTER TABLE sales_orders ADD COLUMN customer_id INT AFTER id,
        ADD COLUMN razorpay_order_id VARCHAR(100),
        ADD COLUMN razorpay_payment_id VARCHAR(100),
        ADD COLUMN coupon_id INT,
        ADD FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
      `);
      console.log('Updated sales_orders table');
    } catch (e) {
      // Column might already exist
    }

    // Add columns to returns table
    try {
      await connection.query(`
        ALTER TABLE returns
        ADD COLUMN rejection_reason TEXT AFTER notes,
        ADD COLUMN processed_by INT,
        ADD COLUMN processed_at DATETIME,
        ADD COLUMN created_by INT
      `);
      console.log('Updated returns table');
    } catch (e) {
      // Columns might already exist
    }

    // Insert default tax rates
    await connection.query(`
      INSERT IGNORE INTO tax_rates (name, rate, type, is_default) VALUES
      ('GST 5%', 5.00, 'inclusive', 0),
      ('GST 12%', 12.00, 'inclusive', 0),
      ('GST 18%', 18.00, 'inclusive', 1),
      ('GST 28%', 28.00, 'inclusive', 0)
    `);
    console.log('Inserted default tax rates');

    // Insert default payment methods
    await connection.query(`
      INSERT IGNORE INTO payment_methods (name, code, sort_order) VALUES
      ('Cash', 'cash', 1),
      ('Bank Transfer', 'bank_transfer', 2),
      ('UPI', 'upi', 3),
      ('Cheque', 'cheque', 4),
      ('Credit (Pay Later)', 'credit', 5),
      ('Razorpay', 'razorpay', 6)
    `);
    console.log('Inserted default payment methods');

    // Insert default email templates
    await connection.query(`
      INSERT IGNORE INTO email_templates (name, code, subject, variables) VALUES
      ('Order Confirmation', 'order_confirmation', 'Order Confirmation - {{order_number}}', 'order_number,customer_name,items,total'),
      ('Order Shipped', 'order_shipped', 'Your Order Has Shipped - {{order_number}}', 'order_number,customer_name,tracking_number'),
      ('Order Delivered', 'order_delivered', 'Order Delivered - {{order_number}}', 'order_number,customer_name'),
      ('Invoice', 'invoice', 'Invoice {{invoice_number}} - Sahaa Traders', 'invoice_number,customer_name,total'),
      ('Payment Received', 'payment_received', 'Payment Received - {{invoice_number}}', 'invoice_number,amount,payment_method'),
      ('Low Stock Alert', 'low_stock_alert', 'Low Stock Alert - Action Required', 'items'),
      ('Enquiry Auto Reply', 'enquiry_auto_reply', 'Thank you for your enquiry - Sahaa Traders', 'customer_name,message')
    `);
    console.log('Inserted default email templates');

    // Insert default settings
    await connection.query(`
      INSERT IGNORE INTO settings (setting_key, setting_value, setting_group, is_public) VALUES
      ('store_name', 'Sahaa Traders', 'general', 1),
      ('store_tagline', 'Quality Groceries Since 1990', 'general', 1),
      ('store_email', 'contact@sahaatraders.com', 'general', 1),
      ('store_phone', '+91 98765 43210', 'general', 1),
      ('store_address', '123 Market Street, Jaipur, Rajasthan - 302001', 'general', 1),
      ('currency', 'INR', 'business', 1),
      ('currency_symbol', '₹', 'business', 1),
      ('default_tax_rate', '18', 'business', 0),
      ('low_stock_threshold', '10', 'business', 0),
      ('free_shipping_threshold', '1000', 'shipping', 1),
      ('default_shipping_charge', '50', 'shipping', 1),
      ('razorpay_enabled', 'true', 'payment', 0)
    `);
    console.log('Inserted default settings');

    // Insert sample coupons
    await connection.query(`
      INSERT IGNORE INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, is_active) VALUES
      ('WELCOME10', 'Welcome discount - 10% off on first order', 'percentage', 10.00, 500, 200, 1),
      ('FLAT100', 'Flat Rs.100 off on orders above Rs.1000', 'fixed', 100.00, 1000, NULL, 1),
      ('SAVE20', '20% off on orders above Rs.2000', 'percentage', 20.00, 2000, 500, 1)
    `);
    console.log('Inserted sample coupons');

    console.log('Additional migrations completed successfully!');
  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await connection.end();
  }
}

migrateAdditional();
