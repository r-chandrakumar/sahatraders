require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const supplierRoutes = require('./routes/supplier.routes');
const purchaseOrderRoutes = require('./routes/purchaseOrder.routes');
const salesOrderRoutes = require('./routes/salesOrder.routes');
const invoiceRoutes = require('./routes/invoice.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const enquiryRoutes = require('./routes/enquiry.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const userRoutes = require('./routes/user.routes');
const uploadRoutes = require('./routes/upload.routes');
const returnsRoutes = require('./routes/returns.routes');
const customerRoutes = require('./routes/customer.routes');
const cmsRoutes = require('./routes/cms.routes');
const settingsRoutes = require('./routes/settings.routes');
const cartRoutes = require('./routes/cart.routes');
const checkoutRoutes = require('./routes/checkout.routes');
const couponRoutes = require('./routes/coupon.routes');
const auditLogRoutes = require('./routes/auditLog.routes');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      'img-src': ["'self'", 'data:', 'https:', 'http:'],
    },
  },
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// Parse CORS origins from env (can be comma-separated)
const allowedOrigins = [
  ...(process.env.PUBLIC_SITE_URL?.split(',') || []),
  ...(process.env.ADMIN_APP_URL?.split(',') || []),
  'https://sahatraders.in',
  'https://www.sahatraders.in',
  'https://admin.sahatraders.in',
  'https://api.sahatraders.in',
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002'
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Public API Routes
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/enquiries', enquiryRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/checkout', checkoutRoutes);
app.use('/api/cms', cmsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/coupons', couponRoutes);

// Admin Routes
app.use('/api/admin/suppliers', supplierRoutes);
app.use('/api/admin/purchase-orders', purchaseOrderRoutes);
app.use('/api/admin/sales-orders', salesOrderRoutes);
app.use('/api/admin/invoices', invoiceRoutes);
app.use('/api/admin/inventory', inventoryRoutes);
app.use('/api/admin/dashboard', dashboardRoutes);
app.use('/api/admin/users', userRoutes);
app.use('/api/admin/upload', uploadRoutes);
app.use('/api/admin/categories', categoryRoutes);
app.use('/api/admin/products', productRoutes);
app.use('/api/admin/returns', returnsRoutes);
app.use('/api/admin/settings', settingsRoutes);
app.use('/api/admin/cms', cmsRoutes);
app.use('/api/admin/coupons', couponRoutes);
app.use('/api/admin/audit-logs', auditLogRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
