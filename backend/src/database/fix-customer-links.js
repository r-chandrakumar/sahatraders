require('dotenv').config();
const mysql = require('mysql2/promise');

async function fixCustomerLinks() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    console.log('Linking sales orders to customers...');

    // Update existing orders to link with customers based on phone
    const [updateResult] = await connection.query(`
      UPDATE sales_orders so
      JOIN customers c ON so.customer_phone = c.phone
      SET so.customer_id = c.id
      WHERE so.customer_id IS NULL
    `);
    console.log('Updated orders by phone match:', updateResult.affectedRows);

    // Also try matching by name if phone didn't match
    const [updateResult2] = await connection.query(`
      UPDATE sales_orders so
      JOIN customers c ON so.customer_name = c.name
      SET so.customer_id = c.id
      WHERE so.customer_id IS NULL
    `);
    console.log('Updated orders by name match:', updateResult2.affectedRows);

    // Show results
    const [result] = await connection.query('SELECT COUNT(*) as linked FROM sales_orders WHERE customer_id IS NOT NULL');
    const [total] = await connection.query('SELECT COUNT(*) as total FROM sales_orders');
    console.log(`Total orders: ${total[0].total}, Linked to customers: ${result[0].linked}`);

    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixCustomerLinks();
