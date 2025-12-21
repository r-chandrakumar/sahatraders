require('dotenv').config();
const mysql = require('mysql2/promise');

async function testQuery() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sahaa_traders'
  });

  try {
    const query = `
      SELECT c.id, c.name, c.email, c.phone, c.address, c.is_active, c.last_login, c.created_at,
             (SELECT COUNT(*) FROM sales_orders WHERE customer_id = c.id) as total_orders,
             (SELECT COALESCE(SUM(total_amount), 0) FROM sales_orders WHERE customer_id = c.id AND status != 'cancelled') as total_spent
      FROM customers c
      WHERE 1=1
      ORDER BY c.created_at DESC LIMIT 20 OFFSET 0
    `;

    const [customers] = await conn.query(query);
    console.log('Query returned:', customers.length, 'customers');

    const [total] = await conn.query('SELECT COUNT(*) as total FROM customers');
    console.log('Total in DB:', total[0].total);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await conn.end();
  }
}

testQuery();
