import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/app_theme.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class ReturnsScreen extends StatefulWidget {
  const ReturnsScreen({super.key});

  @override
  State<ReturnsScreen> createState() => _ReturnsScreenState();
}

class _ReturnsScreenState extends State<ReturnsScreen> {
  final _api = ApiService();
  List<ReturnOrder> _returns = [];
  bool _loading = true;
  String _statusFilter = 'all';

  static const _statuses = ['all', 'pending', 'approved', 'rejected', 'processed', 'completed'];

  @override
  void initState() {
    super.initState();
    _loadReturns();
  }

  Future<void> _loadReturns() async {
    setState(() => _loading = true);
    try {
      final params = <String, dynamic>{'limit': 200};
      if (_statusFilter != 'all') params['status'] = _statusFilter;

      final res = await _api.getReturns(params: params);
      final data = res.data;
      final list = data is List
          ? data
          : (data['data'] ?? data['returns'] ?? []);
      _returns = (list as List).map((r) => ReturnOrder.fromJson(r)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load returns: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  void _processReturn(ReturnOrder ret, String action) async {
    try {
      await _api.processReturn(ret.id, {'action': action});
      _loadReturns();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Return ${action}d successfully')),
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
    return Scaffold(
      appBar: AppBar(
        title: const Text('Returns', style: TextStyle(fontWeight: FontWeight.bold)),
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
                      _loadReturns();
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
                : _returns.isEmpty
                    ? const EmptyState(
                        icon: Icons.assignment_return,
                        title: 'No returns found',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadReturns,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _returns.length,
                          itemBuilder: (_, i) {
                            final ret = _returns[i];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: Padding(
                                padding: const EdgeInsets.all(14),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(ret.returnNumber,
                                            style: const TextStyle(
                                                fontWeight: FontWeight.bold)),
                                        StatusBadge(status: ret.status),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    if (ret.orderNumber != null)
                                      Row(
                                        children: [
                                          Icon(Icons.receipt,
                                              size: 14, color: Colors.grey.shade500),
                                          const SizedBox(width: 4),
                                          Text('Order: ${ret.orderNumber}',
                                              style: TextStyle(
                                                  fontSize: 13,
                                                  color: Colors.grey.shade600)),
                                        ],
                                      ),
                                    if (ret.reason != null) ...[
                                      const SizedBox(height: 4),
                                      Text(ret.reason!,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: TextStyle(
                                              fontSize: 13,
                                              color: Colors.grey.shade600)),
                                    ],
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment:
                                          MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(formatDate(ret.createdAt),
                                            style: TextStyle(
                                                fontSize: 12,
                                                color: Colors.grey.shade500)),
                                        Text(formatCurrency(ret.totalAmount),
                                            style: const TextStyle(
                                                fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                    // Actions for pending returns
                                    if (ret.status == 'pending') ...[
                                      const SizedBox(height: 12),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.end,
                                        children: [
                                          OutlinedButton(
                                            onPressed: () =>
                                                _processReturn(ret, 'reject'),
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: AppTheme.errorColor,
                                            ),
                                            child: const Text('Reject'),
                                          ),
                                          const SizedBox(width: 8),
                                          FilledButton(
                                            onPressed: () =>
                                                _processReturn(ret, 'approve'),
                                            child: const Text('Approve'),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ],
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
