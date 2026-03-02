import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/app_theme.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class PurchaseOrdersScreen extends StatefulWidget {
  const PurchaseOrdersScreen({super.key});

  @override
  State<PurchaseOrdersScreen> createState() => _PurchaseOrdersScreenState();
}

class _PurchaseOrdersScreenState extends State<PurchaseOrdersScreen> {
  final _api = ApiService();
  List<PurchaseOrder> _orders = [];
  bool _loading = true;
  String _statusFilter = 'all';

  static const _statuses = ['all', 'draft', 'ordered', 'partial', 'received', 'cancelled'];

  @override
  void initState() {
    super.initState();
    _loadOrders();
  }

  Future<void> _loadOrders() async {
    setState(() => _loading = true);
    try {
      final params = <String, dynamic>{'limit': 200};
      if (_statusFilter != 'all') params['status'] = _statusFilter;

      final res = await _api.getPurchaseOrders(params: params);
      final data = res.data;
      final list = data is List ? data : (data['data'] ?? data['purchaseOrders'] ?? []);
      _orders = (list as List).map((o) => PurchaseOrder.fromJson(o)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load POs: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  void _showReceiveDialog(PurchaseOrder po) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text('Receive ${po.poNumber}'),
        content: const Text('Mark this purchase order as received? This will update inventory stock levels.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await _api.receivePurchaseOrder(po.id, {'status': 'received'});
                _loadOrders();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('PO marked as received')),
                  );
                }
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            child: const Text('Receive'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Purchase Orders',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Status Filters
          SizedBox(
            height: 50,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              children: _statuses.map((s) {
                final selected = s == _statusFilter;
                return Padding(
                  padding: const EdgeInsets.only(right: 8),
                  child: FilterChip(
                    label: Text(
                      s == 'all' ? 'All' : s.toUpperCase(),
                      style: TextStyle(fontSize: 12, color: selected ? Colors.white : null),
                    ),
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
          // List
          Expanded(
            child: _loading
                ? const LoadingState()
                : _orders.isEmpty
                    ? const EmptyState(
                        icon: Icons.local_shipping,
                        title: 'No purchase orders',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadOrders,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _orders.length,
                          itemBuilder: (_, i) {
                            final po = _orders[i];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: InkWell(
                                onTap: po.status == 'ordered'
                                    ? () => _showReceiveDialog(po)
                                    : null,
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
                                          Text(po.poNumber,
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold)),
                                          StatusBadge(status: po.status),
                                        ],
                                      ),
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          Icon(Icons.business,
                                              size: 16, color: Colors.grey.shade500),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(po.supplierName ?? 'Supplier #${po.supplierId}',
                                                style: const TextStyle(fontSize: 14)),
                                          ),
                                          Text(formatCurrency(po.totalAmount),
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.w600)),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Row(
                                        children: [
                                          Icon(Icons.access_time,
                                              size: 14, color: Colors.grey.shade400),
                                          const SizedBox(width: 4),
                                          Text(formatDate(po.createdAt),
                                              style: TextStyle(
                                                  fontSize: 12,
                                                  color: Colors.grey.shade500)),
                                          if (po.expectedDate != null) ...[
                                            const SizedBox(width: 12),
                                            Icon(Icons.event,
                                                size: 14, color: Colors.grey.shade400),
                                            const SizedBox(width: 4),
                                            Text('Expected: ${formatDate(po.expectedDate)}',
                                                style: TextStyle(
                                                    fontSize: 12,
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
}
