require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedComplete() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders'
  });

  try {
    console.log('Starting complete data seed...\n');

    // ==================== MORE SALES ORDERS (50 orders) ====================
    console.log('Creating 50 Sales Orders...');

    const customerNames = [
      'Arun Mehta', 'Sunita Devi', 'Vikram Rathore', 'Kavita Sharma', 'Rajesh Gupta',
      'Priya Verma', 'Sanjay Kumar', 'Meena Agarwal', 'Deepak Singh', 'Anita Joshi',
      'Ramesh Chand', 'Geeta Rani', 'Mahesh Yadav', 'Savita Kumari', 'Suresh Patel',
      'Kamla Devi', 'Rakesh Sharma', 'Pooja Gupta', 'Vikas Jain', 'Neelam Singh'
    ];

    const cities = ['Jaipur', 'Delhi', 'Mumbai', 'Jodhpur', 'Udaipur', 'Ajmer', 'Kota', 'Bikaner'];
    const statuses = ['enquiry', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];
    const sources = ['website', 'phone', 'walk_in'];

    // Get variant IDs
    const [variants] = await connection.query('SELECT id, sell_price FROM product_variants');
    const [users] = await connection.query('SELECT id FROM users LIMIT 5');

    for (let i = 6; i <= 55; i++) {
      const orderNum = `SO-2025${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(i).padStart(4, '0')}`;
      const customer = customerNames[Math.floor(Math.random() * customerNames.length)];
      const city = cities[Math.floor(Math.random() * cities.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const source = sources[Math.floor(Math.random() * sources.length)];

      const subtotal = Math.floor(Math.random() * 5000) + 500;
      const tax = Math.round(subtotal * 0.05);
      const shipping = subtotal > 500 ? 0 : 50;
      const total = subtotal + tax + shipping;

      const daysAgo = Math.floor(Math.random() * 60);

      try {
        await connection.query(`
          INSERT INTO sales_orders (order_number, customer_name, customer_phone, customer_email, status, subtotal, tax_amount, shipping_amount, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, source, assigned_to, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Rajasthan', ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
        `, [
          orderNum,
          customer,
          `+91 98${Math.floor(Math.random() * 90000000 + 10000000)}`,
          `${customer.toLowerCase().replace(' ', '.')}@gmail.com`,
          status,
          subtotal, tax, shipping, total,
          `${Math.floor(Math.random() * 999) + 1}, ${city}`,
          city,
          `30${Math.floor(Math.random() * 90) + 1}0${Math.floor(Math.random() * 10)}`,
          source,
          users[Math.floor(Math.random() * users.length)]?.id,
          daysAgo
        ]);

        // Get order ID and add items
        const [orderResult] = await connection.query('SELECT id FROM sales_orders WHERE order_number = ?', [orderNum]);
        if (orderResult[0]) {
          const numItems = Math.floor(Math.random() * 4) + 1;
          for (let j = 0; j < numItems; j++) {
            const variant = variants[Math.floor(Math.random() * variants.length)];
            const qty = Math.floor(Math.random() * 5) + 1;
            await connection.query(`
              INSERT INTO sales_order_items (sales_order_id, variant_id, quantity, unit_price, tax_percent, total_line)
              VALUES (?, ?, ?, ?, 5, ?)
            `, [orderResult[0].id, variant.id, qty, variant.sell_price, qty * variant.sell_price * 1.05]);
          }
        }
      } catch (e) {
        // Skip duplicate order numbers
      }
    }
    console.log('✓ 50 Sales Orders created');

    // ==================== MORE PURCHASE ORDERS (20 POs) ====================
    console.log('Creating 20 Purchase Orders...');

    const [suppliers] = await connection.query('SELECT id FROM suppliers');
    const poStatuses = ['draft', 'ordered', 'partial', 'received'];

    for (let i = 4; i <= 23; i++) {
      const poNum = `PO-2025${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(i).padStart(4, '0')}`;
      const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const status = poStatuses[Math.floor(Math.random() * poStatuses.length)];
      const total = Math.floor(Math.random() * 50000) + 5000;
      const daysAgo = Math.floor(Math.random() * 45);

      try {
        await connection.query(`
          INSERT INTO purchase_orders (po_number, supplier_id, status, subtotal, tax_amount, total_amount, expected_date, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, DATE_ADD(DATE_SUB(NOW(), INTERVAL ? DAY), INTERVAL 7 DAY), 1, DATE_SUB(NOW(), INTERVAL ? DAY))
        `, [poNum, supplier.id, status, total * 0.95, total * 0.05, total, daysAgo, daysAgo]);

        // Get PO ID and add items
        const [poResult] = await connection.query('SELECT id FROM purchase_orders WHERE po_number = ?', [poNum]);
        if (poResult[0]) {
          const numItems = Math.floor(Math.random() * 5) + 2;
          for (let j = 0; j < numItems; j++) {
            const variant = variants[Math.floor(Math.random() * variants.length)];
            const qty = Math.floor(Math.random() * 50) + 10;
            const buyPrice = Math.floor(Math.random() * 200) + 50;
            await connection.query(`
              INSERT INTO purchase_order_items (po_id, variant_id, quantity, unit_price, tax_percent, total_line)
              VALUES (?, ?, ?, ?, 5, ?)
            `, [poResult[0].id, variant.id, qty, buyPrice, qty * buyPrice * 1.05]);
          }
        }
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('✓ 20 Purchase Orders created');

    // ==================== MORE INVOICES (30 invoices) ====================
    console.log('Creating 30 Invoices...');

    const [deliveredOrders] = await connection.query(`
      SELECT id, total_amount, customer_name FROM sales_orders
      WHERE status IN ('delivered', 'shipped') AND id NOT IN (SELECT sales_order_id FROM invoices WHERE sales_order_id IS NOT NULL)
      LIMIT 30
    `);

    const invoiceStatuses = ['draft', 'issued', 'paid', 'partial', 'overdue'];

    for (let i = 0; i < deliveredOrders.length; i++) {
      const order = deliveredOrders[i];
      const invNum = `INV-2025${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(i + 3).padStart(4, '0')}`;
      const status = invoiceStatuses[Math.floor(Math.random() * invoiceStatuses.length)];
      const daysAgo = Math.floor(Math.random() * 30);
      const paidAmount = status === 'paid' ? order.total_amount : (status === 'partial' ? order.total_amount * 0.5 : 0);

      try {
        await connection.query(`
          INSERT INTO invoices (invoice_number, sales_order_id, invoice_date, due_date, subtotal, tax_amount, total_amount, paid_amount, status, created_by, created_at)
          VALUES (?, ?, DATE_SUB(NOW(), INTERVAL ? DAY), DATE_ADD(DATE_SUB(NOW(), INTERVAL ? DAY), INTERVAL 15 DAY), ?, ?, ?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL ? DAY))
        `, [invNum, order.id, daysAgo, daysAgo, order.total_amount * 0.95, order.total_amount * 0.05, order.total_amount, paidAmount, status, daysAgo]);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('✓ 30 Invoices created');

    // ==================== MORE PAYMENTS (40 payments) ====================
    console.log('Creating 40 Payments...');

    const [paidInvoices] = await connection.query(`
      SELECT id, total_amount, paid_amount FROM invoices WHERE status IN ('paid', 'partial')
    `);

    const paymentMethods = ['cash', 'bank_transfer', 'upi', 'cheque', 'card'];

    for (const inv of paidInvoices) {
      const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
      const daysAgo = Math.floor(Math.random() * 25);

      try {
        await connection.query(`
          INSERT INTO payments (invoice_id, payment_date, amount, payment_method, reference, created_by, created_at)
          VALUES (?, DATE_SUB(NOW(), INTERVAL ? DAY), ?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL ? DAY))
        `, [inv.id, daysAgo, inv.paid_amount, method, `TXN${Math.floor(Math.random() * 1000000)}`, daysAgo]);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('✓ Payments created');

    // ==================== MORE ENQUIRIES (25 enquiries) ====================
    console.log('Creating 25 Enquiries...');

    const enquiryMessages = [
      'Looking for bulk pricing on cumin seeds for my restaurant.',
      'Do you deliver to Bangalore? I need regular supply.',
      'What is the shelf life of your ground spices?',
      'Can I get a discount for wholesale orders?',
      'Need organic turmeric powder. Do you have it?',
      'When will black pepper be back in stock?',
      'Do you accept credit for regular customers?',
      'Looking for premium quality saffron.',
      'Need quotation for 50kg rice order.',
      'Can you ship to international locations?',
      'What are your payment terms for businesses?',
      'Need COD for first order. Is it possible?',
      'Looking for gift packing options for dry fruits.',
      'Do you have any ongoing festival offers?',
      'Need urgent delivery within 24 hours. Possible?'
    ];

    const enquiryStatuses = ['new', 'in_progress', 'responded', 'converted', 'closed'];
    const enquiryTypes = ['product', 'order', 'general'];

    for (let i = 6; i <= 30; i++) {
      const name = customerNames[Math.floor(Math.random() * customerNames.length)];
      const message = enquiryMessages[Math.floor(Math.random() * enquiryMessages.length)];
      const status = enquiryStatuses[Math.floor(Math.random() * enquiryStatuses.length)];
      const type = enquiryTypes[Math.floor(Math.random() * enquiryTypes.length)];
      const daysAgo = Math.floor(Math.random() * 30);

      await connection.query(`
        INSERT INTO enquiries (name, email, phone, type, message, status, assigned_to, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
      `, [
        name,
        `${name.toLowerCase().replace(' ', '.')}@gmail.com`,
        `+91 99${Math.floor(Math.random() * 90000000 + 10000000)}`,
        type,
        message,
        status,
        users[Math.floor(Math.random() * users.length)]?.id,
        daysAgo
      ]);
    }
    console.log('✓ 25 Enquiries created');

    // ==================== MORE RETURNS (15 returns) ====================
    console.log('Creating 15 Returns...');

    const [deliveredForReturns] = await connection.query(`
      SELECT so.id, so.order_number, soi.variant_id, soi.unit_price
      FROM sales_orders so
      JOIN sales_order_items soi ON so.id = soi.sales_order_id
      WHERE so.status = 'delivered'
      LIMIT 15
    `);

    const returnReasons = [
      'Product damaged during shipping',
      'Received wrong item',
      'Quality not as expected',
      'Expired product received',
      'Package was opened/tampered',
      'Size/variant was incorrect'
    ];

    const returnStatuses = ['pending', 'approved', 'rejected', 'completed'];

    for (let i = 0; i < deliveredForReturns.length; i++) {
      const order = deliveredForReturns[i];
      const retNum = `RET-2025${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-${String(i + 2).padStart(4, '0')}`;
      const reason = returnReasons[Math.floor(Math.random() * returnReasons.length)];
      const status = returnStatuses[Math.floor(Math.random() * returnStatuses.length)];
      const qty = Math.floor(Math.random() * 2) + 1;
      const daysAgo = Math.floor(Math.random() * 20);

      try {
        await connection.query(`
          INSERT INTO returns (return_number, sales_order_id, variant_id, quantity, reason, status, refund_amount, restock, created_by, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, true, 1, DATE_SUB(NOW(), INTERVAL ? DAY))
        `, [retNum, order.id, order.variant_id, qty, reason, status, qty * order.unit_price, daysAgo]);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('✓ 15 Returns created');

    // ==================== STOCK MOVEMENTS (100 movements) ====================
    console.log('Creating 100 Stock Movements...');

    const movementReasons = ['purchase_receipt', 'sale', 'adjustment', 'return', 'damage', 'initial'];

    for (let i = 0; i < 100; i++) {
      const variant = variants[Math.floor(Math.random() * variants.length)];
      const reason = movementReasons[Math.floor(Math.random() * movementReasons.length)];
      const changeQty = reason === 'sale' || reason === 'damage'
        ? -Math.floor(Math.random() * 10 + 1)
        : Math.floor(Math.random() * 50 + 1);
      const daysAgo = Math.floor(Math.random() * 60);

      await connection.query(`
        INSERT INTO stock_movements (variant_id, location_id, change_qty, reason, notes, created_by, created_at)
        VALUES (?, 1, ?, ?, ?, 1, DATE_SUB(NOW(), INTERVAL ? DAY))
      `, [variant.id, changeQty, reason, `Stock ${reason} - auto generated`, daysAgo]);
    }
    console.log('✓ 100 Stock Movements created');

    // ==================== MORE CUSTOMERS (20 customers) ====================
    console.log('Creating 20 more Customers...');

    const customerPassword = await bcrypt.hash('customer123', 10);

    for (let i = 6; i <= 25; i++) {
      const name = customerNames[Math.floor(Math.random() * customerNames.length)] + ` ${i}`;
      const city = cities[Math.floor(Math.random() * cities.length)];

      try {
        await connection.query(`
          INSERT INTO customers (name, email, phone, password, address, is_active)
          VALUES (?, ?, ?, ?, ?, true)
        `, [
          name,
          `customer${i}@example.com`,
          `+91 87${Math.floor(Math.random() * 90000000 + 10000000)}`,
          customerPassword,
          `${Math.floor(Math.random() * 500) + 1}, ${city}, Rajasthan`
        ]);
      } catch (e) {
        // Skip duplicates
      }
    }
    console.log('✓ 20 Customers created');

    // ==================== AUDIT LOGS (50 logs) ====================
    console.log('Creating 50 Audit Logs...');

    const actions = ['create', 'update', 'delete', 'login', 'logout'];
    const entityTypes = ['product', 'sales_order', 'purchase_order', 'invoice', 'payment', 'user', 'settings', 'category', 'auth'];

    for (let i = 0; i < 50; i++) {
      const action = actions[Math.floor(Math.random() * actions.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      const user = users[Math.floor(Math.random() * users.length)];
      const daysAgo = Math.floor(Math.random() * 30);

      await connection.query(`
        INSERT INTO audit_logs (user_id, action, entity_type, entity_id, ip_address, created_at)
        VALUES (?, ?, ?, ?, ?, DATE_SUB(NOW(), INTERVAL ? DAY))
      `, [
        user?.id || 1,
        action,
        entityType,
        Math.floor(Math.random() * 100) + 1,
        `192.168.1.${Math.floor(Math.random() * 255)}`,
        daysAgo
      ]);
    }
    console.log('✓ 50 Audit Logs created');

    // ==================== CUSTOMER WISHLIST ====================
    console.log('Creating Customer Wishlists...');

    const [customers] = await connection.query('SELECT id FROM customers LIMIT 10');
    const [products] = await connection.query('SELECT id FROM products');

    for (const customer of customers) {
      const numWishlist = Math.floor(Math.random() * 5) + 1;
      for (let i = 0; i < numWishlist; i++) {
        const product = products[Math.floor(Math.random() * products.length)];
        try {
          await connection.query(`
            INSERT INTO customer_wishlist (customer_id, product_id)
            VALUES (?, ?)
          `, [customer.id, product.id]);
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    console.log('✓ Customer Wishlists created');

    // ==================== SUPPLIER PRODUCTS ====================
    console.log('Creating Supplier-Product Mappings...');

    for (const supplier of suppliers) {
      const numProducts = Math.floor(Math.random() * 10) + 5;
      const shuffledVariants = [...variants].sort(() => Math.random() - 0.5);

      for (let i = 0; i < Math.min(numProducts, shuffledVariants.length); i++) {
        const variant = shuffledVariants[i];
        const [variantInfo] = await connection.query('SELECT product_id FROM product_variants WHERE id = ?', [variant.id]);

        try {
          await connection.query(`
            INSERT INTO supplier_products (supplier_id, product_id, variant_id, supplier_sku, supplier_buy_price, is_preferred)
            VALUES (?, ?, ?, ?, ?, ?)
          `, [
            supplier.id,
            variantInfo[0]?.product_id,
            variant.id,
            `SUP${supplier.id}-${variant.id}`,
            variant.sell_price * 0.6,
            Math.random() > 0.7
          ]);
        } catch (e) {
          // Skip duplicates
        }
      }
    }
    console.log('✓ Supplier-Product Mappings created');

    // ==================== SUMMARY ====================
    console.log('\n========================================');
    console.log('✓ Complete data seed finished!');
    console.log('========================================\n');

    // Print summary counts
    const tables = [
      'users', 'customers', 'categories', 'products', 'product_variants',
      'suppliers', 'sales_orders', 'purchase_orders', 'invoices', 'payments',
      'returns', 'enquiries', 'coupons', 'stock_movements', 'audit_logs'
    ];

    console.log('Data Summary:');
    console.log('-------------');
    for (const table of tables) {
      const [count] = await connection.query(`SELECT COUNT(*) as cnt FROM ${table}`);
      console.log(`${table}: ${count[0].cnt} records`);
    }

    console.log('\n========================================');
    console.log('Application URLs:');
    console.log('  Backend API:  https://api.sahatraders.in');
    console.log('  Public Site:  http://localhost:3000');
    console.log('  Admin Panel:  http://localhost:3001');
    console.log('========================================\n');

  } catch (error) {
    console.error('Seeding failed:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

seedComplete();
