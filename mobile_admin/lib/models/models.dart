class Product {
  final int id;
  final String sku;
  final String name;
  final String slug;
  final String? description;
  final int? categoryId;
  final String? categoryName;
  final String? brand;
  final bool isActive;
  final String? defaultImage;
  final List<Variant> variants;
  final List<ProductImage> images;

  Product({
    required this.id,
    required this.sku,
    required this.name,
    required this.slug,
    this.description,
    this.categoryId,
    this.categoryName,
    this.brand,
    this.isActive = true,
    this.defaultImage,
    this.variants = const [],
    this.images = const [],
  });

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: json['id'] ?? 0,
      sku: json['sku'] ?? '',
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      categoryId: json['category_id'],
      categoryName: json['category_name'],
      brand: json['brand'],
      isActive: json['is_active'] == true || json['is_active'] == 1,
      defaultImage: json['default_image'],
      variants: (json['variants'] as List?)
              ?.map((v) => Variant.fromJson(v))
              .toList() ??
          [],
      images: (json['images'] as List?)
              ?.map((i) => ProductImage.fromJson(i))
              .toList() ??
          [],
    );
  }

  double get minPrice {
    if (variants.isEmpty) return 0;
    return variants.map((v) => v.sellPrice).reduce((a, b) => a < b ? a : b);
  }

  double get totalStock {
    return variants.fold(0, (sum, v) => sum + v.stockQty);
  }

  String? get imageUrl {
    if (images.isNotEmpty) return images.first.url;
    return defaultImage;
  }
}

class Variant {
  final int id;
  final int productId;
  final String sku;
  final String variantName;
  final double buyPrice;
  final double sellPrice;
  final double? comparePrice;
  final double taxPercent;
  final double stockQty;
  final int lowStockThreshold;
  final bool isActive;
  final String? weightUnit;
  final double? weight;

  Variant({
    required this.id,
    required this.productId,
    required this.sku,
    required this.variantName,
    this.buyPrice = 0,
    this.sellPrice = 0,
    this.comparePrice,
    this.taxPercent = 0,
    this.stockQty = 0,
    this.lowStockThreshold = 10,
    this.isActive = true,
    this.weightUnit,
    this.weight,
  });

  factory Variant.fromJson(Map<String, dynamic> json) {
    return Variant(
      id: json['id'] ?? 0,
      productId: json['product_id'] ?? 0,
      sku: json['sku'] ?? '',
      variantName: json['variant_name'] ?? '',
      buyPrice: _toDouble(json['buy_price']),
      sellPrice: _toDouble(json['sell_price']),
      comparePrice: json['compare_price'] != null ? _toDouble(json['compare_price']) : null,
      taxPercent: _toDouble(json['tax_percent']),
      stockQty: _toDouble(json['stock_qty']),
      lowStockThreshold: json['low_stock_threshold'] ?? 10,
      isActive: json['is_active'] == true || json['is_active'] == 1,
      weightUnit: json['weight_unit'],
      weight: json['weight'] != null ? _toDouble(json['weight']) : null,
    );
  }

  bool get isLowStock => stockQty <= lowStockThreshold;
}

class ProductImage {
  final int id;
  final String url;
  final String? altText;

  ProductImage({required this.id, required this.url, this.altText});

  factory ProductImage.fromJson(Map<String, dynamic> json) {
    return ProductImage(
      id: json['id'] ?? 0,
      url: json['url'] ?? '',
      altText: json['alt_text'],
    );
  }
}

class Category {
  final int id;
  final String name;
  final String slug;
  final String? description;
  final String? imageUrl;
  final bool isActive;
  final int sortOrder;
  final int? productCount;

  Category({
    required this.id,
    required this.name,
    required this.slug,
    this.description,
    this.imageUrl,
    this.isActive = true,
    this.sortOrder = 0,
    this.productCount,
  });

  factory Category.fromJson(Map<String, dynamic> json) {
    return Category(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      slug: json['slug'] ?? '',
      description: json['description'],
      imageUrl: json['image_url'],
      isActive: json['is_active'] == true || json['is_active'] == 1,
      sortOrder: json['sort_order'] ?? 0,
      productCount: json['product_count'],
    );
  }
}

class SalesOrder {
  final int id;
  final String orderNumber;
  final String customerName;
  final String? customerPhone;
  final String? customerEmail;
  final String status;
  final double subtotal;
  final double taxAmount;
  final double shippingAmount;
  final double discountAmount;
  final double totalAmount;
  final String? shippingAddress;
  final String? notes;
  final String? source;
  final String? createdAt;
  final List<OrderItem> items;

  SalesOrder({
    required this.id,
    required this.orderNumber,
    required this.customerName,
    this.customerPhone,
    this.customerEmail,
    required this.status,
    this.subtotal = 0,
    this.taxAmount = 0,
    this.shippingAmount = 0,
    this.discountAmount = 0,
    this.totalAmount = 0,
    this.shippingAddress,
    this.notes,
    this.source,
    this.createdAt,
    this.items = const [],
  });

  factory SalesOrder.fromJson(Map<String, dynamic> json) {
    return SalesOrder(
      id: json['id'] ?? 0,
      orderNumber: json['order_number'] ?? '',
      customerName: json['customer_name'] ?? '',
      customerPhone: json['customer_phone'],
      customerEmail: json['customer_email'],
      status: json['status'] ?? 'confirmed',
      subtotal: _toDouble(json['subtotal']),
      taxAmount: _toDouble(json['tax_amount']),
      shippingAmount: _toDouble(json['shipping_amount']),
      discountAmount: _toDouble(json['discount_amount']),
      totalAmount: _toDouble(json['total_amount']),
      shippingAddress: json['shipping_address'],
      notes: json['notes'],
      source: json['source'],
      createdAt: json['created_at'],
      items: (json['items'] as List?)
              ?.map((i) => OrderItem.fromJson(i))
              .toList() ??
          [],
    );
  }
}

class OrderItem {
  final int id;
  final int variantId;
  final String? productName;
  final String? variantName;
  final double quantity;
  final double unitPrice;
  final double taxPercent;
  final double totalLine;

  OrderItem({
    required this.id,
    required this.variantId,
    this.productName,
    this.variantName,
    this.quantity = 0,
    this.unitPrice = 0,
    this.taxPercent = 0,
    this.totalLine = 0,
  });

  factory OrderItem.fromJson(Map<String, dynamic> json) {
    return OrderItem(
      id: json['id'] ?? 0,
      variantId: json['variant_id'] ?? 0,
      productName: json['product_name'],
      variantName: json['variant_name'],
      quantity: _toDouble(json['quantity']),
      unitPrice: _toDouble(json['unit_price']),
      taxPercent: _toDouble(json['tax_percent']),
      totalLine: _toDouble(json['total_line']),
    );
  }
}

class StockItem {
  final int id;
  final String productName;
  final String variantName;
  final String sku;
  final String? categoryName;
  final double stockQty;
  final double buyPrice;
  final double sellPrice;
  final int lowStockThreshold;

  StockItem({
    required this.id,
    required this.productName,
    required this.variantName,
    required this.sku,
    this.categoryName,
    this.stockQty = 0,
    this.buyPrice = 0,
    this.sellPrice = 0,
    this.lowStockThreshold = 10,
  });

  factory StockItem.fromJson(Map<String, dynamic> json) {
    return StockItem(
      id: json['id'] ?? 0,
      productName: json['product_name'] ?? '',
      variantName: json['variant_name'] ?? '',
      sku: json['sku'] ?? '',
      categoryName: json['category_name'],
      stockQty: _toDouble(json['stock_qty']),
      buyPrice: _toDouble(json['buy_price']),
      sellPrice: _toDouble(json['sell_price']),
      lowStockThreshold: json['low_stock_threshold'] ?? 10,
    );
  }

  bool get isLowStock => stockQty <= lowStockThreshold;
  double get stockValue => stockQty * buyPrice;
}

class StockMovement {
  final int id;
  final String? productName;
  final String? variantName;
  final String? sku;
  final double changeQty;
  final String reason;
  final String? notes;
  final String? createdByName;
  final String? createdAt;

  StockMovement({
    required this.id,
    this.productName,
    this.variantName,
    this.sku,
    this.changeQty = 0,
    required this.reason,
    this.notes,
    this.createdByName,
    this.createdAt,
  });

  factory StockMovement.fromJson(Map<String, dynamic> json) {
    return StockMovement(
      id: json['id'] ?? 0,
      productName: json['product_name'],
      variantName: json['variant_name'],
      sku: json['sku'],
      changeQty: _toDouble(json['change_qty']),
      reason: json['reason'] ?? '',
      notes: json['notes'],
      createdByName: json['created_by_name'],
      createdAt: json['created_at'],
    );
  }
}

class PurchaseOrder {
  final int id;
  final String poNumber;
  final int supplierId;
  final String? supplierName;
  final String status;
  final double subtotal;
  final double taxAmount;
  final double totalAmount;
  final String? expectedDate;
  final String? notes;
  final String? createdAt;

  PurchaseOrder({
    required this.id,
    required this.poNumber,
    required this.supplierId,
    this.supplierName,
    required this.status,
    this.subtotal = 0,
    this.taxAmount = 0,
    this.totalAmount = 0,
    this.expectedDate,
    this.notes,
    this.createdAt,
  });

  factory PurchaseOrder.fromJson(Map<String, dynamic> json) {
    return PurchaseOrder(
      id: json['id'] ?? 0,
      poNumber: json['po_number'] ?? '',
      supplierId: json['supplier_id'] ?? 0,
      supplierName: json['supplier_name'],
      status: json['status'] ?? 'draft',
      subtotal: _toDouble(json['subtotal']),
      taxAmount: _toDouble(json['tax_amount']),
      totalAmount: _toDouble(json['total_amount']),
      expectedDate: json['expected_date'],
      notes: json['notes'],
      createdAt: json['created_at'],
    );
  }
}

class Supplier {
  final int id;
  final String name;
  final String? contactPerson;
  final String? phone;
  final String? email;
  final String? address;
  final String? city;
  final String? state;
  final String? gstNumber;
  final bool isActive;

  Supplier({
    required this.id,
    required this.name,
    this.contactPerson,
    this.phone,
    this.email,
    this.address,
    this.city,
    this.state,
    this.gstNumber,
    this.isActive = true,
  });

  factory Supplier.fromJson(Map<String, dynamic> json) {
    return Supplier(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      contactPerson: json['contact_person'],
      phone: json['phone'],
      email: json['email'],
      address: json['address'],
      city: json['city'],
      state: json['state'],
      gstNumber: json['gst_number'],
      isActive: json['is_active'] == true || json['is_active'] == 1,
    );
  }
}

class ReturnOrder {
  final int id;
  final String returnNumber;
  final int salesOrderId;
  final String? orderNumber;
  final String status;
  final String? reason;
  final double totalAmount;
  final double? refundAmount;
  final String? createdAt;

  ReturnOrder({
    required this.id,
    required this.returnNumber,
    required this.salesOrderId,
    this.orderNumber,
    required this.status,
    this.reason,
    this.totalAmount = 0,
    this.refundAmount,
    this.createdAt,
  });

  factory ReturnOrder.fromJson(Map<String, dynamic> json) {
    return ReturnOrder(
      id: json['id'] ?? 0,
      returnNumber: json['return_number'] ?? '',
      salesOrderId: json['sales_order_id'] ?? 0,
      orderNumber: json['order_number'],
      status: json['status'] ?? 'pending',
      reason: json['reason'],
      totalAmount: _toDouble(json['total_amount']),
      refundAmount: json['refund_amount'] != null ? _toDouble(json['refund_amount']) : null,
      createdAt: json['created_at'],
    );
  }
}

// Helper
double _toDouble(dynamic val) {
  if (val == null) return 0;
  if (val is double) return val;
  if (val is int) return val.toDouble();
  if (val is String) return double.tryParse(val) ?? 0;
  return 0;
}
