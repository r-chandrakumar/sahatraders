require('dotenv').config();
const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders'
  });

  // Check inventory query
  const [results] = await conn.query(`
    SELECT pv.id, pv.sku, pv.variant_name, pv.stock_qty, pv.track_stock, pv.is_active,
           p.name as product_name, p.is_active as product_active
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.track_stock = true AND pv.is_active = true AND p.is_active = true
    AND pv.sku LIKE '%MUS%'
  `);

  console.log('Variants matching MUS in inventory query:');
  console.table(results);

  // Total count
  const [count] = await conn.query(`
    SELECT COUNT(*) as total
    FROM product_variants pv
    JOIN products p ON pv.product_id = p.id
    WHERE pv.track_stock = true AND pv.is_active = true AND p.is_active = true
  `);

  console.log('Total variants in inventory:', count[0].total);

  await conn.end();
}

check().catch(console.error);
