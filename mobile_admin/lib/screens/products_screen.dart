import 'package:flutter/material.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../core/api_service.dart';
import '../core/app_theme.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class ProductsScreen extends StatefulWidget {
  const ProductsScreen({super.key});

  @override
  State<ProductsScreen> createState() => _ProductsScreenState();
}

class _ProductsScreenState extends State<ProductsScreen> {
  final _api = ApiService();
  final _searchController = TextEditingController();
  List<Product> _products = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadProducts() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getProducts(params: {'limit': 500});
      final data = res.data;
      final list = data is List ? data : (data['data'] ?? data['products'] ?? []);
      _products = (list as List).map((p) => Product.fromJson(p)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load products: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<Product> get _filteredProducts {
    if (_search.isEmpty) return _products;
    final term = _search.toLowerCase();
    return _products.where((p) =>
        p.name.toLowerCase().contains(term) ||
        p.sku.toLowerCase().contains(term) ||
        (p.categoryName?.toLowerCase().contains(term) ?? false)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Products', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.all(16),
            child: AppSearchBar(
              hint: 'Search products...',
              controller: _searchController,
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          // List
          Expanded(
            child: _loading
                ? const LoadingState()
                : _filteredProducts.isEmpty
                    ? const EmptyState(
                        icon: Icons.inventory_2,
                        title: 'No products found',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadProducts,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredProducts.length,
                          itemBuilder: (_, i) => _ProductCard(
                            product: _filteredProducts[i],
                            onTap: () => _showProductDetail(_filteredProducts[i]),
                          ),
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  void _showProductDetail(Product product) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => _ProductDetailScreen(product: product)),
    );
  }
}

class _ProductCard extends StatelessWidget {
  final Product product;
  final VoidCallback onTap;

  const _ProductCard({required this.product, required this.onTap});

  String get _imageUrl {
    final url = product.imageUrl;
    if (url == null || url.isEmpty) return '';
    if (url.startsWith('http')) return url;
    return '${ApiService.baseUrl.replaceAll(RegExp(r'/api$'), '')}$url';
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Image
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: SizedBox(
                  width: 60,
                  height: 60,
                  child: _imageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: _imageUrl,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(
                            color: Colors.grey.shade100,
                            child: const Icon(Icons.image, color: Colors.grey),
                          ),
                          errorWidget: (_, __, ___) => Container(
                            color: Colors.grey.shade100,
                            child: const Icon(Icons.inventory_2, color: Colors.grey),
                          ),
                        )
                      : Container(
                          color: Colors.grey.shade100,
                          child: const Icon(Icons.inventory_2, color: Colors.grey),
                        ),
                ),
              ),
              const SizedBox(width: 12),
              // Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(product.name,
                        style: const TextStyle(fontWeight: FontWeight.w600),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis),
                    const SizedBox(height: 2),
                    Text('SKU: ${product.sku}',
                        style: TextStyle(fontSize: 12, color: Colors.grey.shade600)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        if (product.categoryName != null)
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: AppTheme.primaryColor.withOpacity(0.1),
                              borderRadius: BorderRadius.circular(4),
                            ),
                            child: Text(product.categoryName!,
                                style: TextStyle(
                                    fontSize: 11, color: AppTheme.primaryColor)),
                          ),
                        const Spacer(),
                        Text(formatCurrency(product.minPrice),
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 15)),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Column(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: product.totalStock > 0
                          ? AppTheme.successColor.withOpacity(0.1)
                          : AppTheme.errorColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      '${product.totalStock.toInt()}',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                        color: product.totalStock > 0
                            ? AppTheme.successColor
                            : AppTheme.errorColor,
                      ),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text('stock', style: TextStyle(fontSize: 10, color: Colors.grey.shade500)),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProductDetailScreen extends StatelessWidget {
  final Product product;
  const _ProductDetailScreen({required this.product});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(product.name)),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Basic info
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const SectionHeader(title: 'Product Info'),
                  InfoRow(label: 'SKU', value: product.sku),
                  InfoRow(label: 'Category', value: product.categoryName ?? '-'),
                  InfoRow(label: 'Brand', value: product.brand ?? '-'),
                  InfoRow(
                    label: 'Status',
                    value: product.isActive ? 'Active' : 'Inactive',
                  ),
                  if (product.description != null && product.description!.isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text('Description',
                        style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(product.description!),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // Variants
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  SectionHeader(title: 'Variants (${product.variants.length})'),
                  if (product.variants.isEmpty)
                    const Text('No variants')
                  else
                    ...product.variants.map((v) => Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(v.variantName,
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                  ),
                                  StatusBadge(
                                    status: v.isLowStock ? 'pending' : 'confirmed',
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                              Row(
                                children: [
                                  _variantInfo('Price', formatCurrency(v.sellPrice)),
                                  _variantInfo('Cost', formatCurrency(v.buyPrice)),
                                  _variantInfo('Stock', '${v.stockQty.toInt()}'),
                                  _variantInfo('Tax', '${v.taxPercent}%'),
                                ],
                              ),
                            ],
                          ),
                        )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _variantInfo(String label, String value) {
    return Expanded(
      child: Column(
        children: [
          Text(value, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14)),
          Text(label, style: TextStyle(fontSize: 11, color: Colors.grey.shade500)),
        ],
      ),
    );
  }
}
