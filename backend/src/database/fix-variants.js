require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixVariants() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders'
  });

  try {
    console.log('Fixing product variants...');

    // Update all variants to have track_stock = true and is_active = true
    const [result] = await connection.query(`
      UPDATE product_variants
      SET track_stock = true, is_active = true
      WHERE track_stock = false OR is_active = false OR track_stock IS NULL OR is_active IS NULL
    `);

    console.log(`Updated ${result.affectedRows} variants`);

    // Show variants that might still have issues
    const [variants] = await connection.query(`
      SELECT pv.id, pv.sku, pv.variant_name, pv.track_stock, pv.is_active, p.name as product_name, p.is_active as product_active
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.sku LIKE '%MUS%' OR p.sku LIKE '%MUS%'
    `);

    console.log('\nVariants with MUS in SKU:');
    console.table(variants);

    console.log('\nFix completed!');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await connection.end();
  }
}

fixVariants();
