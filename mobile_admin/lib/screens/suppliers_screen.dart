import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class SuppliersScreen extends StatefulWidget {
  const SuppliersScreen({super.key});

  @override
  State<SuppliersScreen> createState() => _SuppliersScreenState();
}

class _SuppliersScreenState extends State<SuppliersScreen> {
  final _api = ApiService();
  final _searchController = TextEditingController();
  List<Supplier> _suppliers = [];
  bool _loading = true;
  String _search = '';

  @override
  void initState() {
    super.initState();
    _loadSuppliers();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadSuppliers() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getSuppliers();
      final data = res.data;
      final list = data is List ? data : (data['data'] ?? data['suppliers'] ?? []);
      _suppliers = (list as List).map((s) => Supplier.fromJson(s)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load suppliers: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  List<Supplier> get _filtered {
    if (_search.isEmpty) return _suppliers;
    final term = _search.toLowerCase();
    return _suppliers.where((s) =>
        s.name.toLowerCase().contains(term) ||
        (s.contactPerson?.toLowerCase().contains(term) ?? false) ||
        (s.phone?.contains(term) ?? false)).toList();
  }

  void _showSupplierForm({Supplier? supplier}) {
    final nameC = TextEditingController(text: supplier?.name ?? '');
    final contactC = TextEditingController(text: supplier?.contactPerson ?? '');
    final phoneC = TextEditingController(text: supplier?.phone ?? '');
    final emailC = TextEditingController(text: supplier?.email ?? '');
    final addressC = TextEditingController(text: supplier?.address ?? '');
    final cityC = TextEditingController(text: supplier?.city ?? '');
    final stateC = TextEditingController(text: supplier?.state ?? '');
    final gstC = TextEditingController(text: supplier?.gstNumber ?? '');
    final isEditing = supplier != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.5,
        maxChildSize: 0.95,
        expand: false,
        builder: (_, controller) => Padding(
          padding: const EdgeInsets.all(20),
          child: ListView(
            controller: controller,
            children: [
              Text(isEditing ? 'Edit Supplier' : 'New Supplier',
                  style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextField(controller: nameC, decoration: const InputDecoration(labelText: 'Company Name *')),
              const SizedBox(height: 12),
              TextField(controller: contactC, decoration: const InputDecoration(labelText: 'Contact Person')),
              const SizedBox(height: 12),
              TextField(controller: phoneC, decoration: const InputDecoration(labelText: 'Phone'), keyboardType: TextInputType.phone),
              const SizedBox(height: 12),
              TextField(controller: emailC, decoration: const InputDecoration(labelText: 'Email'), keyboardType: TextInputType.emailAddress),
              const SizedBox(height: 12),
              TextField(controller: addressC, decoration: const InputDecoration(labelText: 'Address'), maxLines: 2),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: TextField(controller: cityC, decoration: const InputDecoration(labelText: 'City'))),
                  const SizedBox(width: 12),
                  Expanded(child: TextField(controller: stateC, decoration: const InputDecoration(labelText: 'State'))),
                ],
              ),
              const SizedBox(height: 12),
              TextField(controller: gstC, decoration: const InputDecoration(labelText: 'GST Number')),
              const SizedBox(height: 24),
              FilledButton(
                onPressed: () async {
                  if (nameC.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Company name is required')),
                    );
                    return;
                  }
                  final data = {
                    'name': nameC.text,
                    'contact_person': contactC.text,
                    'phone': phoneC.text,
                    'email': emailC.text,
                    'address': addressC.text,
                    'city': cityC.text,
                    'state': stateC.text,
                    'gst_number': gstC.text,
                  };
                  try {
                    if (isEditing) {
                      await _api.updateSupplier(supplier.id, data);
                    } else {
                      await _api.createSupplier(data);
                    }
                    if (mounted) {
                      Navigator.pop(ctx);
                      _loadSuppliers();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(isEditing ? 'Supplier updated' : 'Supplier created')),
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
                child: Text(isEditing ? 'Update' : 'Create'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(Supplier supplier) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Supplier'),
        content: Text('Delete "${supplier.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await _api.deleteSupplier(supplier.id);
                _loadSuppliers();
              } catch (e) {
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text('Error: $e')),
                  );
                }
              }
            },
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Suppliers', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showSupplierForm(),
        child: const Icon(Icons.add),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: AppSearchBar(
              hint: 'Search suppliers...',
              controller: _searchController,
              onChanged: (v) => setState(() => _search = v),
            ),
          ),
          Expanded(
            child: _loading
                ? const LoadingState()
                : _filtered.isEmpty
                    ? const EmptyState(
                        icon: Icons.people,
                        title: 'No suppliers found',
                        subtitle: 'Tap + to add one',
                      )
                    : RefreshIndicator(
                        onRefresh: _loadSuppliers,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16),
                          itemCount: _filtered.length,
                          itemBuilder: (_, i) {
                            final s = _filtered[i];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: Colors.blue.shade50,
                                  child: Text(s.name[0].toUpperCase(),
                                      style: TextStyle(
                                          color: Colors.blue.shade700,
                                          fontWeight: FontWeight.bold)),
                                ),
                                title: Text(s.name,
                                    style: const TextStyle(fontWeight: FontWeight.w600)),
                                subtitle: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (s.contactPerson != null)
                                      Text(s.contactPerson!),
                                    if (s.phone != null)
                                      Text(s.phone!,
                                          style: TextStyle(
                                              fontSize: 12,
                                              color: Colors.grey.shade600)),
                                  ],
                                ),
                                trailing: PopupMenuButton(
                                  itemBuilder: (_) => [
                                    const PopupMenuItem(value: 'edit', child: Text('Edit')),
                                    const PopupMenuItem(value: 'delete', child: Text('Delete')),
                                  ],
                                  onSelected: (v) {
                                    if (v == 'edit') _showSupplierForm(supplier: s);
                                    if (v == 'delete') _confirmDelete(s);
                                  },
                                ),
                                isThreeLine: s.contactPerson != null && s.phone != null,
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
