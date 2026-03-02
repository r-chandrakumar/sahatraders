import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/app_theme.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  final _api = ApiService();
  bool _loading = true;
  Map<String, dynamic> _stats = {};
  List<SalesOrder> _recentOrders = [];

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getDashboardStats(),
        _api.getRecentOrders(),
      ]);

      final statsData = results[0].data;
      _stats = statsData is Map<String, dynamic> ? statsData : (statsData['data'] ?? {});

      final ordersData = results[1].data;
      final ordersList = ordersData is List ? ordersData : (ordersData['data'] ?? []);
      _recentOrders = (ordersList as List).map((o) => SalesOrder.fromJson(o)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load dashboard: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Dashboard',
            style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: _loading
          ? const LoadingState(message: 'Loading dashboard...')
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // Stats Grid
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    mainAxisSpacing: 12,
                    crossAxisSpacing: 12,
                    childAspectRatio: 1.5,
                    children: [
                      StatCard(
                        title: 'Total Orders',
                        value: '${_stats['total_orders'] ?? _stats['totalOrders'] ?? 0}',
                        icon: Icons.receipt_long,
                        color: AppTheme.infoColor,
                      ),
                      StatCard(
                        title: 'Revenue',
                        value: formatCurrency(
                            _toDouble(_stats['total_revenue'] ?? _stats['totalRevenue'] ?? 0)),
                        icon: Icons.currency_rupee,
                        color: AppTheme.successColor,
                      ),
                      StatCard(
                        title: 'Products',
                        value: '${_stats['total_products'] ?? _stats['totalProducts'] ?? 0}',
                        icon: Icons.inventory_2,
                        color: AppTheme.primaryColor,
                      ),
                      StatCard(
                        title: 'Low Stock',
                        value: '${_stats['low_stock'] ?? _stats['lowStock'] ?? 0}',
                        icon: Icons.warning_amber,
                        color: AppTheme.warningColor,
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Recent Orders
                  const SectionHeader(title: 'Recent Orders'),
                  if (_recentOrders.isEmpty)
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(24),
                        child: EmptyState(
                          icon: Icons.receipt_long,
                          title: 'No recent orders',
                        ),
                      ),
                    )
                  else
                    ...(_recentOrders.take(10).map((order) => Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(order.orderNumber,
                                style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(order.customerName),
                                Text(formatDate(order.createdAt),
                                    style: TextStyle(
                                        fontSize: 12, color: Colors.grey.shade500)),
                              ],
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(formatCurrency(order.totalAmount),
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                const SizedBox(height: 4),
                                StatusBadge(status: order.status),
                              ],
                            ),
                            isThreeLine: true,
                          ),
                        ))),
                ],
              ),
            ),
    );
  }

  double _toDouble(dynamic val) {
    if (val == null) return 0;
    if (val is double) return val;
    if (val is int) return val.toDouble();
    if (val is String) return double.tryParse(val) ?? 0;
    return 0;
  }
}
