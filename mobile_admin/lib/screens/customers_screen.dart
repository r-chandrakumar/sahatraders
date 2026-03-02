import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../widgets/app_widgets.dart';

class CustomersScreen extends StatefulWidget {
  const CustomersScreen({super.key});

  @override
  State<CustomersScreen> createState() => _CustomersScreenState();
}

class _CustomersScreenState extends State<CustomersScreen> {
  final _api = ApiService();
  final _searchController = TextEditingController();
  List<Map<String, dynamic>> _customers = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadCustomers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadCustomers() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getCustomers(params: {'limit': 200});
      final data = res.data;
      final list = data is List ? data : (data['data'] ?? data['customers'] ?? []);
      _customers = List<Map<String, dynamic>>.from(list);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load customers: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<Map<String, dynamic>> get _filtered {
    if (_search.isEmpty) return _customers;
    final term = _search.toLowerCase();
    return _customers.where((c) {
      final name = (c['name'] ?? c['customer_name'] ?? '').toString().toLowerCase();
      final phone = (c['phone'] ?? c['customer_phone'] ?? '').toString();
      final email = (c['email'] ?? c['customer_email'] ?? '').toString().toLowerCase();
      return name.contains(term) || phone.contains(term) || email.contains(term);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Customers', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: AppSearchBar(
              hint: 'Search customers...',
              controller: _searchController,
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const LoadingState()
                : _filtered.isEmpty
                    ? const EmptyState(
                        icon: Icons.person,
                        title: 'No customers found',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadCustomers,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filtered.length,
                          itemBuilder: (_, i) {
                            final c = _filtered[i];
                            final name = c['name'] ?? c['customer_name'] ?? 'Unknown';
                            final phone = c['phone'] ?? c['customer_phone'] ?? '';
                            final email = c['email'] ?? c['customer_email'] ?? '';
                            final orderCount = c['order_count'] ?? c['total_orders'] ?? 0;

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.green.shade50,
                                  child: Text(
                                    name.toString().isNotEmpty
                                        ? name.toString()[0].toUpperCase()
                                        : '?',
                                    style: TextStyle(
                                        color: Colors.green.shade700,
                                        fontWeight: FontWeight.bold),
                                  ),
                                ),
                                title: Text(name.toString(),
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (phone.toString().isNotEmpty)
                                      Row(
                                        children: [
                                          Icon(Icons.phone, size: 14, color: Colors.grey.shade500),
                                          const SizedBox(width: 4),
                                          Text(phone.toString(),
                                              style: const TextStyle(fontSize: 13)),
                                        ],
                                      ),
                                    if (email.toString().isNotEmpty)
                                      Row(
                                        children: [
                                          Icon(Icons.email, size: 14, color: Colors.grey.shade500),
                                          const SizedBox(width: 4),
                                          Expanded(
                                            child: Text(email.toString(),
                                                style: const TextStyle(fontSize: 13),
                                                overflow: TextOverflow.ellipsis),
                                          ),
                                        ],
                                      ),
                                  ],
                                ),
                                trailing: orderCount > 0
                                    ? Column(
                                        mainAxisAlignment: MainAxisAlignment.center,
                                        children: [
                                          Text('$orderCount',
                                              style: const TextStyle(
                                                  fontWeight: FontWeight.bold,
                                                  fontSize: 16)),
                                          Text('orders',
                                              style: TextStyle(
                                                  fontSize: 11,
                                                  color: Colors.grey.shade500)),
                                        ],
                                      )
                                    : null,
                                isThreeLine: phone.toString().isNotEmpty &&
                                    email.toString().isNotEmpty,
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
