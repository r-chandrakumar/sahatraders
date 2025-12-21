# Project document — E-commerce app (Next.js + Tailwind + Ant Design theme, Express.js + MySQL)

Great — below is a complete project document you can use to plan, build, and accept an e-commerce application with a public Next.js site (order enquiries only), and an admin app to manage in-house & supplier products, variants, stock, orders, invoices and advanced payment handling. I included architecture, data model (table summaries), API examples, user stories, feature lists, business rules, security & testing checklists, UI/page list, and acceptance criteria. Use or adapt any portion for your team or client.

---

# 1. Executive summary

An e-commerce application with:

* Public Next.js website (Tailwind + Ant Design theme) where customers can browse, submit order enquiries (no direct online payments), and send product enquiries.
* Admin application (Next.js or separate React admin) for product/catalog management, stock/inventory, supplier purchase flow, order management, invoices, and multi-payment handling (advance, partial payments).
* Backend: Express.js REST API (or GraphQL) connecting to MySQL.
* Key business: sells products like cumin, pepper, oil; products have variants (weight/pack size), both in-house and supplier items. Robust stock tracking by lot/source, profit/loss, supplier POs, and returns.

---

# 2. Objectives

* Enable customers to browse the catalog and submit order enquiries (no online checkout).
* Provide admins full control of catalog, variants, pricing, supplier purchases, stock movements, order lifecycle, invoices, payments, and reporting.
* Track stock in/out by source (in-house vs supplier) and compute profit/loss.
* Maintain audit trail, role-based access, and data integrity.

---

# 3. Scope

Included:

* Catalog with categories, product variants, attributes, images.
* Customer public site (product pages, enquiry forms, order enquiry).
* Admin app: product, inventory, supplier, purchase orders, sales orders, invoices, payments, returns, dashboard, user/role management, reports.
* REST APIs for frontend/backend integration.
* MySQL database, migrations, seed data.
* Notifications (email) for new enquiries/orders and status updates.

Excluded (can be added later):

* Direct online payment gateways (Stripe/PayPal). The app supports recording external payments manually (bank transfer, COD).
* Marketplace features (multiple sellers checkout).
* B2B pricing tiers or complex price lists (unless requested).

---

# 4. Users & roles

* Super Admin — full access (setup, users, all data).
* Admin / Manager — manage products, suppliers, stock, orders, invoices, reports (no system admin settings).
* Inventory Manager — manage stock movements, receive supplier POs, stock adjustments.
* Sales / Order Clerk — view & process orders, create invoices, register payments.
* Customer (public site) — browse, submit order enquiries and general enquiries (no login required; optional customer accounts).
* Supplier (optional portal / read access) — view POs (optional).

Permissions matrix (summary):

* Product CRUD — Admin, Super Admin
* Category CRUD — Admin, Super Admin
* Inventory adjustments — Inventory Manager, Admin
* Order processing & invoice — Sales, Admin
* User management — Super Admin

---

# 5. High-level architecture

* Frontend:

  * Public site: Next.js + Tailwind CSS + Ant Design (AntUI theme).
  * Admin app: Next.js / React + Tailwind + AntUI (Create a new applcaition).
* Backend:

  * Express.js API server (REST) with request validation, auth (JWT session cookie or token for admin), role middleware.
* Database:

  * MySQL (normalized schema).
* Optional:

  * Redis for caching (listings, sessions).
  * Worker queue (Bull) for email notifications, reports.
  * Object storage (S3 / MinIO) for images.
* Deployment:

  * Frontend on Vercel / Netlify (Next.js); backend on a VPS / container (Docker) behind Nginx; MySQL managed or RDS.
* Monitoring & logging:

  * Winston / Bunyan logs; Sentry for errors.

---

# 6. Data model (tables summary)

Below are the main tables and key columns. Use migrations with foreign keys and indexes.

1. `users`

* id, name, email (unique), password_hash, role, phone, is_active, created_at, updated_at

2. `categories`

* id, name, slug, parent_id (nullable), description, image_url, seo_meta, created_at, updated_at

3. `products`

* id, sku, name, description, category_id, brand, is_active, type (inhouse|supplier|both), default_image, created_at, updated_at

4. `product_variants`

* id, product_id, sku (variant sku), variant_name (e.g., "100g", "200g"), attributes json (weight, unit), buy_price (default), sell_price, gst/tax_percent, barcode, stock_track (bool), created_at, updated_at

5. `product_images`

* id, product_id, variant_id (nullable), url, alt_text, order

6. `suppliers`

* id, name, contact_person, phone, email, address, payment_terms, created_at

7. `supplier_products`

* id, supplier_id, product_id, supplier_sku, supplier_buy_price, lead_time_days

8. `stock_locations` (optional)

* id, name (Main Warehouse, Store1), address

9. `stock_movements`

* id, variant_id, location_id, change_qty (positive in, negative out), reason (purchase_receipt, sale, adjustment, return), reference_id, reference_type, cost_price, created_by, created_at

10. `purchase_orders` (PO to suppliers)

* id, po_number, supplier_id, status (draft, ordered, received, cancelled), total_amount, expected_date, created_by, created_at

11. `purchase_order_items`

* id, po_id, variant_id, quantity, unit_price, received_qty, taxed

12. `sales_orders` (customer orders/enquiries)

* id, order_number, customer_name, customer_contact, customer_email, status (enquiry, confirmed, processing, shipped, delivered, cancelled), total_amount, shipping_address, created_at

13. `sales_order_items`

* id, sales_order_id, variant_id, description, quantity, unit_price, tax_percent, total_line

14. `invoices`

* id, invoice_number, sales_order_id, invoice_date, due_date, total_amount, status (draft, issued, paid, partial, cancelled)

15. `payments`

* id, invoice_id (nullable), sales_order_id (nullable), payment_date, amount, payment_method (bank_transfer, cash, cheque, card_manual), reference, note, created_by

16. `returns`

* id, sales_order_item_id, quantity, reason, status, created_at

17. `stock_adjustments`

* id, variant_id, location_id, qty_before, qty_after, reason, created_by, created_at

18. `audit_logs`

* id, user_id, action, entity_type, entity_id, changes (json), created_at

19. `enquiries` (site enquiries)

* id, name, email, phone, type (product_enquiry, order_enquiry, general), product_id (nullable), variant_id (nullable), message, status, assigned_to, created_at

20. `site_content` (CMS for pages)

* id, slug, title, content_html, meta_title, meta_desc, publish_status, created_at

---

# 7. Inventory & order business rules (important)

* Stock is tracked at the variant level.
* Inbound flow:

  * Create Purchase Order (PO) → Receive goods → create `stock_movement` entries (+qty) and update `received_qty` on PO items.
  * For in-house purchase (internal production/transfer), create inbound movement with source 'inhouse'.
* Outbound flow:

  * Sales Order confirmed → on shipment, create stock movements (-qty) and reserves can be applied when order confirmed (optional).
* Stock ledger:

  * Each `stock_movement` stores cost_price to allow COGS / profit calculations.
* Partial payments:

  * Payments can be registered against invoices; invoices may become partially paid with `payments` records.
* Returns:

  * Returns generate inbound stock_movements (if restockable) and financial adjustments.
* Stock adjustments:

  * Allowed only with reason and audit log; inventory manager permissions required.
* Pricing:

  * Each variant has `buy_price` (average or last), `sell_price`. Profit/loss reports use matched cost_price at sale.

---

# 8. Key features (detailed)

## Public website (Next.js)

* Home, category listing, product listing, product detail page (variants + images + specs).
* Search (keyword, filters: category, price range, weight/pack, in-stock).
* Product enquiry form on product page (pre-fills product/variant).
* Order enquiry form: customers fill order details; admin receives enquiry, can convert to sales order.
* CMS pages (About, Contact, Terms) editable in admin.
* SEO friendly pages, structured data for products.

## Admin application

* Dashboard: current stock, incoming POs, recent orders, profit/loss snapshot, low stock alerts.
* Product & Variant management:

  * Create/edit products, variants, multi-images, attributes.
  * Mark source: inhouse / supplier / both.
* Category & CMS management.
* Supplier management: create suppliers, map supplier prices to variants.
* Purchase Orders (PO):

  * Create PO, send to supplier (email), receive goods (partial/complete), auto stock update.
* Inventory:

  * Receive goods, stock transfer between locations, stock adjustments, count cycles, low stock alerts.
* Sales Orders & Enquiries:

  * Convert enquiry → sales order, generate invoice, track status, shipment notes.
* Invoice & Payment:

  * Create invoices from sales orders, record multiple payments (partial, advance), print PDF invoice.
* Returns & Credit Notes:

  * Process return and create credit notes or refunds.
* Users & roles: create users, assign roles, manage permissions.
* Logs & Audit: track changes to critical entities.
* Reports:

  * Sales by period, product performance, stock valuation, profit & loss, supplier purchase history.
* Notifications:

  * Email templates for new order/enquiry, PO created, invoice issued, payment received.

---

# 9. APIs (example endpoints)

Use REST patterns; protect admin endpoints with auth/roles.

Authentication:

* `POST /api/auth/login` — accept email/password => returns JWT/session cookie.
* `POST /api/auth/logout`

Catalog:

* `GET /api/categories`
* `GET /api/categories/:slug`
* `GET /api/products` — filters: category, q, minPrice, maxPrice, inStock
* `GET /api/products/:id`
* `POST /api/enquiries` — public product/order enquiry

Admin (require auth):

* `POST /api/admin/products` — create product
* `PUT /api/admin/products/:id`
* `POST /api/admin/products/:id/variants`
* `GET /api/admin/products` — list & filters
* `POST /api/admin/suppliers`
* `POST /api/admin/purchase-orders`
* `PUT /api/admin/purchase-orders/:id/receive` — post receiving
* `POST /api/admin/sales-orders` — create sales order from enquiry
* `PUT /api/admin/sales-orders/:id/status` — update order status
* `POST /api/admin/invoices` — create invoice
* `POST /api/admin/invoices/:id/payments` — record payment
* `POST /api/admin/stock-adjustments`
* `GET /api/admin/reports/sales?from=&to=`
* `GET /api/admin/dashboard` — aggregated metrics

Responses should use consistent structure: `{ success: true, data: ..., meta: ... }` and well-documented error codes.

---

# 10. Sample DB schema snippets (DDL-style summaries)

(Use migrations in your preferred tool)

`products`:

* id (PK)
* sku VARCHAR UNIQUE
* name VARCHAR
* description TEXT
* category_id FK
* type ENUM('inhouse','supplier','both')
* created_at, updated_at

`product_variants`:

* id (PK)
* product_id FK
* sku VARCHAR
* variant_name VARCHAR
* attributes JSON
* buy_price DECIMAL(10,2)
* sell_price DECIMAL(10,2)
* stock_qty DECIMAL(10,2) — (optional denormalized)
* created_at, updated_at

`stock_movements`:

* id, variant_id FK, location_id FK, change_qty DECIMAL, reason VARCHAR, reference_type, reference_id, cost_price DECIMAL, created_by, created_at

`payments`:

* id, invoice_id FK, sales_order_id FK, amount DECIMAL, payment_method VARCHAR, payment_date, reference, created_at

---

# 11. UI / page list (public & admin)

## Public site pages

* Home (hero + featured categories + featured products)
* Category listing with filters
* Product listing (with pagination)
* Product detail (variant selector, images, specs, enquiry button/form)
* Order enquiry form (checkout-like but submits as order enquiry)
* Contact / General enquiry page
* CMS pages (About, Terms)
* Search results

## Admin pages

* Login
* Dashboard (cards: total sales, current stock value, profit/loss, low stock)
* Products list / Product create-edit / Variant modal
* Categories & CMS editor
* Suppliers list/detail
* Purchase Orders (create, list, receive)
* Inventory (stock ledger, adjustments, transfers)
* Sales Orders / Enquiries list / Order detail
* Invoices / Payments list / Payment register
* Returns & Credit notes
* Reports (Sales, Stock valuation, P&L)
* User Management & Roles
* Settings (tax, currency, payment types, email templates)

---

# 12. Notifications & emails

Templates & triggers:

* New Order Enquiry -> email to sales team.
* Product Enquiry -> email to product manager.
* PO Created -> email to supplier (optional).
* PO Received -> internal notification.
* Invoice Issued / Payment Received -> customer email.
* Low stock alert -> inventory manager.

---

# 13. Reporting & Dashboard metrics

* Current stock value (valuation using last cost or FIFO/avg).
* In / Out for selected period (stock in by POs, stock out by sales).
* Sales revenue by product/category.
* Gross profit (Revenue - COGS) by product/time.
* Outstanding invoices / receivables.
* Supplier purchase summary.

---

# 14. Security & compliance

* Admin auth: secure JWT with HTTPOnly cookies or access tokens + refresh tokens.
* Passwords: bcrypt or Argon2.
* Role-based access control (RBAC) middleware.
* Input validation & sanitization (express-validator / JOI).
* CSRF protection for admin forms (if using cookies).
* Rate limiting for public endpoints (prevent spam enquiries).
* File upload scanning & size limits for images.
* HTTPS enforced, HSTS headers.
* Audit logs for financial and inventory changes.

---

# 15. Non-functional requirements

* Responsive UI, accessible WCAG basics.
* High availability for frontend (CDN); backend scalable (Docker + orchestrator).
* Backups: daily DB backups, nightly image sync.
* Performance: product listing queries to be cached (Redis).
* Localization readiness (i18n) if needed.
* Logging & error monitoring.

---

# 16. Testing checklist

* Unit tests: services, utilities.
* Integration tests: critical APIs (product CRUD, stock movements, invoice/payment).
* E2E tests: admin flows (create product → create PO → receive → sale → invoice → payment).
* Security tests: auth/authorization, input validation, file upload.
* Load tests: product listing and search under traffic.
* Acceptance tests: business flows with sample data.

---

# 17. Acceptance criteria (example)

* Public site lists categories & products; product enquiry form sends email and stores enquiry.
* Admin can create product, add variants, set buy/sell price, and upload images.
* Creating & receiving a PO increases stock and records cost price in `stock_movements`.
* Creating a sales order and marking it shipped reduces available stock and creates correct stock movement records.
* Invoice creation from sales order allows multiple payments; invoice balance updates correctly; payment records persist.
* Dashboard displays current stock, in/out and basic profit/loss numbers.
* Role-based access prevents non-admin users from performing admin actions.

---

# 18. API/Integration considerations

* Use pagination and filters on listing endpoints.
* Use optimistic concurrency control for stock updates (e.g., row version or transactions) to prevent oversell.
* All money fields as integers (cents) or DECIMAL(10,2) consistently.
* Provide webhooks (optional) for external systems when order/enquiry/invoice events happen.

---

# 19. Edge cases & additional features to consider

* Reservation vs immediate deduction: reserve stock on order confirmation to prevent oversell.
* Configurable taxes per product or location.
* Bulk import / CSV import for products, variants, and stock.
* Barcode scanning support for warehouse receiving and picking.
* Batch/Lot tracking (batch_no, expiry) for inventory.
* Price history & promotions (future requirement).
* CSV/PDF export for invoices & reports.

---

# 20. Suggested implementation milestones (no durations)

1. Project setup: repos, CI/CD, DB migrations, auth skeleton.
2. Public product listing & product detail + CMS skeleton.
3. Admin product & variant CRUD, categories.
4. Inventory model + stock movements + PO flow (create + receive).
5. Sales order flow & invoice creation.
6. Payments recording & partial payments.
7. Dashboard + reporting + audit logs.
8. Notifications & email templates + acceptance testing.
9. Hardening: security, backups, monitoring, deploy.

---

# 21. Deliverables

* Source code (frontend + backend) with README and environment setup.
* Database migration scripts and sample seed data.
* API documentation (OpenAPI / Postman collection).
* Admin & public UIs as per wireframes.
* Deployment scripts (Dockerfile, docker-compose or K8s manifests).
* Test suite and test reports.
* User manual for admin operations & sample email templates.

---

# 22. Example sample user stories

* As a customer, I want to submit an order enquiry for a product variant so the sales team can contact me.

  * Acceptance: Enquiry saved, email sent to sales, enquiry visible in admin.
* As an inventory manager, I want to receive a supplier PO so that stock quantities are increased.

  * Acceptance: PO receive increases stock, stock ledger entries created with cost price.
* As a sales person, I want to issue an invoice from a sales order and record a partial payment so the outstanding balance is tracked.

  * Acceptance: Invoice created, payment recorded, invoice status updated to partial/paid.
* As an admin, I want to see low stock alerts on the dashboard.

  * Acceptance: Dashboard shows variants below threshold and links to product.

---

# 23. Example REST payloads

**Create product**

```json
POST /api/admin/products
{
  "sku": "CUM001",
  "name": "Cumin Seeds",
  "description": "Premium cumin seeds",
  "category_id": 4,
  "type": "inhouse"
}
```

**Create variant**

```json
POST /api/admin/products/1/variants
{
  "sku": "CUM001-100G",
  "variant_name": "100g",
  "attributes": {"weight": 100, "unit": "gm"},
  "buy_price": 40.00,
  "sell_price": 60.00
}
```

**Record payment**

```json
POST /api/admin/invoices/INV-2025-0001/payments
{
  "amount": 200.00,
  "payment_method": "bank_transfer",
  "payment_date": "2025-12-05",
  "reference": "TXN12345"
}
```

---

# 24. Implementation tips & pitfalls

* Keep stock updates transactional: when receiving items or shipping, update `stock_movements` and any cached `stock_qty` inside a DB transaction.
* Avoid floating point for money; use decimals with fixed precision.
* Normalize product attributes but allow `attributes JSON` for flexible properties.
* Design APIs to be idempotent where possible (PO receive endpoint with idempotency keys).
* Keep audit logs for all inventory & financial changes.

---

# 25. Next steps (suggested)

* Finalize functional requirements & any missing features (returns, batch tracking).
* Prepare sample data and product list (your in-house products and supplier list).
* Create UX wireframes for public product page, product enquiry, admin product create, PO flow, invoice/payment screens.
* Start with backend schema + migrations and basic API auth skeleton, then iterate.

