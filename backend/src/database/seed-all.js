require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function seedAll() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders'
  });

  try {
    console.log('Starting comprehensive seed...\n');

    // ==================== USERS ====================
    console.log('Seeding Users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const userPassword = await bcrypt.hash('user123', 10);

    await connection.query(`
      INSERT INTO users (name, email, password_hash, role, phone, is_active) VALUES
      ('Super Admin', 'admin@sahaatraders.com', ?, 'super_admin', '+91 9876543210', true),
      ('Rahul Sharma', 'rahul@sahaatraders.com', ?, 'admin', '+91 9876543211', true),
      ('Priya Gupta', 'priya@sahaatraders.com', ?, 'inventory_manager', '+91 9876543212', true),
      ('Amit Kumar', 'amit@sahaatraders.com', ?, 'sales_clerk', '+91 9876543213', true),
      ('Neha Singh', 'neha@sahaatraders.com', ?, 'sales_clerk', '+91 9876543214', true)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [adminPassword, userPassword, userPassword, userPassword, userPassword]);
    console.log('✓ Users created');

    // ==================== STOCK LOCATIONS ====================
    console.log('Seeding Stock Locations...');
    await connection.query(`
      INSERT INTO stock_locations (name, address, is_default, is_active) VALUES
      ('Main Warehouse', '123 Industrial Area, Jaipur', true, true),
      ('Store Front', '456 Market Street, Jaipur', false, true),
      ('Cold Storage', '789 Storage Complex, Jaipur', false, true)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✓ Stock Locations created');

    // ==================== CATEGORIES ====================
    console.log('Seeding Categories...');
    await connection.query(`
      INSERT INTO categories (name, slug, description, image_url, is_active, sort_order) VALUES
      ('Whole Spices', 'whole-spices', 'Premium whole spices for authentic flavor', '/images/categories/whole-spices.jpg', true, 1),
      ('Ground Spices', 'ground-spices', 'Freshly ground spice powders', '/images/categories/ground-spices.jpg', true, 2),
      ('Cooking Oils', 'cooking-oils', 'Pure and healthy cooking oils', '/images/categories/cooking-oils.jpg', true, 3),
      ('Pulses & Lentils', 'pulses-lentils', 'Protein-rich pulses and lentils', '/images/categories/pulses.jpg', true, 4),
      ('Rice & Grains', 'rice-grains', 'Premium rice and grain varieties', '/images/categories/rice.jpg', true, 5),
      ('Dry Fruits & Nuts', 'dry-fruits-nuts', 'Premium dry fruits and nuts', '/images/categories/dry-fruits.jpg', true, 6),
      ('Flours', 'flours', 'Fresh stone-ground flours', '/images/categories/flours.jpg', true, 7),
      ('Sugar & Jaggery', 'sugar-jaggery', 'Natural sweeteners', '/images/categories/sugar.jpg', true, 8)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✓ Categories created');

    // ==================== SUPPLIERS ====================
    console.log('Seeding Suppliers...');
    await connection.query(`
      INSERT INTO suppliers (name, contact_person, phone, email, address, city, state, pincode, gst_number, payment_terms, is_active) VALUES
      ('Rajasthan Spice Mills', 'Mukesh Agarwal', '+91 9412345670', 'sales@rajspice.com', '45 RIICO Industrial Area', 'Jodhpur', 'Rajasthan', '342003', '08AAACR1234A1ZV', 'Net 30', true),
      ('Gujarat Oil Company', 'Ramesh Patel', '+91 9412345671', 'info@gujaratoil.com', '78 GIDC Estate', 'Rajkot', 'Gujarat', '360003', '24AABCG5678B2ZX', 'Net 15', true),
      ('Punjab Grains Pvt Ltd', 'Harpreet Singh', '+91 9412345672', 'punjabgrains@gmail.com', '23 Grain Market', 'Amritsar', 'Punjab', '143001', '03AABCP9012C3ZY', 'Net 45', true),
      ('Kashmir Dry Fruits', 'Abdul Rahman', '+91 9412345673', 'kashmir.dryfruits@gmail.com', '12 Dal Lake Road', 'Srinagar', 'J&K', '190001', '01AABCK3456D4ZZ', 'Advance', true),
      ('South Indian Spices', 'Venkatesh Rao', '+91 9412345674', 'contact@southspices.com', '56 Spice Garden Road', 'Kochi', 'Kerala', '682001', '32AABCS7890E5ZA', 'Net 30', true)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✓ Suppliers created');

    // ==================== PRODUCTS & VARIANTS ====================
    console.log('Seeding Products & Variants...');

    const products = [
      // Whole Spices
      { sku: 'WS001', name: 'Premium Cumin Seeds (Jeera)', slug: 'premium-cumin-seeds', category: 'whole-spices', brand: 'Sahaa', description: 'Hand-picked cumin seeds with strong aroma. Perfect for tempering and seasoning.', variants: [
        { sku: 'WS001-100', name: '100g Pack', buy: 28, sell: 45, stock: 150, weight: 100 },
        { sku: 'WS001-250', name: '250g Pack', buy: 65, sell: 105, stock: 100, weight: 250 },
        { sku: 'WS001-500', name: '500g Pack', buy: 125, sell: 195, stock: 80, weight: 500 },
        { sku: 'WS001-1KG', name: '1kg Pack', buy: 240, sell: 375, stock: 50, weight: 1000 }
      ]},
      { sku: 'WS002', name: 'Black Pepper (Kali Mirch)', slug: 'black-pepper-kali-mirch', category: 'whole-spices', brand: 'Sahaa', description: 'Premium Malabar black pepper with intense flavor and aroma.', variants: [
        { sku: 'WS002-100', name: '100g Pack', buy: 85, sell: 135, stock: 120, weight: 100 },
        { sku: 'WS002-250', name: '250g Pack', buy: 200, sell: 320, stock: 75, weight: 250 },
        { sku: 'WS002-500', name: '500g Pack', buy: 385, sell: 599, stock: 40, weight: 500 }
      ]},
      { sku: 'WS003', name: 'Green Cardamom (Elaichi)', slug: 'green-cardamom-elaichi', category: 'whole-spices', brand: 'Sahaa', description: 'Premium green cardamom pods from Kerala. Adds wonderful aroma to dishes.', variants: [
        { sku: 'WS003-50', name: '50g Pack', buy: 150, sell: 245, stock: 80, weight: 50 },
        { sku: 'WS003-100', name: '100g Pack', buy: 290, sell: 475, stock: 50, weight: 100 }
      ]},
      { sku: 'WS004', name: 'Cinnamon Sticks (Dalchini)', slug: 'cinnamon-sticks-dalchini', category: 'whole-spices', brand: 'Sahaa', description: 'Aromatic Ceylon cinnamon sticks for authentic flavor.', variants: [
        { sku: 'WS004-100', name: '100g Pack', buy: 65, sell: 110, stock: 90, weight: 100 },
        { sku: 'WS004-250', name: '250g Pack', buy: 155, sell: 260, stock: 60, weight: 250 }
      ]},
      { sku: 'WS005', name: 'Cloves (Laung)', slug: 'cloves-laung', category: 'whole-spices', brand: 'Sahaa', description: 'Premium quality cloves with strong aroma.', variants: [
        { sku: 'WS005-50', name: '50g Pack', buy: 75, sell: 125, stock: 70, weight: 50 },
        { sku: 'WS005-100', name: '100g Pack', buy: 145, sell: 240, stock: 45, weight: 100 }
      ]},

      // Ground Spices
      { sku: 'GS001', name: 'Turmeric Powder (Haldi)', slug: 'turmeric-powder-haldi', category: 'ground-spices', brand: 'Sahaa', description: 'Pure turmeric powder with high curcumin content. No artificial colors.', variants: [
        { sku: 'GS001-100', name: '100g Pack', buy: 22, sell: 38, stock: 200, weight: 100 },
        { sku: 'GS001-250', name: '250g Pack', buy: 52, sell: 89, stock: 150, weight: 250 },
        { sku: 'GS001-500', name: '500g Pack', buy: 98, sell: 169, stock: 100, weight: 500 },
        { sku: 'GS001-1KG', name: '1kg Pack', buy: 185, sell: 319, stock: 60, weight: 1000 }
      ]},
      { sku: 'GS002', name: 'Red Chilli Powder (Lal Mirch)', slug: 'red-chilli-powder-lal-mirch', category: 'ground-spices', brand: 'Sahaa', description: 'Medium hot red chilli powder from Kashmiri chillies.', variants: [
        { sku: 'GS002-100', name: '100g Pack', buy: 32, sell: 55, stock: 180, weight: 100 },
        { sku: 'GS002-250', name: '250g Pack', buy: 75, sell: 129, stock: 120, weight: 250 },
        { sku: 'GS002-500', name: '500g Pack', buy: 145, sell: 249, stock: 80, weight: 500 }
      ]},
      { sku: 'GS003', name: 'Coriander Powder (Dhania)', slug: 'coriander-powder-dhania', category: 'ground-spices', brand: 'Sahaa', description: 'Freshly ground coriander powder with earthy flavor.', variants: [
        { sku: 'GS003-100', name: '100g Pack', buy: 18, sell: 32, stock: 160, weight: 100 },
        { sku: 'GS003-250', name: '250g Pack', buy: 42, sell: 75, stock: 100, weight: 250 },
        { sku: 'GS003-500', name: '500g Pack', buy: 80, sell: 139, stock: 70, weight: 500 }
      ]},
      { sku: 'GS004', name: 'Garam Masala', slug: 'garam-masala', category: 'ground-spices', brand: 'Sahaa', description: 'Authentic blend of 13 spices for rich flavor.', variants: [
        { sku: 'GS004-100', name: '100g Pack', buy: 55, sell: 95, stock: 100, weight: 100 },
        { sku: 'GS004-250', name: '250g Pack', buy: 130, sell: 225, stock: 60, weight: 250 }
      ]},

      // Cooking Oils
      { sku: 'OL001', name: 'Cold Pressed Groundnut Oil', slug: 'cold-pressed-groundnut-oil', category: 'cooking-oils', brand: 'Sahaa', description: 'Traditional wood-pressed groundnut oil. Rich in nutrients.', variants: [
        { sku: 'OL001-1L', name: '1 Litre', buy: 185, sell: 299, stock: 100, weight: 1000 },
        { sku: 'OL001-5L', name: '5 Litre Can', buy: 875, sell: 1399, stock: 40, weight: 5000 }
      ]},
      { sku: 'OL002', name: 'Cold Pressed Mustard Oil', slug: 'cold-pressed-mustard-oil', category: 'cooking-oils', brand: 'Sahaa', description: 'Pure mustard oil with pungent aroma. Perfect for pickles.', variants: [
        { sku: 'OL002-1L', name: '1 Litre', buy: 165, sell: 265, stock: 80, weight: 1000 },
        { sku: 'OL002-5L', name: '5 Litre Can', buy: 780, sell: 1249, stock: 30, weight: 5000 }
      ]},
      { sku: 'OL003', name: 'Pure Coconut Oil', slug: 'pure-coconut-oil', category: 'cooking-oils', brand: 'Sahaa', description: 'Virgin coconut oil from Kerala. Great for cooking and hair.', variants: [
        { sku: 'OL003-500', name: '500ml', buy: 145, sell: 239, stock: 60, weight: 500 },
        { sku: 'OL003-1L', name: '1 Litre', buy: 275, sell: 449, stock: 45, weight: 1000 }
      ]},
      { sku: 'OL004', name: 'Desi Ghee (Clarified Butter)', slug: 'desi-ghee', category: 'cooking-oils', brand: 'Sahaa', description: 'Pure cow ghee made from traditional bilona method.', variants: [
        { sku: 'OL004-500', name: '500g Jar', buy: 320, sell: 525, stock: 50, weight: 500 },
        { sku: 'OL004-1KG', name: '1kg Tin', buy: 620, sell: 999, stock: 30, weight: 1000 }
      ]},

      // Pulses & Lentils
      { sku: 'PL001', name: 'Toor Dal (Arhar)', slug: 'toor-dal-arhar', category: 'pulses-lentils', brand: 'Sahaa', description: 'Premium quality toor dal. Cooks soft and tastes great.', variants: [
        { sku: 'PL001-500', name: '500g Pack', buy: 65, sell: 99, stock: 150, weight: 500 },
        { sku: 'PL001-1KG', name: '1kg Pack', buy: 125, sell: 189, stock: 100, weight: 1000 },
        { sku: 'PL001-5KG', name: '5kg Pack', buy: 600, sell: 899, stock: 40, weight: 5000 }
      ]},
      { sku: 'PL002', name: 'Moong Dal (Yellow)', slug: 'moong-dal-yellow', category: 'pulses-lentils', brand: 'Sahaa', description: 'Split yellow moong dal. Easy to digest and nutritious.', variants: [
        { sku: 'PL002-500', name: '500g Pack', buy: 70, sell: 109, stock: 120, weight: 500 },
        { sku: 'PL002-1KG', name: '1kg Pack', buy: 135, sell: 209, stock: 80, weight: 1000 }
      ]},
      { sku: 'PL003', name: 'Chana Dal', slug: 'chana-dal', category: 'pulses-lentils', brand: 'Sahaa', description: 'Split chickpea lentil. Great for dal and sweets.', variants: [
        { sku: 'PL003-500', name: '500g Pack', buy: 55, sell: 85, stock: 130, weight: 500 },
        { sku: 'PL003-1KG', name: '1kg Pack', buy: 105, sell: 159, stock: 90, weight: 1000 }
      ]},
      { sku: 'PL004', name: 'Masoor Dal (Red Lentils)', slug: 'masoor-dal-red', category: 'pulses-lentils', brand: 'Sahaa', description: 'Orange/red lentils that cook quickly.', variants: [
        { sku: 'PL004-500', name: '500g Pack', buy: 60, sell: 95, stock: 110, weight: 500 },
        { sku: 'PL004-1KG', name: '1kg Pack', buy: 115, sell: 179, stock: 70, weight: 1000 }
      ]},

      // Rice & Grains
      { sku: 'RG001', name: 'Premium Basmati Rice', slug: 'premium-basmati-rice', category: 'rice-grains', brand: 'Sahaa', description: 'Aged basmati rice from Punjab. Long grains, amazing aroma.', variants: [
        { sku: 'RG001-1KG', name: '1kg Pack', buy: 120, sell: 189, stock: 100, weight: 1000 },
        { sku: 'RG001-5KG', name: '5kg Pack', buy: 575, sell: 899, stock: 50, weight: 5000 },
        { sku: 'RG001-10KG', name: '10kg Bag', buy: 1100, sell: 1699, stock: 30, weight: 10000 }
      ]},
      { sku: 'RG002', name: 'Sona Masoori Rice', slug: 'sona-masoori-rice', category: 'rice-grains', brand: 'Sahaa', description: 'Light-weight, aromatic rice from South India.', variants: [
        { sku: 'RG002-5KG', name: '5kg Pack', buy: 350, sell: 549, stock: 60, weight: 5000 },
        { sku: 'RG002-10KG', name: '10kg Bag', buy: 680, sell: 1049, stock: 35, weight: 10000 }
      ]},

      // Dry Fruits & Nuts
      { sku: 'DF001', name: 'California Almonds', slug: 'california-almonds', category: 'dry-fruits-nuts', brand: 'Premium', description: 'Premium California almonds. Crunchy and nutritious.', variants: [
        { sku: 'DF001-250', name: '250g Pack', buy: 285, sell: 449, stock: 60, weight: 250 },
        { sku: 'DF001-500', name: '500g Pack', buy: 550, sell: 849, stock: 40, weight: 500 },
        { sku: 'DF001-1KG', name: '1kg Pack', buy: 1050, sell: 1599, stock: 25, weight: 1000 }
      ]},
      { sku: 'DF002', name: 'Premium Cashews (Kaju)', slug: 'premium-cashews-kaju', category: 'dry-fruits-nuts', brand: 'Premium', description: 'Whole white cashews. Perfect for snacking and cooking.', variants: [
        { sku: 'DF002-250', name: '250g Pack', buy: 245, sell: 389, stock: 50, weight: 250 },
        { sku: 'DF002-500', name: '500g Pack', buy: 475, sell: 749, stock: 35, weight: 500 }
      ]},
      { sku: 'DF003', name: 'Raisins (Kishmish)', slug: 'raisins-kishmish', category: 'dry-fruits-nuts', brand: 'Premium', description: 'Golden seedless raisins. Sweet and plump.', variants: [
        { sku: 'DF003-250', name: '250g Pack', buy: 85, sell: 139, stock: 80, weight: 250 },
        { sku: 'DF003-500', name: '500g Pack', buy: 165, sell: 269, stock: 50, weight: 500 }
      ]},
      { sku: 'DF004', name: 'Walnuts (Akhrot)', slug: 'walnuts-akhrot', category: 'dry-fruits-nuts', brand: 'Premium', description: 'Kashmir walnuts. Rich in omega-3.', variants: [
        { sku: 'DF004-250', name: '250g Pack', buy: 195, sell: 319, stock: 45, weight: 250 },
        { sku: 'DF004-500', name: '500g Pack', buy: 375, sell: 599, stock: 30, weight: 500 }
      ]},

      // Flours
      { sku: 'FL001', name: 'Whole Wheat Atta', slug: 'whole-wheat-atta', category: 'flours', brand: 'Sahaa', description: 'Stone-ground whole wheat flour for soft rotis.', variants: [
        { sku: 'FL001-5KG', name: '5kg Pack', buy: 185, sell: 289, stock: 80, weight: 5000 },
        { sku: 'FL001-10KG', name: '10kg Pack', buy: 355, sell: 549, stock: 50, weight: 10000 }
      ]},
      { sku: 'FL002', name: 'Besan (Gram Flour)', slug: 'besan-gram-flour', category: 'flours', brand: 'Sahaa', description: 'Fresh gram flour for pakoras and sweets.', variants: [
        { sku: 'FL002-500', name: '500g Pack', buy: 55, sell: 89, stock: 100, weight: 500 },
        { sku: 'FL002-1KG', name: '1kg Pack', buy: 105, sell: 169, stock: 70, weight: 1000 }
      ]},

      // Sugar & Jaggery
      { sku: 'SJ001', name: 'Organic Jaggery (Gud)', slug: 'organic-jaggery-gud', category: 'sugar-jaggery', brand: 'Sahaa', description: 'Natural jaggery made from sugarcane. No chemicals.', variants: [
        { sku: 'SJ001-500', name: '500g Block', buy: 45, sell: 75, stock: 90, weight: 500 },
        { sku: 'SJ001-1KG', name: '1kg Block', buy: 85, sell: 139, stock: 60, weight: 1000 }
      ]},
      { sku: 'SJ002', name: 'Jaggery Powder', slug: 'jaggery-powder', category: 'sugar-jaggery', brand: 'Sahaa', description: 'Powdered jaggery for easy use in cooking.', variants: [
        { sku: 'SJ002-500', name: '500g Pack', buy: 55, sell: 89, stock: 70, weight: 500 }
      ]}
    ];

    for (const prod of products) {
      const [catRows] = await connection.query('SELECT id FROM categories WHERE slug = ?', [prod.category]);
      const categoryId = catRows[0]?.id;

      await connection.query(`
        INSERT INTO products (sku, name, slug, description, category_id, brand, type, is_active)
        VALUES (?, ?, ?, ?, ?, ?, 'inhouse', true)
        ON DUPLICATE KEY UPDATE name = VALUES(name)
      `, [prod.sku, prod.name, prod.slug, prod.description, categoryId, prod.brand]);

      const [prodRows] = await connection.query('SELECT id FROM products WHERE sku = ?', [prod.sku]);
      const productId = prodRows[0]?.id;

      for (const v of prod.variants) {
        await connection.query(`
          INSERT INTO product_variants (product_id, sku, variant_name, buy_price, sell_price, stock_qty, weight, weight_unit, tax_percent, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, 'g', 5, true)
          ON DUPLICATE KEY UPDATE variant_name = VALUES(variant_name)
        `, [productId, v.sku, v.name, v.buy, v.sell, v.stock, v.weight]);
      }
    }
    console.log('✓ Products & Variants created');

    // ==================== CUSTOMERS ====================
    console.log('Seeding Customers...');
    const customerPassword = await bcrypt.hash('customer123', 10);
    await connection.query(`
      INSERT INTO customers (name, email, phone, password, address, is_active) VALUES
      ('Arun Mehta', 'arun.mehta@gmail.com', '+91 9998887770', ?, '123 Gandhi Nagar, Jaipur, Rajasthan - 302001', true),
      ('Sunita Devi', 'sunita.devi@gmail.com', '+91 9998887771', ?, '456 Vaishali Nagar, Jaipur, Rajasthan - 302021', true),
      ('Vikram Rathore', 'vikram.rathore@gmail.com', '+91 9998887772', ?, '789 Malviya Nagar, Jaipur, Rajasthan - 302017', true),
      ('Kavita Sharma', 'kavita.sharma@gmail.com', '+91 9998887773', ?, '321 Raja Park, Jaipur, Rajasthan - 302004', true),
      ('Rajesh Gupta', 'rajesh.gupta@gmail.com', '+91 9998887774', ?, '654 C-Scheme, Jaipur, Rajasthan - 302001', true)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `, [customerPassword, customerPassword, customerPassword, customerPassword, customerPassword]);
    console.log('✓ Customers created');

    // ==================== SALES ORDERS ====================
    console.log('Seeding Sales Orders...');

    // Get some variant IDs
    const [variants] = await connection.query('SELECT id, sell_price, product_id FROM product_variants LIMIT 10');

    const orders = [
      { number: 'SO-202512-0001', customer: 'Arun Mehta', phone: '+91 9998887770', email: 'arun.mehta@gmail.com', status: 'delivered', address: '123 Gandhi Nagar, Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
      { number: 'SO-202512-0002', customer: 'Sunita Devi', phone: '+91 9998887771', email: 'sunita.devi@gmail.com', status: 'shipped', address: '456 Vaishali Nagar, Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302021' },
      { number: 'SO-202512-0003', customer: 'Vikram Rathore', phone: '+91 9998887772', email: 'vikram.rathore@gmail.com', status: 'processing', address: '789 Malviya Nagar, Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302017' },
      { number: 'SO-202512-0004', customer: 'Kavita Sharma', phone: '+91 9998887773', email: 'kavita.sharma@gmail.com', status: 'confirmed', address: '321 Raja Park, Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302004' },
      { number: 'SO-202512-0005', customer: 'Rajesh Gupta', phone: '+91 9998887774', email: 'rajesh.gupta@gmail.com', status: 'enquiry', address: '654 C-Scheme, Jaipur', city: 'Jaipur', state: 'Rajasthan', pincode: '302001' },
    ];

    for (let i = 0; i < orders.length; i++) {
      const order = orders[i];
      const subtotal = 500 + (i * 250);
      const tax = Math.round(subtotal * 0.05);
      const total = subtotal + tax;

      await connection.query(`
        INSERT INTO sales_orders (order_number, customer_name, customer_phone, customer_email, status, subtotal, tax_amount, total_amount, shipping_address, shipping_city, shipping_state, shipping_pincode, source)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'website')
        ON DUPLICATE KEY UPDATE customer_name = VALUES(customer_name)
      `, [order.number, order.customer, order.phone, order.email, order.status, subtotal, tax, total, order.address, order.city, order.state, order.pincode]);

      const [orderRows] = await connection.query('SELECT id FROM sales_orders WHERE order_number = ?', [order.number]);
      const orderId = orderRows[0]?.id;

      // Add items
      if (variants[i]) {
        const [prodInfo] = await connection.query('SELECT p.name as product_name, pv.variant_name FROM products p JOIN product_variants pv ON p.id = pv.product_id WHERE pv.id = ?', [variants[i].id]);
        await connection.query(`
          INSERT INTO sales_order_items (sales_order_id, variant_id, product_name, variant_name, quantity, unit_price, tax_percent, total_line)
          VALUES (?, ?, ?, ?, ?, ?, 5, ?)
          ON DUPLICATE KEY UPDATE quantity = VALUES(quantity)
        `, [orderId, variants[i].id, prodInfo[0]?.product_name, prodInfo[0]?.variant_name, 2, variants[i].sell_price, variants[i].sell_price * 2 * 1.05]);
      }
    }
    console.log('✓ Sales Orders created');

    // ==================== PURCHASE ORDERS ====================
    console.log('Seeding Purchase Orders...');
    const [suppliers] = await connection.query('SELECT id FROM suppliers LIMIT 3');

    const purchaseOrders = [
      { number: 'PO-202512-0001', supplier_id: suppliers[0]?.id, status: 'received', total: 15000 },
      { number: 'PO-202512-0002', supplier_id: suppliers[1]?.id, status: 'ordered', total: 25000 },
      { number: 'PO-202512-0003', supplier_id: suppliers[2]?.id, status: 'draft', total: 8500 },
    ];

    for (const po of purchaseOrders) {
      await connection.query(`
        INSERT INTO purchase_orders (po_number, supplier_id, status, subtotal, total_amount, expected_date)
        VALUES (?, ?, ?, ?, ?, DATE_ADD(CURDATE(), INTERVAL 7 DAY))
        ON DUPLICATE KEY UPDATE status = VALUES(status)
      `, [po.number, po.supplier_id, po.status, po.total * 0.95, po.total]);
    }
    console.log('✓ Purchase Orders created');

    // ==================== INVOICES ====================
    console.log('Seeding Invoices...');
    const [salesOrders] = await connection.query('SELECT id, total_amount FROM sales_orders WHERE status IN ("delivered", "shipped") LIMIT 2');

    for (let i = 0; i < salesOrders.length; i++) {
      const invoiceNum = `INV-202512-000${i + 1}`;
      await connection.query(`
        INSERT INTO invoices (invoice_number, sales_order_id, invoice_date, due_date, subtotal, total_amount, status)
        VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 15 DAY), ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status)
      `, [invoiceNum, salesOrders[i].id, salesOrders[i].total_amount * 0.95, salesOrders[i].total_amount, i === 0 ? 'paid' : 'issued']);
    }
    console.log('✓ Invoices created');

    // ==================== ENQUIRIES ====================
    console.log('Seeding Enquiries...');
    await connection.query(`
      INSERT INTO enquiries (name, email, phone, type, message, status) VALUES
      ('Mohan Lal', 'mohan.lal@gmail.com', '+91 9887766550', 'product', 'I want to know if you have organic turmeric powder available in bulk quantity. Please share pricing for 10kg.', 'new'),
      ('Seema Agarwal', 'seema.a@yahoo.com', '+91 9887766551', 'order', 'My order SO-202512-0001 was supposed to be delivered yesterday. Can you please check the status?', 'in_progress'),
      ('Ramesh Chand', 'ramesh.c@hotmail.com', '+91 9887766552', 'general', 'Do you provide wholesale pricing for restaurants? We need regular supply of spices.', 'responded'),
      ('Priyanka Gupta', 'priyanka.g@gmail.com', '+91 9887766553', 'product', 'Looking for Kashmiri dry fruits. Do you have saffron available?', 'new'),
      ('Ashok Kumar', 'ashok.k@gmail.com', '+91 9887766554', 'order', 'Can I change the delivery address for my recent order?', 'converted')
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✓ Enquiries created');

    // ==================== COUPONS ====================
    console.log('Seeding Coupons...');
    await connection.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, min_order_amount, max_discount, usage_limit, usage_count, start_date, end_date, is_active) VALUES
      ('WELCOME10', 'Welcome discount - 10% off on first order', 'percentage', 10.00, 500, 200, 1000, 245, '2025-01-01', '2025-12-31', true),
      ('FLAT100', 'Flat Rs.100 off on orders above Rs.1000', 'fixed', 100.00, 1000, NULL, 500, 89, '2025-01-01', '2025-06-30', true),
      ('SAVE20', '20% off on orders above Rs.2000', 'percentage', 20.00, 2000, 500, 300, 156, '2025-01-01', '2025-12-31', true),
      ('SPICE50', 'Rs.50 off on spice orders', 'fixed', 50.00, 300, NULL, NULL, 456, NULL, NULL, true),
      ('DIWALI25', 'Diwali special - 25% off', 'percentage', 25.00, 1500, 500, 200, 200, '2025-10-15', '2025-11-15', false),
      ('FREESHIP', 'Free shipping on all orders', 'fixed', 50.00, 0, 50, 100, 12, '2025-12-01', '2025-12-31', true)
      ON DUPLICATE KEY UPDATE description = VALUES(description)
    `);
    console.log('✓ Coupons created');

    // ==================== TAX RATES ====================
    console.log('Seeding Tax Rates...');
    await connection.query(`
      INSERT INTO tax_rates (name, rate, type, is_default, is_active) VALUES
      ('GST 0%', 0.00, 'inclusive', 0, true),
      ('GST 5%', 5.00, 'inclusive', 1, true),
      ('GST 12%', 12.00, 'inclusive', 0, true),
      ('GST 18%', 18.00, 'inclusive', 0, true),
      ('GST 28%', 28.00, 'inclusive', 0, true)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✓ Tax Rates created');

    // ==================== PAYMENT METHODS ====================
    console.log('Seeding Payment Methods...');
    await connection.query(`
      INSERT INTO payment_methods (name, code, description, is_active, sort_order) VALUES
      ('Cash on Delivery', 'cod', 'Pay when you receive your order', true, 1),
      ('Online Payment', 'online', 'Pay securely using cards, UPI, or net banking', true, 2),
      ('Bank Transfer', 'bank_transfer', 'Direct bank transfer to our account', true, 3),
      ('UPI', 'upi', 'Pay using Google Pay, PhonePe, or Paytm', true, 4),
      ('Credit (Pay Later)', 'credit', 'For approved business accounts only', true, 5)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `);
    console.log('✓ Payment Methods created');

    // ==================== CMS PAGES ====================
    console.log('Seeding CMS Pages...');
    await connection.query(`
      INSERT INTO cms_pages (title, slug, content, meta_title, meta_description, status) VALUES
      ('About Us', 'about-us', '<h2>About Sahaa Traders</h2><p>Established in 1990, Sahaa Traders has been a trusted name in premium quality spices, dry fruits, and grocery items. With over three decades of experience, we have built strong relationships with farmers and suppliers across India to bring you the finest quality products.</p><h3>Our Mission</h3><p>To provide authentic, pure, and high-quality grocery products to every Indian household while maintaining fair trade practices and supporting local farmers.</p><h3>Quality Promise</h3><p>Every product at Sahaa Traders goes through rigorous quality checks. We source directly from farmers and mills, ensuring freshness and authenticity in every pack.</p>', 'About Us - Sahaa Traders | Premium Spices & Grocery', 'Learn about Sahaa Traders - your trusted partner for premium quality spices, dry fruits, and grocery items since 1990.', 'published'),
      ('Contact Us', 'contact-us', '<h2>Get in Touch</h2><p>We would love to hear from you! Whether you have a question about our products, pricing, or anything else, our team is ready to help.</p><h3>Visit Us</h3><p>123 Market Street, Jaipur, Rajasthan - 302001</p><h3>Call Us</h3><p>+91 98765 43210 (Mon-Sat, 9 AM - 7 PM)</p><h3>Email Us</h3><p>contact@sahaatraders.com</p>', 'Contact Us - Sahaa Traders', 'Contact Sahaa Traders for enquiries, bulk orders, or feedback. We are here to help!', 'published'),
      ('Privacy Policy', 'privacy-policy', '<h2>Privacy Policy</h2><p>Your privacy is important to us. This policy explains how we collect, use, and protect your personal information when you use our website and services.</p><h3>Information We Collect</h3><p>We collect information you provide directly, such as name, email, phone number, and address when you place orders or create an account.</p><h3>How We Use Your Information</h3><p>We use your information to process orders, provide customer support, send order updates, and improve our services.</p><h3>Data Security</h3><p>We implement appropriate security measures to protect your personal information against unauthorized access.</p>', 'Privacy Policy - Sahaa Traders', 'Read our privacy policy to understand how we protect your data and use your information.', 'published'),
      ('Terms & Conditions', 'terms-conditions', '<h2>Terms & Conditions</h2><p>Please read these terms carefully before using our services.</p><h3>Order Acceptance</h3><p>All orders are subject to acceptance and availability. We reserve the right to refuse service to anyone.</p><h3>Pricing</h3><p>All prices are in Indian Rupees and include applicable taxes unless stated otherwise.</p><h3>Returns & Refunds</h3><p>We accept returns within 7 days of delivery for unopened products. Perishable items cannot be returned.</p>', 'Terms & Conditions - Sahaa Traders', 'Terms and conditions for using Sahaa Traders services and website.', 'published'),
      ('Shipping Policy', 'shipping-policy', '<h2>Shipping Information</h2><p>We deliver across India with the following shipping options:</p><h3>Standard Delivery</h3><p>3-5 business days - Rs. 50 (Free on orders above Rs. 500)</p><h3>Express Delivery</h3><p>1-2 business days - Rs. 100 (Available in select cities)</p><h3>Bulk Orders</h3><p>Contact us for special shipping rates on bulk orders above Rs. 5000.</p>', 'Shipping Policy - Sahaa Traders', 'Learn about our shipping options, delivery times, and charges.', 'published')
      ON DUPLICATE KEY UPDATE content = VALUES(content)
    `);
    console.log('✓ CMS Pages created');

    // ==================== BANNERS ====================
    console.log('Seeding Banners...');
    await connection.query(`
      INSERT INTO banners (title, subtitle, image, link, position, sort_order, is_active, start_date, end_date) VALUES
      ('Premium Quality Spices', 'Direct from farms to your kitchen', '/images/banners/spices-hero.jpg', '/products?category=whole-spices', 'home_hero', 1, true, NULL, NULL),
      ('Fresh Dry Fruits', 'Handpicked nuts & dried fruits', '/images/banners/dry-fruits-hero.jpg', '/products?category=dry-fruits-nuts', 'home_hero', 2, true, NULL, NULL),
      ('Winter Special Sale', 'Up to 30% off on selected items', '/images/banners/winter-sale.jpg', '/products?sale=true', 'home_hero', 3, true, '2025-12-01', '2025-12-31'),
      ('Free Delivery', 'On orders above Rs. 500', '/images/banners/free-delivery.jpg', '/products', 'home_promo', 1, true, NULL, NULL),
      ('Pure & Natural', '100% authentic products', '/images/banners/natural.jpg', '/about-us', 'home_promo', 2, true, NULL, NULL)
      ON DUPLICATE KEY UPDATE title = VALUES(title)
    `);
    console.log('✓ Banners created');

    // ==================== SETTINGS ====================
    console.log('Seeding Settings...');
    await connection.query(`
      INSERT INTO settings (setting_key, setting_value, setting_type, setting_group, is_public) VALUES
      ('store_name', 'Sahaa Traders', 'string', 'general', 1),
      ('store_tagline', 'Premium Spices & Grocery Since 1990', 'string', 'general', 1),
      ('store_email', 'contact@sahaatraders.com', 'string', 'general', 1),
      ('store_phone', '+91 98765 43210', 'string', 'general', 1),
      ('store_address', '123 Market Street, Jaipur, Rajasthan - 302001', 'string', 'general', 1),
      ('store_gst', '08AAACS1234A1ZV', 'string', 'business', 0),
      ('currency', 'INR', 'string', 'business', 1),
      ('currency_symbol', '₹', 'string', 'business', 1),
      ('default_tax_rate', '5', 'number', 'business', 0),
      ('low_stock_threshold', '10', 'number', 'business', 0),
      ('free_shipping_threshold', '500', 'number', 'shipping', 1),
      ('default_shipping_charge', '50', 'number', 'shipping', 1),
      ('express_shipping_charge', '100', 'number', 'shipping', 1),
      ('razorpay_enabled', 'true', 'boolean', 'payment', 0),
      ('cod_enabled', 'true', 'boolean', 'payment', 0),
      ('bank_transfer_enabled', 'true', 'boolean', 'payment', 0),
      ('bank_name', 'State Bank of India', 'string', 'payment', 1),
      ('bank_account_name', 'Sahaa Traders', 'string', 'payment', 1),
      ('bank_account_number', '1234567890', 'string', 'payment', 1),
      ('bank_ifsc', 'SBIN0001234', 'string', 'payment', 1),
      ('order_prefix', 'SO', 'string', 'orders', 0),
      ('invoice_prefix', 'INV', 'string', 'orders', 0)
      ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `);
    console.log('✓ Settings created');

    // ==================== EMAIL TEMPLATES ====================
    console.log('Seeding Email Templates...');
    await connection.query(`
      INSERT INTO email_templates (name, code, subject, body_html, variables, is_active) VALUES
      ('Order Confirmation', 'order_confirmation', 'Order Confirmed - {{order_number}} | Sahaa Traders', '<h2>Thank you for your order!</h2><p>Hi {{customer_name}},</p><p>Your order {{order_number}} has been confirmed. We will notify you when it ships.</p><p>Order Total: {{total}}</p>', 'order_number,customer_name,items,total', true),
      ('Order Shipped', 'order_shipped', 'Your Order is On the Way - {{order_number}}', '<h2>Good news!</h2><p>Hi {{customer_name}},</p><p>Your order {{order_number}} has been shipped.</p><p>Track your order with tracking number: {{tracking_number}}</p>', 'order_number,customer_name,tracking_number', true),
      ('Order Delivered', 'order_delivered', 'Order Delivered - {{order_number}}', '<h2>Order Delivered!</h2><p>Hi {{customer_name}},</p><p>Your order {{order_number}} has been delivered. Thank you for shopping with us!</p>', 'order_number,customer_name', true),
      ('Invoice', 'invoice', 'Invoice {{invoice_number}} - Sahaa Traders', '<h2>Invoice</h2><p>Dear {{customer_name}},</p><p>Please find your invoice {{invoice_number}} attached.</p><p>Amount: {{total}}</p>', 'invoice_number,customer_name,total', true),
      ('Payment Received', 'payment_received', 'Payment Received - Thank You!', '<h2>Payment Received</h2><p>We have received your payment of {{amount}} via {{payment_method}}.</p><p>Invoice: {{invoice_number}}</p>', 'invoice_number,amount,payment_method', true),
      ('Welcome Email', 'welcome', 'Welcome to Sahaa Traders!', '<h2>Welcome!</h2><p>Hi {{customer_name}},</p><p>Thank you for creating an account with Sahaa Traders. Use code WELCOME10 for 10% off your first order!</p>', 'customer_name', true)
      ON DUPLICATE KEY UPDATE subject = VALUES(subject)
    `);
    console.log('✓ Email Templates created');

    // ==================== AUDIT LOGS ====================
    console.log('Seeding Audit Logs...');
    await connection.query(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, new_values, ip_address, created_at) VALUES
      (1, 'create', 'product', 1, '{"name": "Premium Cumin Seeds"}', '192.168.1.100', DATE_SUB(NOW(), INTERVAL 5 DAY)),
      (1, 'update', 'settings', NULL, '{"store_name": "Sahaa Traders"}', '192.168.1.100', DATE_SUB(NOW(), INTERVAL 4 DAY)),
      (2, 'create', 'sales_order', 1, '{"order_number": "SO-202512-0001"}', '192.168.1.105', DATE_SUB(NOW(), INTERVAL 3 DAY)),
      (3, 'update', 'inventory', 1, '{"stock_qty": 150}', '192.168.1.108', DATE_SUB(NOW(), INTERVAL 2 DAY)),
      (1, 'delete', 'category', 10, '{"name": "Test Category"}', '192.168.1.100', DATE_SUB(NOW(), INTERVAL 1 DAY)),
      (4, 'create', 'payment', 1, '{"amount": 1500}', '192.168.1.110', NOW()),
      (1, 'login', 'auth', NULL, '{}', '192.168.1.100', NOW())
    `);
    console.log('✓ Audit Logs created');

    // ==================== RETURNS ====================
    console.log('Seeding Returns...');
    const [orderForReturn] = await connection.query('SELECT id FROM sales_orders WHERE status = "delivered" LIMIT 1');
    if (orderForReturn[0]) {
      await connection.query(`
        INSERT INTO returns (return_number, sales_order_id, variant_id, quantity, reason, status, refund_amount, restock)
        VALUES ('RET-202512-0001', ?, ?, 1, 'Product was damaged during delivery', 'pending', 150, true)
        ON DUPLICATE KEY UPDATE reason = VALUES(reason)
      `, [orderForReturn[0].id, variants[0]?.id || 1]);
    }
    console.log('✓ Returns created');

    console.log('\n========================================');
    console.log('✓ All seed data inserted successfully!');
    console.log('========================================\n');
    console.log('Login Credentials:');
    console.log('------------------');
    console.log('Admin Panel:');
    console.log('  Email: admin@sahaatraders.com');
    console.log('  Password: admin123');
    console.log('');
    console.log('Other Staff:');
    console.log('  Email: rahul@sahaatraders.com (admin)');
    console.log('  Email: priya@sahaatraders.com (inventory_manager)');
    console.log('  Email: amit@sahaatraders.com (sales_clerk)');
    console.log('  Password: user123');
    console.log('');
    console.log('Customer Portal:');
    console.log('  Email: arun.mehta@gmail.com');
    console.log('  Password: customer123');
    console.log('');
    console.log('Coupon Codes:');
    console.log('  WELCOME10 - 10% off (max Rs.200)');
    console.log('  FLAT100 - Rs.100 off');
    console.log('  SAVE20 - 20% off (max Rs.500)');
    console.log('  SPICE50 - Rs.50 off');
    console.log('========================================\n');

  } catch (error) {
    console.error('Seeding failed:', error.message);
    console.error(error);
  } finally {
    await connection.end();
  }
}

seedAll();
