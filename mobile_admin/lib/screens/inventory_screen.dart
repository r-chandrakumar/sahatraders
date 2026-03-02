import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../core/app_theme.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class InventoryScreen extends StatefulWidget {
  const InventoryScreen({super.key});

  @override
  State<InventoryScreen> createState() => _InventoryScreenState();
}

class _InventoryScreenState extends State<InventoryScreen>
    with SingleTickerProviderStateMixin {
  final _api = ApiService();
  final _searchController = TextEditingController();
  late TabController _tabController;
  List<StockItem> _stock = [];
  List<StockMovement> _movements = [];
  bool _loading = true;
  String _search = '';
  bool _showLowOnly = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    try {
      final results = await Future.wait([
        _api.getStock(params: {'limit': 500}),
        _api.getMovements(params: {'limit': 100}),
      ]);

      final stockData = results[0].data;
      final stockList = stockData is List ? stockData : (stockData['data'] ?? []);
      _stock = (stockList as List).map((s) => StockItem.fromJson(s)).toList();

      final moveData = results[1].data;
      final moveList = moveData is List ? moveData : (moveData['data'] ?? []);
      _movements = (moveList as List).map((m) => StockMovement.fromJson(m)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load inventory: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<StockItem> get _filteredStock {
    return _stock.where((s) {
      if (_search.isNotEmpty) {
        final term = _search.toLowerCase();
        if (!s.productName.toLowerCase().contains(term) &&
            !s.sku.toLowerCase().contains(term)) {
          return false;
        }
      }
      if (_showLowOnly && !s.isLowStock) return false;
      return true;
    }).toList();
  }

  int get _lowStockCount => _stock.where((s) => s.isLowStock).length;

  double get _totalValue => _stock.fold(0, (sum, s) => sum + s.stockValue);

  void _showAdjustDialog(StockItem item) {
    final qtyController = TextEditingController(text: '${item.stockQty.toInt()}');
    String reason = 'count_correction';
    final notesController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20, right: 20, top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Adjust Stock',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade50,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(item.productName,
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    Text('${item.variantName} | SKU: ${item.sku}',
                        style: TextStyle(fontSize: 13, color: Colors.grey.shade600)),
                    Text('Current: ${item.stockQty.toInt()}',
                        style: const TextStyle(fontWeight: FontWeight.w500)),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: qtyController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(labelText: 'New Quantity'),
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: reason,
                decoration: const InputDecoration(labelText: 'Reason'),
                items: const [
                  DropdownMenuItem(value: 'count_correction', child: Text('Stock Count Correction')),
                  DropdownMenuItem(value: 'damage', child: Text('Damaged Goods')),
                  DropdownMenuItem(value: 'expired', child: Text('Expired')),
                  DropdownMenuItem(value: 'lost', child: Text('Lost/Theft')),
                  DropdownMenuItem(value: 'found', child: Text('Found')),
                  DropdownMenuItem(value: 'other', child: Text('Other')),
                ],
                onChanged: (v) => setSheetState(() => reason = v!),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesController,
                decoration: const InputDecoration(labelText: 'Notes (optional)'),
                maxLines: 2,
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: () async {
                    final newQty = int.tryParse(qtyController.text);
                    if (newQty == null) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Enter a valid quantity')),
                      );
                      return;
                    }
                    try {
                      await _api.adjustStock({
                        'variant_id': item.id,
                        'new_qty': newQty,
                        'reason': reason,
                        'notes': notesController.text,
                      });
                      if (mounted) {
                        Navigator.pop(ctx);
                        _loadData();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Stock adjusted')),
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
                  child: const Text('Update Stock'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Inventory', style: TextStyle(fontWeight: FontWeight.bold)),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [
            Tab(text: 'Stock'),
            Tab(text: 'Movements'),
          ],
        ),
      ),
      body: _loading
          ? const LoadingState()
          : TabBarView(
              controller: _tabController,
              children: [
                _buildStockTab(),
                _buildMovementsTab(),
              ],
            ),
    );
  }

  Widget _buildStockTab() {
    return RefreshIndicator(
      onRefresh: _loadData,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Stats
          Row(
            children: [
              Expanded(
                child: StatCard(
                  title: 'Total Value',
                  value: formatCurrency(_totalValue),
                  icon: Icons.currency_rupee,
                  color: AppTheme.successColor,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: StatCard(
                  title: 'Low Stock',
                  value: '$_lowStockCount',
                  icon: Icons.warning_amber,
                  color: _lowStockCount > 0 ? AppTheme.errorColor : AppTheme.successColor,
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // Search & Filter
          AppSearchBar(
            hint: 'Search by product or SKU...',
            controller: _searchController,
            onChanged: (v) => setState(() => _search = v),
          ),
          const SizedBox(height: 8),
          FilterChip(
            label: Text('Low Stock Only ($_lowStockCount)',
                style: TextStyle(
                    color: _showLowOnly ? Colors.white : null, fontSize: 13)),
            selected: _showLowOnly,
            selectedColor: AppTheme.errorColor,
            onSelected: (v) => setState(() => _showLowOnly = v),
          ),
          const SizedBox(height: 12),

          // Stock List
          ..._filteredStock.map((item) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: InkWell(
                  onTap: () => _showAdjustDialog(item),
                  borderRadius: BorderRadius.circular(12),
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Row(
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(item.productName,
                                  style: const TextStyle(fontWeight: FontWeight.w600)),
                              Text(item.variantName,
                                  style: TextStyle(
                                      fontSize: 13, color: Colors.grey.shade600)),
                              Text('SKU: ${item.sku}',
                                  style: TextStyle(
                                      fontSize: 12, color: Colors.grey.shade500)),
                            ],
                          ),
                        ),
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          children: [
                            Text(
                              '${item.stockQty.toInt()}',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                                color: item.isLowStock
                                    ? AppTheme.errorColor
                                    : Colors.black,
                              ),
                            ),
                            if (item.isLowStock)
                              Container(
                                padding: const EdgeInsets.symmetric(
                                    horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: AppTheme.errorColor.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: const Text('LOW',
                                    style: TextStyle(
                                        fontSize: 10,
                                        color: AppTheme.errorColor,
                                        fontWeight: FontWeight.bold)),
                              ),
                            Text(formatCurrency(item.stockValue),
                                style: TextStyle(
                                    fontSize: 12, color: Colors.grey.shade500)),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
              )),
        ],
      ),
    );
  }

  Widget _buildMovementsTab() {
    final reasonColors = {
      'purchase_receipt': AppTheme.successColor,
      'sale': AppTheme.infoColor,
      'adjustment': AppTheme.warningColor,
      'return': const Color(0xFF7E57C2),
      'damage': AppTheme.errorColor,
      'initial': Colors.grey,
    };

    return RefreshIndicator(
      onRefresh: _loadData,
      child: _movements.isEmpty
          ? const EmptyState(
              icon: Icons.history, title: 'No stock movements')
          : ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: _movements.length,
              itemBuilder: (_, i) {
                final m = _movements[i];
                final color = reasonColors[m.reason] ?? Colors.grey;
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    leading: CircleAvatar(
                      backgroundColor: color.withOpacity(0.1),
                      child: Icon(
                        m.changeQty > 0 ? Icons.add : Icons.remove,
                        color: color,
                      ),
                    ),
                    title: Text(m.productName ?? 'Unknown',
                        style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(m.variantName ?? ''),
                        Text(formatDateTime(m.createdAt),
                            style: TextStyle(
                                fontSize: 11, color: Colors.grey.shade500)),
                      ],
                    ),
                    trailing: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        Text(
                          '${m.changeQty > 0 ? '+' : ''}${m.changeQty.toInt()}',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: m.changeQty > 0
                                ? AppTheme.successColor
                                : AppTheme.errorColor,
                          ),
                        ),
                        StatusBadge(status: m.reason),
                      ],
                    ),
                    isThreeLine: true,
                  ),
                );
              },
            ),
    );
  }
}
