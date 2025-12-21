const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { authenticate } = require('../middleware/auth.middleware');
const { formatResponse } = require('../utils/helpers');

// Get dashboard stats (alias for overview)
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    // Sales summary (last 30 days)
    const [salesSummary] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        COALESCE(SUM(total_amount), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END), 0) as delivered_revenue
      FROM sales_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Orders by status
    const [ordersByStatus] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM sales_orders
      GROUP BY status
    `);

    // Recent orders
    const [recentOrders] = await pool.query(`
      SELECT id, order_number, customer_name, total_amount, status, created_at
      FROM sales_orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Stock summary
    const [stockSummary] = await pool.query(`
      SELECT
        COALESCE(SUM(pv.stock_qty * pv.buy_price), 0) as total_stock_value,
        COALESCE(SUM(pv.stock_qty), 0) as total_units,
        COUNT(CASE WHEN pv.stock_qty <= pv.low_stock_threshold THEN 1 END) as low_stock_count
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.is_active = true AND pv.track_stock = true AND p.is_active = true
    `);

    // Low stock items
    const [lowStockItems] = await pool.query(`
      SELECT pv.id, pv.sku, pv.variant_name, pv.stock_qty, pv.low_stock_threshold,
        p.name as product_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.track_stock = true
        AND pv.stock_qty <= pv.low_stock_threshold
        AND pv.is_active = true
        AND p.is_active = true
      ORDER BY pv.stock_qty ASC
      LIMIT 10
    `);

    // Pending enquiries
    const [pendingEnquiries] = await pool.query(`
      SELECT COUNT(*) as count FROM enquiries WHERE status = 'new'
    `);

    // Pending POs
    const [pendingPOs] = await pool.query(`
      SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('ordered', 'partial')
    `);

    // Outstanding invoices
    const [outstandingInvoices] = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(total_amount - paid_amount), 0) as total_outstanding
      FROM invoices
      WHERE status IN ('issued', 'partial', 'overdue')
    `);

    // Sales chart data (last 7 days)
    const [salesChart] = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as revenue
      FROM sales_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Top selling products (last 30 days)
    const [topProducts] = await pool.query(`
      SELECT
        p.name as product_name,
        pv.variant_name,
        SUM(soi.quantity) as total_qty,
        SUM(soi.total_line) as total_revenue
      FROM sales_order_items soi
      JOIN product_variants pv ON soi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE so.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY pv.id, p.name, pv.variant_name
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    res.json(formatResponse({
      sales: {
        ...salesSummary[0],
        by_status: ordersByStatus
      },
      recent_orders: recentOrders,
      stock: {
        ...stockSummary[0],
        low_stock_items: lowStockItems
      },
      pending_enquiries: pendingEnquiries[0].count,
      pending_pos: pendingPOs[0].count,
      outstanding_invoices: outstandingInvoices[0],
      sales_chart: salesChart,
      top_products: topProducts
    }));
  } catch (error) {
    next(error);
  }
});

// Get dashboard overview
router.get('/', authenticate, async (req, res, next) => {
  try {
    // Sales summary (last 30 days)
    const [salesSummary] = await pool.query(`
      SELECT
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        SUM(CASE WHEN status = 'delivered' THEN total_amount ELSE 0 END) as delivered_revenue
      FROM sales_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
    `);

    // Orders by status
    const [ordersByStatus] = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM sales_orders
      GROUP BY status
    `);

    // Recent orders
    const [recentOrders] = await pool.query(`
      SELECT id, order_number, customer_name, total_amount, status, created_at
      FROM sales_orders
      ORDER BY created_at DESC
      LIMIT 5
    `);

    // Stock summary
    const [stockSummary] = await pool.query(`
      SELECT
        COALESCE(SUM(pv.stock_qty * pv.buy_price), 0) as total_stock_value,
        COALESCE(SUM(pv.stock_qty), 0) as total_units,
        COUNT(CASE WHEN pv.stock_qty <= pv.low_stock_threshold THEN 1 END) as low_stock_count
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.is_active = true AND pv.track_stock = true AND p.is_active = true
    `);

    // Low stock items
    const [lowStockItems] = await pool.query(`
      SELECT pv.id, pv.sku, pv.variant_name, pv.stock_qty, pv.low_stock_threshold,
        p.name as product_name
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.track_stock = true
        AND pv.stock_qty <= pv.low_stock_threshold
        AND pv.is_active = true
        AND p.is_active = true
      ORDER BY pv.stock_qty ASC
      LIMIT 10
    `);

    // Pending enquiries
    const [pendingEnquiries] = await pool.query(`
      SELECT COUNT(*) as count FROM enquiries WHERE status = 'new'
    `);

    // Pending POs
    const [pendingPOs] = await pool.query(`
      SELECT COUNT(*) as count FROM purchase_orders WHERE status IN ('ordered', 'partial')
    `);

    // Outstanding invoices
    const [outstandingInvoices] = await pool.query(`
      SELECT
        COUNT(*) as count,
        COALESCE(SUM(total_amount - paid_amount), 0) as total_outstanding
      FROM invoices
      WHERE status IN ('issued', 'partial', 'overdue')
    `);

    // Sales chart data (last 7 days)
    const [salesChart] = await pool.query(`
      SELECT
        DATE(created_at) as date,
        COUNT(*) as orders,
        SUM(total_amount) as revenue
      FROM sales_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `);

    // Top selling products (last 30 days)
    const [topProducts] = await pool.query(`
      SELECT
        p.name as product_name,
        pv.variant_name,
        SUM(soi.quantity) as total_qty,
        SUM(soi.total_line) as total_revenue
      FROM sales_order_items soi
      JOIN product_variants pv ON soi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE so.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY pv.id, p.name, pv.variant_name
      ORDER BY total_qty DESC
      LIMIT 5
    `);

    res.json(formatResponse({
      sales: {
        ...salesSummary[0],
        by_status: ordersByStatus
      },
      recent_orders: recentOrders,
      stock: {
        ...stockSummary[0],
        low_stock_items: lowStockItems
      },
      pending_enquiries: pendingEnquiries[0].count,
      pending_pos: pendingPOs[0].count,
      outstanding_invoices: outstandingInvoices[0],
      sales_chart: salesChart,
      top_products: topProducts
    }));
  } catch (error) {
    next(error);
  }
});

// Get sales report
router.get('/reports/sales', authenticate, async (req, res, next) => {
  try {
    const { from_date, to_date, group_by = 'day' } = req.query;

    let dateFormat = '%Y-%m-%d';
    if (group_by === 'month') dateFormat = '%Y-%m';
    if (group_by === 'year') dateFormat = '%Y';

    let query = `
      SELECT
        DATE_FORMAT(created_at, '${dateFormat}') as period,
        COUNT(*) as orders,
        SUM(subtotal) as subtotal,
        SUM(tax_amount) as tax,
        SUM(total_amount) as revenue
      FROM sales_orders
      WHERE status NOT IN ('cancelled', 'enquiry')
    `;
    const params = [];

    if (from_date) {
      query += ' AND DATE(created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(created_at) <= ?';
      params.push(to_date);
    }

    query += ` GROUP BY DATE_FORMAT(created_at, '${dateFormat}') ORDER BY period ASC`;

    const [sales] = await pool.query(query, params);

    // Get totals
    let totalsQuery = `
      SELECT
        COUNT(*) as total_orders,
        SUM(subtotal) as total_subtotal,
        SUM(tax_amount) as total_tax,
        SUM(total_amount) as total_revenue
      FROM sales_orders
      WHERE status NOT IN ('cancelled', 'enquiry')
    `;
    const totalsParams = [];

    if (from_date) {
      totalsQuery += ' AND DATE(created_at) >= ?';
      totalsParams.push(from_date);
    }

    if (to_date) {
      totalsQuery += ' AND DATE(created_at) <= ?';
      totalsParams.push(to_date);
    }

    const [totals] = await pool.query(totalsQuery, totalsParams);

    res.json(formatResponse({
      data: sales,
      totals: totals[0]
    }));
  } catch (error) {
    next(error);
  }
});

// Get profit/loss report
router.get('/reports/profit-loss', authenticate, async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;

    // Revenue from sales
    let revenueQuery = `
      SELECT SUM(total_amount) as revenue
      FROM sales_orders
      WHERE status IN ('delivered', 'shipped')
    `;
    const params = [];

    if (from_date) {
      revenueQuery += ' AND DATE(created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      revenueQuery += ' AND DATE(created_at) <= ?';
      params.push(to_date);
    }

    const [revenue] = await pool.query(revenueQuery, params);

    // COGS from stock movements
    let cogsQuery = `
      SELECT SUM(ABS(change_qty) * COALESCE(cost_price, 0)) as cogs
      FROM stock_movements
      WHERE reason = 'sale'
    `;
    const cogsParams = [];

    if (from_date) {
      cogsQuery += ' AND DATE(created_at) >= ?';
      cogsParams.push(from_date);
    }

    if (to_date) {
      cogsQuery += ' AND DATE(created_at) <= ?';
      cogsParams.push(to_date);
    }

    const [cogs] = await pool.query(cogsQuery, cogsParams);

    const totalRevenue = revenue[0].revenue || 0;
    const totalCogs = cogs[0].cogs || 0;
    const grossProfit = totalRevenue - totalCogs;
    const profitMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    res.json(formatResponse({
      revenue: totalRevenue,
      cogs: totalCogs,
      gross_profit: grossProfit,
      profit_margin: profitMargin.toFixed(2)
    }));
  } catch (error) {
    next(error);
  }
});

// Get category performance
router.get('/reports/category-performance', authenticate, async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;

    let query = `
      SELECT
        c.id, c.name,
        COUNT(DISTINCT so.id) as orders,
        SUM(soi.quantity) as units_sold,
        SUM(soi.total_line) as revenue
      FROM sales_order_items soi
      JOIN product_variants pv ON soi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE so.status NOT IN ('cancelled', 'enquiry')
    `;
    const params = [];

    if (from_date) {
      query += ' AND DATE(so.created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(so.created_at) <= ?';
      params.push(to_date);
    }

    query += ' GROUP BY c.id, c.name ORDER BY revenue DESC';

    const [performance] = await pool.query(query, params);

    res.json(formatResponse(performance));
  } catch (error) {
    next(error);
  }
});

// Get inventory report
router.get('/reports/inventory', authenticate, async (req, res, next) => {
  try {
    // Overall inventory stats
    const [summary] = await pool.query(`
      SELECT
        COUNT(DISTINCT p.id) as total_products,
        COUNT(pv.id) as total_variants,
        COALESCE(SUM(pv.stock_qty), 0) as total_units,
        COALESCE(SUM(pv.stock_qty * pv.buy_price), 0) as total_stock_value,
        COUNT(CASE WHEN pv.stock_qty <= pv.low_stock_threshold AND pv.track_stock = true THEN 1 END) as low_stock_count,
        COUNT(CASE WHEN pv.stock_qty = 0 AND pv.track_stock = true THEN 1 END) as out_of_stock_count
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      WHERE pv.is_active = true AND p.is_active = true
    `);

    // Inventory by category
    const [byCategory] = await pool.query(`
      SELECT
        c.id, c.name,
        COUNT(DISTINCT p.id) as total_products,
        COUNT(pv.id) as total_variants,
        COALESCE(SUM(pv.stock_qty), 0) as total_units,
        COALESCE(SUM(pv.stock_qty * pv.buy_price), 0) as stock_value,
        COUNT(CASE WHEN pv.stock_qty <= pv.low_stock_threshold AND pv.track_stock = true THEN 1 END) as low_stock,
        COUNT(CASE WHEN pv.stock_qty = 0 AND pv.track_stock = true THEN 1 END) as out_of_stock
      FROM product_variants pv
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE pv.is_active = true AND p.is_active = true
      GROUP BY c.id, c.name
      ORDER BY stock_value DESC
    `);

    // Stock movements summary (last 30 days)
    const [movements] = await pool.query(`
      SELECT
        c.name as category,
        COALESCE(SUM(CASE WHEN sm.reason IN ('purchase_receipt', 'initial') THEN sm.change_qty ELSE 0 END), 0) as received,
        COALESCE(SUM(CASE WHEN sm.reason = 'sale' THEN ABS(sm.change_qty) ELSE 0 END), 0) as sold,
        COALESCE(SUM(CASE WHEN sm.reason IN ('adjustment', 'damage', 'return') THEN sm.change_qty ELSE 0 END), 0) as adjusted
      FROM stock_movements sm
      JOIN product_variants pv ON sm.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE sm.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      GROUP BY c.id, c.name
      ORDER BY c.name
    `);

    res.json(formatResponse({
      summary: summary[0],
      by_category: byCategory,
      movements: movements
    }));
  } catch (error) {
    next(error);
  }
});

// Get supplier report
router.get('/reports/suppliers', authenticate, async (req, res, next) => {
  try {
    const { from_date, to_date } = req.query;

    // Overall supplier stats
    const [summary] = await pool.query(`
      SELECT
        COUNT(DISTINCT s.id) as total_suppliers,
        COUNT(DISTINCT CASE WHEN s.is_active = true THEN s.id END) as active_suppliers
      FROM suppliers s
    `);

    // Supplier performance
    let supplierQuery = `
      SELECT
        s.id, s.name,
        COUNT(po.id) as total_orders,
        COALESCE(SUM(po.total_amount), 0) as total_value,
        COUNT(CASE WHEN po.status = 'received' THEN 1 END) as completed_orders,
        COUNT(CASE WHEN po.status IN ('ordered', 'partial') THEN 1 END) as pending_orders
      FROM suppliers s
      LEFT JOIN purchase_orders po ON s.id = po.supplier_id
      WHERE s.is_active = true
    `;
    const params = [];

    if (from_date) {
      supplierQuery += ' AND (po.created_at IS NULL OR DATE(po.created_at) >= ?)';
      params.push(from_date);
    }

    if (to_date) {
      supplierQuery += ' AND (po.created_at IS NULL OR DATE(po.created_at) <= ?)';
      params.push(to_date);
    }

    supplierQuery += ' GROUP BY s.id, s.name ORDER BY total_value DESC';

    const [suppliers] = await pool.query(supplierQuery, params);

    // PO trend (last 6 months)
    const [poTrend] = await pool.query(`
      SELECT
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as orders,
        COALESCE(SUM(total_amount), 0) as value
      FROM purchase_orders
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json(formatResponse({
      summary: summary[0],
      suppliers: suppliers,
      po_trend: poTrend
    }));
  } catch (error) {
    next(error);
  }
});

// Get top products report
router.get('/reports/top-products', authenticate, async (req, res, next) => {
  try {
    const { from_date, to_date, limit = 10 } = req.query;

    let query = `
      SELECT
        p.id, p.name as product_name, pv.variant_name, pv.sku,
        SUM(soi.quantity) as total_qty,
        SUM(soi.total_line) as total_revenue,
        COUNT(DISTINCT so.id) as order_count
      FROM sales_order_items soi
      JOIN product_variants pv ON soi.variant_id = pv.id
      JOIN products p ON pv.product_id = p.id
      JOIN sales_orders so ON soi.sales_order_id = so.id
      WHERE so.status NOT IN ('cancelled', 'enquiry')
    `;
    const params = [];

    if (from_date) {
      query += ' AND DATE(so.created_at) >= ?';
      params.push(from_date);
    }

    if (to_date) {
      query += ' AND DATE(so.created_at) <= ?';
      params.push(to_date);
    }

    query += ` GROUP BY p.id, p.name, pv.id, pv.variant_name, pv.sku ORDER BY total_revenue DESC LIMIT ?`;
    params.push(parseInt(limit));

    const [products] = await pool.query(query, params);

    res.json(formatResponse(products));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
