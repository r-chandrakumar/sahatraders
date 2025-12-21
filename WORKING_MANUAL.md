# Sahaa Traders - Application Working Manual

## System Overview

Sahaa Traders is a complete e-commerce and inventory management system consisting of three main components:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         SAHAA TRADERS SYSTEM                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐          │
│  │   PUBLIC SITE    │  │    ADMIN APP     │  │     BACKEND      │          │
│  │   (Port 3000)    │  │   (Port 3001)    │  │   (Port 5000)    │          │
│  │                  │  │                  │  │                  │          │
│  │  - Product View  │  │  - Dashboard     │  │  - REST API      │          │
│  │  - Enquiry Form  │  │  - Orders        │  │  - MySQL DB      │          │
│  │  - Customer      │  │  - Products      │  │  - Auth/JWT      │          │
│  │    Portal        │  │  - Inventory     │  │  - File Upload   │          │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘          │
│           │                     │                     │                     │
│           └─────────────────────┴─────────────────────┘                     │
│                                 │                                           │
│                    ┌────────────▼────────────┐                              │
│                    │      MySQL DATABASE     │                              │
│                    │    (sahaa_traders)      │                              │
│                    └─────────────────────────┘                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 1. USER ROLES & ACCESS

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER HIERARCHY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐                                           │
│  │   SUPER ADMIN   │  Full system access                       │
│  │                 │  - All features                           │
│  │                 │  - User management                        │
│  │                 │  - System settings                        │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │     ADMIN       │  Management access                        │
│  │                 │  - Products, Orders, Inventory            │
│  │                 │  - Reports, Customers                     │
│  │                 │  - Cannot manage users                    │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │  SALES CLERK    │  Limited access                           │
│  │                 │  - Create orders                          │
│  │                 │  - View products                          │
│  │                 │  - Handle enquiries                       │
│  └────────┬────────┘                                           │
│           │                                                     │
│  ┌────────▼────────┐                                           │
│  │    CUSTOMER     │  Public site access                       │
│  │   (Optional)    │  - Browse products                        │
│  │                 │  - Submit enquiries                       │
│  │                 │  - Track orders                           │
│  └─────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. COMPLETE BUSINESS CYCLE

### A. Product & Inventory Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PRODUCT & INVENTORY CYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐                                                           │
│  │  1. CREATE  │                                                           │
│  │   CATEGORY  │                                                           │
│  └──────┬──────┘                                                           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  2. CREATE  │────▶│  3. CREATE  │────▶│  4. SET     │                   │
│  │   PRODUCT   │     │   VARIANTS  │     │   PRICING   │                   │
│  └─────────────┘     └─────────────┘     └──────┬──────┘                   │
│                                                  │                          │
│         ┌────────────────────────────────────────┘                          │
│         ▼                                                                   │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                   │
│  │  5. ADD     │────▶│  6. STOCK   │────▶│  7. PRODUCT │                   │
│  │   SUPPLIER  │     │  LOCATIONS  │     │   READY!    │                   │
│  └─────────────┘     └─────────────┘     └─────────────┘                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Step-by-Step:**

1. **Create Category** (Admin → Products → Categories)
   - Name, slug, description
   - Parent category (optional)
   - Category image

2. **Create Product** (Admin → Products → Add New)
   - Basic info: Name, description, HSN code
   - Assign category
   - Upload images

3. **Create Variants** (Within Product)
   - Variant name (e.g., "500g", "Red", "Large")
   - SKU (Stock Keeping Unit)
   - Barcode (optional)

4. **Set Pricing**
   - Cost price (purchase price)
   - Selling price (MRP)
   - Tax percentage (GST)

5. **Add Supplier** (Admin → Suppliers)
   - Supplier details
   - Link products to supplier

6. **Stock Locations** (Admin → Inventory → Locations)
   - Warehouse, Store, etc.
   - Set default location

7. **Product is now ready for sale!**

---

### B. Purchase Order Cycle (Buying Stock)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PURCHASE ORDER CYCLE                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────┐                                                          │
│  │   SUPPLIER   │                                                          │
│  └──────┬───────┘                                                          │
│         │                                                                   │
│         ▼                                                                   │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                │
│  │  1. CREATE   │────▶│  2. STATUS:  │────▶│  3. STATUS:  │                │
│  │  PURCHASE    │     │    SENT      │     │   RECEIVED   │                │
│  │    ORDER     │     │              │     │              │                │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                │
│                                                    │                        │
│                                    ┌───────────────┘                        │
│                                    ▼                                        │
│                            ┌──────────────┐                                │
│                            │  4. STOCK    │                                │
│                            │   UPDATED    │                                │
│                            │  (+quantity) │                                │
│                            └──────┬───────┘                                │
│                                   │                                        │
│                                   ▼                                        │
│                            ┌──────────────┐                                │
│                            │  5. STOCK    │                                │
│                            │  MOVEMENT    │                                │
│                            │   LOGGED     │                                │
│                            └──────────────┘                                │
│                                                                             │
│  STATUS FLOW:                                                              │
│  draft → sent → partial → received → cancelled                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Purchase Order Data:**
```
┌────────────────────────────────────────┐
│           PURCHASE ORDER               │
├────────────────────────────────────────┤
│  PO Number: PO-20241208-001            │
│  Supplier: ABC Supplies                │
│  Status: received                      │
│  ──────────────────────────────────    │
│  ITEMS:                                │
│  ├─ Product A (500g) × 100 @ ₹50      │
│  ├─ Product B (1kg) × 50 @ ₹120       │
│  └─ Product C (250g) × 200 @ ₹25      │
│  ──────────────────────────────────    │
│  Subtotal: ₹16,000                     │
│  Tax (18%): ₹2,880                     │
│  Total: ₹18,880                        │
└────────────────────────────────────────┘
```

---

### C. Sales Order Cycle (Selling to Customers)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        SALES ORDER CYCLE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ENTRY POINTS:                                                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                            │
│  │  ENQUIRY   │  │   PHONE    │  │   WALK-IN  │                            │
│  │  (Website) │  │   ORDER    │  │  (Counter) │                            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘                            │
│        │               │               │                                    │
│        └───────────────┼───────────────┘                                    │
│                        ▼                                                    │
│               ┌────────────────┐                                           │
│               │  SALES ORDER   │                                           │
│               │    CREATED     │                                           │
│               └───────┬────────┘                                           │
│                       │                                                     │
│     ┌─────────────────┼─────────────────┐                                  │
│     ▼                 ▼                 ▼                                  │
│  ┌────────┐    ┌────────────┐    ┌────────────┐                            │
│  │PENDING │───▶│ CONFIRMED  │───▶│ PROCESSING │                            │
│  └────────┘    └────────────┘    └─────┬──────┘                            │
│                                        │                                    │
│                    ┌───────────────────┘                                    │
│                    ▼                                                        │
│             ┌────────────┐     ┌────────────┐     ┌────────────┐           │
│             │  SHIPPED   │────▶│ DELIVERED  │────▶│ COMPLETED  │           │
│             │            │     │            │     │            │           │
│             │ (Stock -X) │     │            │     │            │           │
│             └────────────┘     └────────────┘     └────────────┘           │
│                    │                                                        │
│                    │ (If cancelled)                                         │
│                    ▼                                                        │
│             ┌────────────┐                                                 │
│             │ CANCELLED  │                                                 │
│             │ (Stock +X) │ ← Stock restored                                │
│             └────────────┘                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Order Status Meanings:**
| Status | Description | Stock Impact |
|--------|-------------|--------------|
| pending | Order created, awaiting confirmation | None |
| confirmed | Order confirmed, ready to process | None |
| processing | Order being packed | None |
| shipped | Order dispatched | **Stock Deducted** |
| delivered | Customer received order | None |
| completed | Order fully complete | None |
| cancelled | Order cancelled | Stock Restored (if shipped) |

---

### D. Enquiry to Order Conversion

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ENQUIRY TO ORDER FLOW                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  PUBLIC WEBSITE                          ADMIN PANEL                       │
│  ─────────────                           ───────────                        │
│                                                                             │
│  ┌────────────────┐                                                        │
│  │ Customer fills │                                                        │
│  │ enquiry form   │                                                        │
│  │ with products  │                                                        │
│  └───────┬────────┘                                                        │
│          │                                                                  │
│          ▼                                                                  │
│  ┌────────────────┐     ┌────────────────┐                                 │
│  │   ENQUIRY      │────▶│  Admin views   │                                 │
│  │   CREATED      │     │   enquiry      │                                 │
│  │ Status: new    │     │                │                                 │
│  └────────────────┘     └───────┬────────┘                                 │
│                                 │                                           │
│                                 ▼                                           │
│                         ┌────────────────┐                                 │
│                         │ Contact        │                                 │
│                         │ Customer       │                                 │
│                         │ Status:        │                                 │
│                         │ contacted      │                                 │
│                         └───────┬────────┘                                 │
│                                 │                                           │
│              ┌──────────────────┼──────────────────┐                       │
│              ▼                  ▼                  ▼                       │
│     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐              │
│     │   CONVERTED    │ │    CLOSED      │ │   CANCELLED    │              │
│     │ (Create Order) │ │ (Not buying)   │ │ (Invalid)      │              │
│     └───────┬────────┘ └────────────────┘ └────────────────┘              │
│             │                                                              │
│             ▼                                                              │
│     ┌────────────────┐                                                    │
│     │  SALES ORDER   │                                                    │
│     │   CREATED      │                                                    │
│     │ with customer  │                                                    │
│     │ & product data │                                                    │
│     └────────────────┘                                                    │
│                                                                             │
│  ENQUIRY STATUS FLOW:                                                      │
│  new → contacted → quoted → converted/closed/cancelled                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### E. Payment & Invoice Cycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      PAYMENT & INVOICE CYCLE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────┐                                                        │
│  │  SALES ORDER   │                                                        │
│  │ Total: ₹10,000 │                                                        │
│  └───────┬────────┘                                                        │
│          │                                                                  │
│          ▼                                                                  │
│  ┌────────────────┐     PAYMENT METHODS:                                   │
│  │ CREATE INVOICE │     ├─ Cash                                            │
│  │ INV-20241208   │     ├─ Bank Transfer                                   │
│  └───────┬────────┘     ├─ UPI                                             │
│          │              ├─ Cheque                                          │
│          │              └─ Credit (Pay Later)                              │
│          ▼                                                                  │
│  ┌────────────────────────────────────────────┐                            │
│  │              PAYMENTS                       │                            │
│  ├────────────────────────────────────────────┤                            │
│  │  Payment 1: ₹5,000 (Cash) - Dec 8          │                            │
│  │  Payment 2: ₹3,000 (UPI) - Dec 10          │                            │
│  │  Payment 3: ₹2,000 (Bank) - Dec 15         │                            │
│  ├────────────────────────────────────────────┤                            │
│  │  Total Paid: ₹10,000                       │                            │
│  │  Balance: ₹0 ✓                             │                            │
│  └────────────────────────────────────────────┘                            │
│                                                                             │
│  PAYMENT STATUS:                                                           │
│  ┌─────────┐  ┌─────────────┐  ┌──────────┐                               │
│  │ UNPAID  │─▶│   PARTIAL   │─▶│   PAID   │                               │
│  │ ₹0/₹10K │  │ ₹5K/₹10K    │  │₹10K/₹10K │                               │
│  └─────────┘  └─────────────┘  └──────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### F. Stock Movement & Inventory

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      STOCK MOVEMENT TRACKING                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  STOCK INCREASES (+)              STOCK DECREASES (-)                      │
│  ──────────────────              ───────────────────                        │
│  ├─ Purchase Order               ├─ Sales Order (Shipped)                  │
│  │  (Goods received)             │  (Goods dispatched)                     │
│  │                               │                                         │
│  ├─ Stock Adjustment             ├─ Stock Adjustment                       │
│  │  (Found items)                │  (Damaged/Lost)                         │
│  │                               │                                         │
│  ├─ Transfer IN                  ├─ Transfer OUT                           │
│  │  (From other location)        │  (To other location)                    │
│  │                               │                                         │
│  └─ Return from Customer         └─ Return to Supplier                     │
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────┐          │
│  │                    STOCK MOVEMENT LOG                         │          │
│  ├──────────────────────────────────────────────────────────────┤          │
│  │  Date       │ Product    │ Change │ Reason     │ Reference   │          │
│  ├─────────────┼────────────┼────────┼────────────┼─────────────┤          │
│  │  Dec 8, 10AM│ Rice 5kg   │  +100  │ Purchase   │ PO-001      │          │
│  │  Dec 8, 2PM │ Rice 5kg   │   -5   │ Sale       │ SO-001      │          │
│  │  Dec 8, 4PM │ Rice 5kg   │   -2   │ Damaged    │ ADJ-001     │          │
│  │  Dec 9, 9AM │ Rice 5kg   │  -10   │ Sale       │ SO-002      │          │
│  ├─────────────┴────────────┴────────┴────────────┴─────────────┤          │
│  │  Current Stock: 83 units                                      │          │
│  └──────────────────────────────────────────────────────────────┘          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. DATABASE SCHEMA RELATIONSHIPS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE RELATIONSHIPS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │ CATEGORIES  │◄────────│  PRODUCTS   │────────▶│  SUPPLIERS  │           │
│  └─────────────┘         └──────┬──────┘         └─────────────┘           │
│                                 │                       │                   │
│                                 ▼                       │                   │
│                          ┌─────────────┐                │                   │
│                          │  VARIANTS   │                │                   │
│                          └──────┬──────┘                │                   │
│                                 │                       │                   │
│         ┌───────────────────────┼───────────────────────┤                   │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │SALES_ORDER_ │         │   STOCK_    │         │ PURCHASE_   │           │
│  │   ITEMS     │         │  MOVEMENTS  │         │ ORDER_ITEMS │           │
│  └──────┬──────┘         └─────────────┘         └──────┬──────┘           │
│         │                                               │                   │
│         ▼                                               ▼                   │
│  ┌─────────────┐                                 ┌─────────────┐           │
│  │SALES_ORDERS │                                 │ PURCHASE_   │           │
│  └──────┬──────┘                                 │   ORDERS    │           │
│         │                                        └─────────────┘           │
│         │                                                                   │
│         ▼                                                                   │
│  ┌─────────────┐         ┌─────────────┐         ┌─────────────┐           │
│  │  CUSTOMERS  │         │  PAYMENTS   │         │  INVOICES   │           │
│  └─────────────┘         └─────────────┘         └─────────────┘           │
│                                                                             │
│  ┌─────────────┐         ┌─────────────┐                                   │
│  │  ENQUIRIES  │────────▶│  ENQUIRY_   │                                   │
│  └─────────────┘         │   ITEMS     │                                   │
│                          └─────────────┘                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. ADMIN PANEL NAVIGATION

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        ADMIN PANEL MENU                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  📊 DASHBOARD                                                              │
│  └── Overview, Stats, Recent Activity                                      │
│                                                                             │
│  📦 PRODUCTS                                                               │
│  ├── All Products (List, Add, Edit, Delete)                                │
│  ├── Categories (Manage categories)                                        │
│  └── Brands (Optional)                                                     │
│                                                                             │
│  🛒 ORDERS                                                                 │
│  ├── All Orders (Sales orders list)                                        │
│  ├── New Order (Create sales order)                                        │
│  └── Order Details (View, Edit status)                                     │
│                                                                             │
│  📋 ENQUIRIES                                                              │
│  ├── All Enquiries                                                         │
│  └── Convert to Order                                                      │
│                                                                             │
│  📦 INVENTORY                                                              │
│  ├── Stock Overview                                                        │
│  ├── Stock Movements                                                       │
│  ├── Locations (Warehouses)                                                │
│  └── Adjustments                                                           │
│                                                                             │
│  🚚 PURCHASE ORDERS                                                        │
│  ├── All POs                                                               │
│  ├── Create PO                                                             │
│  └── Receive Goods                                                         │
│                                                                             │
│  🏭 SUPPLIERS                                                              │
│  ├── All Suppliers                                                         │
│  ├── Add Supplier                                                          │
│  └── Supplier Details (Orders, Products)                                   │
│                                                                             │
│  👥 CUSTOMERS                                                              │
│  ├── All Customers                                                         │
│  └── Customer Details (Orders, Stats)                                      │
│                                                                             │
│  📊 REPORTS                                                                │
│  ├── Sales Report                                                          │
│  ├── Inventory Report                                                      │
│  └── Customer Report                                                       │
│                                                                             │
│  ⚙️ SETTINGS                                                               │
│  ├── Users & Roles                                                         │
│  ├── Company Info                                                          │
│  └── Tax Settings                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. HOW TO USE - STEP BY STEP GUIDES

### 5.1 Setting Up Products (First Time)

```
STEP 1: Create Categories
─────────────────────────
Admin → Products → Categories → Add New
├─ Name: "Rice & Grains"
├─ Slug: "rice-grains" (auto-generated)
└─ Description: "All rice and grain products"

STEP 2: Create Product
──────────────────────
Admin → Products → Add New
├─ Name: "Basmati Rice Premium"
├─ Category: "Rice & Grains"
├─ Description: "Premium quality basmati rice"
├─ HSN Code: "1006" (for GST)
└─ Images: Upload product images

STEP 3: Add Variants
────────────────────
Within Product → Variants tab → Add Variant
├─ Variant 1:
│   ├─ Name: "1 kg Pack"
│   ├─ SKU: "RICE-BAS-1KG"
│   ├─ Cost Price: ₹80
│   ├─ Selling Price: ₹120
│   └─ GST: 5%
│
└─ Variant 2:
    ├─ Name: "5 kg Pack"
    ├─ SKU: "RICE-BAS-5KG"
    ├─ Cost Price: ₹380
    ├─ Selling Price: ₹550
    └─ GST: 5%

STEP 4: Add Supplier
────────────────────
Admin → Suppliers → Add New
├─ Name: "ABC Rice Mills"
├─ Contact: "John Doe"
├─ Phone: "9876543210"
├─ Email: "abc@rice.com"
└─ Address: "123 Mill Road"

STEP 5: Create Purchase Order
─────────────────────────────
Admin → Purchase Orders → Create New
├─ Supplier: "ABC Rice Mills"
├─ Items:
│   ├─ Basmati Rice 1kg × 100 @ ₹80
│   └─ Basmati Rice 5kg × 50 @ ₹380
└─ Submit → Send to Supplier

STEP 6: Receive Goods
─────────────────────
When goods arrive:
Purchase Order → Mark as Received
└─ Stock automatically updated!
```

---

### 5.2 Processing a Customer Order

```
SCENARIO: Phone order from customer

STEP 1: Create Sales Order
──────────────────────────
Admin → Orders → New Order

STEP 2: Select/Enter Customer
─────────────────────────────
├─ Option A: Select existing customer
│   └─ Search by name/phone
│   └─ Details auto-filled
│
└─ Option B: New customer
    ├─ Name: "Ravi Kumar"
    ├─ Phone: "9876543210"
    ├─ Email: "ravi@email.com"
    └─ Address: "45 MG Road, Bangalore"

STEP 3: Add Products
────────────────────
Search products → Add to order
├─ Basmati Rice 5kg × 2 @ ₹550
├─ Sugar 1kg × 5 @ ₹45
└─ Oil 1L × 3 @ ₹180

STEP 4: Review & Create
───────────────────────
├─ Subtotal: ₹1,865
├─ GST (5%): ₹93.25
├─ Shipping: ₹50
├─ Total: ₹2,008.25
└─ Click "Create Order"

STEP 5: Process Order
─────────────────────
Order Status Flow:
confirmed → processing → shipped → delivered

When shipped:
└─ Stock automatically deducted!

STEP 6: Record Payment
──────────────────────
Order → Add Payment
├─ Amount: ₹2,008.25
├─ Method: UPI
└─ Reference: "TXN123456"
```

---

### 5.3 Handling Website Enquiries

```
CUSTOMER SUBMITS ENQUIRY (Public Website)
─────────────────────────────────────────
├─ Name: "Priya Sharma"
├─ Phone: "9123456789"
├─ Products:
│   ├─ Rice 5kg × 3
│   └─ Dal 1kg × 5
└─ Message: "Need delivery to Whitefield"

ADMIN RECEIVES ENQUIRY
──────────────────────
Admin → Enquiries → View New Enquiry

STEP 1: Contact Customer
────────────────────────
├─ Call customer
├─ Discuss products, pricing, delivery
└─ Update status: "contacted"

STEP 2: If Customer Confirms
────────────────────────────
Click "Convert to Order"
├─ Customer details copied
├─ Products copied
├─ Create sales order
└─ Enquiry status: "converted"

STEP 3: If Customer Declines
────────────────────────────
Update status: "closed"
Add note: "Price too high" or "Not interested"
```

---

## 6. DATA FLOW SUMMARY

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    COMPLETE DATA FLOW                                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                        ┌───────────────────┐                               │
│                        │   PUBLIC WEBSITE  │                               │
│                        └─────────┬─────────┘                               │
│                                  │                                          │
│                          [Browse Products]                                  │
│                          [Submit Enquiry]                                   │
│                                  │                                          │
│                                  ▼                                          │
│  ┌───────────────┐      ┌───────────────┐      ┌───────────────┐          │
│  │   SUPPLIERS   │──────│    BACKEND    │──────│   CUSTOMERS   │          │
│  └───────┬───────┘      │     API       │      └───────┬───────┘          │
│          │              └───────┬───────┘              │                   │
│          │                      │                      │                   │
│  [Purchase Orders]       [All Operations]      [Sales Orders]              │
│          │                      │                      │                   │
│          │                      ▼                      │                   │
│          │           ┌─────────────────────┐          │                   │
│          └──────────▶│   MySQL DATABASE    │◀─────────┘                   │
│                      │                     │                               │
│                      │  ├─ products        │                               │
│                      │  ├─ variants        │                               │
│                      │  ├─ categories      │                               │
│                      │  ├─ sales_orders    │                               │
│                      │  ├─ purchase_orders │                               │
│                      │  ├─ customers       │                               │
│                      │  ├─ suppliers       │                               │
│                      │  ├─ stock_movements │                               │
│                      │  ├─ payments        │                               │
│                      │  ├─ enquiries       │                               │
│                      │  └─ users           │                               │
│                      └─────────────────────┘                               │
│                                  │                                          │
│                                  ▼                                          │
│                        ┌───────────────────┐                               │
│                        │    ADMIN APP      │                               │
│                        │                   │                               │
│                        │ - Manage Products │                               │
│                        │ - Process Orders  │                               │
│                        │ - Track Inventory │                               │
│                        │ - Handle Payments │                               │
│                        │ - View Reports    │                               │
│                        └───────────────────┘                               │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. COMMON WORKFLOWS QUICK REFERENCE

| Task | Navigation | Key Steps |
|------|------------|-----------|
| Add new product | Products → Add | Fill details → Add variants → Save |
| Create sale order | Orders → New | Select customer → Add items → Create |
| Receive purchase | PO → View → Receive | Mark as received → Stock updates |
| Handle enquiry | Enquiries → View | Contact → Convert to order |
| Check stock | Inventory → Overview | Search product → View stock |
| Add payment | Orders → View → Payment | Enter amount → Save |
| View customer history | Customers → View | See orders, spending, products |
| View supplier products | Suppliers → View | See POs, purchased products |

---

## 8. TROUBLESHOOTING

| Issue | Cause | Solution |
|-------|-------|----------|
| Stock not updating | Order not shipped | Change status to "shipped" |
| Customer not linked | Phone mismatch | Update customer phone or link manually |
| Enquiry items missing | Old enquiry format | Re-submit from website |
| Payment not showing | Wrong order | Check order ID |
| Product not searchable | Inactive status | Activate product/variant |

---

## 9. API ENDPOINTS REFERENCE

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/products` | GET/POST | List/Create products |
| `/admin/sales-orders` | GET/POST | List/Create orders |
| `/admin/purchase-orders` | GET/POST | List/Create POs |
| `/customer/admin/list` | GET | List all customers |
| `/admin/suppliers` | GET/POST | List/Create suppliers |
| `/enquiry` | GET/POST | List/Create enquiries |
| `/admin/inventory/movements` | GET | Stock movement history |

---

## 10. STARTUP COMMANDS

```bash
# Start Backend (Port 5000)
cd backend
npm run dev

# Start Admin App (Port 3001)
cd admin-app
npm run dev

# Start Public Site (Port 3000)
cd public-site
npm run dev
```

---

**Document Version:** 1.0
**Last Updated:** December 2024
