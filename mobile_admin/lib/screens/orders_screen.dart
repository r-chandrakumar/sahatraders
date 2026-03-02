import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/app_theme.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class OrdersScreen extends StatefulWidget {
  const OrdersScreen({super.key});

  @override
  State<OrdersScreen> createState() => _OrdersScreenState();
}

class _OrdersScreenState extends State<OrdersScreen> {
  final _api = ApiService();
  final _searchController = TextEditingController();
  List<SalesOrder> _orders = [];
  bool _loading = true;
  String _search = '';
  String _statusFilter = 'all';

  static const _statuses = [
    'all', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
  ];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    try {
      final params = <String, dynamic>{'limit': 200};
      if (_statusFilter != 'all') params['status'] = _statusFilter;

      final res = await _api.getOrders(params: params);
      final data = res.data;
      final list = data is List ? data : (data['data'] ?? data['orders'] ?? []);
      _orders = (list as List).map((o) => SalesOrder.fromJson(o)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load orders: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<SalesOrder> get _filteredOrders {
    if (_search.isEmpty) return _orders;
    final term = _search.toLowerCase();
    return _orders.where((o) =>
        o.orderNumber.toLowerCase().contains(term) ||
        o.customerName.toLowerCase().contains(term) ||
        (o.customerPhone?.contains(term) ?? false)).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Orders', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Search
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: AppSearchBar(
              hint: 'Search orders...',
              controller: _searchController,
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          // Status Filters
          SizedBox(
            height: 40,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              children: _statuses.map((s) {
                final selected = s == _statusFilter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(s == 'all' ? 'All' : s.replaceAll('_', ' ').toUpperCase(),
                        style: TextStyle(fontSize: 12,
                            color: selected ? Colors.white : null)),
                    selected: selected,
                    selectedColor: AppTheme.primaryColor,
                    onSelected: (_) {
                      setState(() => _statusFilter = s);
                      _loadOrders();
                    },
                  ),
                );
              }).toList(),
            ),
          ),
          const SizedBox(height: 8),
          // Orders List
          Expanded(
            child: _loading
                ? const LoadingState()
                : _filteredOrders.isEmpty
                    ? const EmptyState(
                        icon: Icons.receipt_long,
                        title: 'No orders found',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadOrders,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filteredOrders.length,
                          itemBuilder: (_, i) {
                            final order = _filteredOrders[i];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: InkWell(
                                onTap: () => _showOrderDetail(order),
                                borderRadius: BorderRadius.circular(12),
                                child: Padding(
                                  padding: const EdgeInsets.all(14),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment:
                                            MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(order.orderNumber,
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold)),
                                          StatusBadge(status: order.status),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(Icons.person_outline,
                                              size: 16, color: Colors.grey.shade500),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(order.customerName,
                                                style: const TextStyle(fontSize: 14)),
                                          ),
                                          Text(formatCurrency(order.totalAmount),
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.w600,
                                                  fontSize: 15)),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(Icons.access_time,
                                              size: 14, color: Colors.grey.shade400),
                                          const SizedBox(width: 4),
                                          Text(formatDateTime(order.createdAt),
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey.shade500)),
                                          if (order.source != null) ...[
                                            const Spacer(),
                                            Text(order.source!,
                                                style: TextStyle(
                                                    fontSize: 11,
                                                    color: Colors.grey.shade500)),
                                          ],
                                        ],
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }

  void _showOrderDetail(SalesOrder order) {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => _OrderDetailScreen(orderId: order.id)),
    );
  }
}

class _OrderDetailScreen extends StatefulWidget {
  final int orderId;
  const _OrderDetailScreen({required this.orderId});

  @override
  State<_OrderDetailScreen> createState() => _OrderDetailScreenState();
}

class _OrderDetailScreenState extends State<_OrderDetailScreen> {
  final _api = ApiService();
  SalesOrder? _order;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadOrder();
  }

  Future<void> _loadOrder() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getOrder(widget.orderId);
      final data = res.data;
      final orderData = data is Map && data.containsKey('data') ? data['data'] : data;
      _order = SalesOrder.fromJson(orderData);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load order: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  void _updateStatus(String newStatus) async {
    try {
      await _api.updateOrder(_order!.id, {'status': newStatus});
      _loadOrder();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Status updated to $newStatus')),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order')),
        body: const LoadingState(),
      );
    }

    final order = _order;
    if (order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Order')),
        body: const EmptyState(icon: Icons.error, title: 'Order not found'),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: Text(order.orderNumber),
        actions: [
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert),
            onSelected: _updateStatus,
            itemBuilder: (_) => [
              'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'
            ].map((s) => PopupMenuItem(
                  value: s,
                  child: Text(s.replaceAll('_', ' ').toUpperCase()),
                )).toList(),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadOrder,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Status
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Status', style: TextStyle(fontSize: 16)),
                    StatusBadge(status: order.status, fontSize: 13),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Customer
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(title: 'Customer'),
                    InfoRow(label: 'Name', value: order.customerName, bold: true),
                    InfoRow(label: 'Phone', value: order.customerPhone ?? '-'),
                    InfoRow(label: 'Email', value: order.customerEmail ?? '-'),
                    if (order.shippingAddress != null)
                      InfoRow(label: 'Address', value: order.shippingAddress!),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Items
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    SectionHeader(title: 'Items (${order.items.length})'),
                    ...order.items.map((item) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(item.productName ?? 'Product',
                                        style: const TextStyle(fontWeight: FontWeight.w600)),
                                    if (item.variantName != null)
                                      Text(item.variantName!,
                                          style: TextStyle(
                                              fontSize: 12, color: Colors.grey.shade600)),
                                  ],
                                ),
                              ),
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.end,
                                children: [
                                  Text('${item.quantity.toInt()} x ${formatCurrency(item.unitPrice)}',
                                      style: const TextStyle(fontSize: 13)),
                                  Text(formatCurrency(item.totalLine),
                                      style: const TextStyle(fontWeight: FontWeight.w600)),
                                ],
                              ),
                            ],
                          ),
                        )),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 12),

            // Totals
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const SectionHeader(title: 'Summary'),
                    InfoRow(label: 'Subtotal', value: formatCurrency(order.subtotal)),
                    InfoRow(label: 'Tax', value: formatCurrency(order.taxAmount)),
                    InfoRow(label: 'Shipping', value: formatCurrency(order.shippingAmount)),
                    if (order.discountAmount > 0)
                      InfoRow(label: 'Discount', value: '-${formatCurrency(order.discountAmount)}'),
                    const Divider(),
                    InfoRow(label: 'Total', value: formatCurrency(order.totalAmount), bold: true),
                  ],
                ),
              ),
            ),

            if (order.notes != null && order.notes!.isNotEmpty) ...[
              const SizedBox(height: 12),
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SectionHeader(title: 'Notes'),
                      Text(order.notes!),
                    ],
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
