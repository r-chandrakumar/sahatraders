import 'package:flutter/material.dart';
import '../core/api_service.dart';
import '../widgets/app_widgets.dart';
import '../models/models.dart';

class CategoriesScreen extends StatefulWidget {
  const CategoriesScreen({super.key});

  @override
  State<CategoriesScreen> createState() => _CategoriesScreenState();
}

class _CategoriesScreenState extends State<CategoriesScreen> {
  final _api = ApiService();
  List<Category> _categories = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadCategories();
  }

  Future<void> _loadCategories() async {
    setState(() => _loading = true);
    try {
      final res = await _api.getCategories();
      final data = res.data;
      final list = data is List ? data : (data['data'] ?? data['categories'] ?? []);
      _categories = (list as List).map((c) => Category.fromJson(c)).toList();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load categories: $e')),
        );
      }
    }
    if (mounted) setState(() => _loading = false);
  }

  void _showCategoryForm({Category? category}) {
    final nameController = TextEditingController(text: category?.name ?? '');
    final descController = TextEditingController(text: category?.description ?? '');
    final slugController = TextEditingController(text: category?.slug ?? '');
    final isEditing = category != null;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(
          left: 20,
          right: 20,
          top: 20,
          bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(isEditing ? 'Edit Category' : 'New Category',
                style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Category Name'),
              onChanged: (v) {
                if (!isEditing) {
                  slugController.text = v.toLowerCase().replaceAll(RegExp(r'[^a-z0-9]+'), '-');
                }
              },
            ),
            const SizedBox(height: 12),
            TextField(
              controller: slugController,
              decoration: const InputDecoration(labelText: 'Slug'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descController,
              decoration: const InputDecoration(labelText: 'Description'),
              maxLines: 3,
            ),
            const SizedBox(height: 20),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () async {
                  if (nameController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Name is required')),
                    );
                    return;
                  }

                  final data = {
                    'name': nameController.text,
                    'slug': slugController.text,
                    'description': descController.text,
                  };

                  try {
                    if (isEditing) {
                      await _api.updateCategory(category.id, data);
                    } else {
                      await _api.createCategory(data);
                    }
                    if (mounted) {
                      Navigator.pop(ctx);
                      _loadCategories();
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                            content: Text(isEditing
                                ? 'Category updated'
                                : 'Category created')),
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
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDelete(Category category) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Category'),
        content: Text('Delete "${category.name}"? This cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () async {
              Navigator.pop(ctx);
              try {
                await _api.deleteCategory(category.id);
                _loadCategories();
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Category deleted')),
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
        title: const Text('Categories', style: TextStyle(fontWeight: FontWeight.bold)),
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCategoryForm(),
        child: const Icon(Icons.add),
      ),
      body: _loading
          ? const LoadingState()
          : _categories.isEmpty
              ? const EmptyState(
                  icon: Icons.category,
                  title: 'No categories',
                  subtitle: 'Tap + to create one',
                )
              : RefreshIndicator(
                  onRefresh: _loadCategories,
                  child: ListView.builder(
                    padding: const EdgeInsets.all(16),
                    itemCount: _categories.length,
                    itemBuilder: (_, i) {
                      final cat = _categories[i];
                      return Card(
                        margin: const EdgeInsets.only(bottom: 8),
                        child: ListTile(
                          leading: CircleAvatar(
                            backgroundColor: Colors.orange.shade50,
                            child: Icon(Icons.category, color: Colors.orange.shade700),
                          ),
                          title: Text(cat.name,
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(cat.description ?? 'No description',
                              maxLines: 1, overflow: TextOverflow.ellipsis),
                          trailing: PopupMenuButton(
                            itemBuilder: (_) => [
                              const PopupMenuItem(value: 'edit', child: Text('Edit')),
                              const PopupMenuItem(value: 'delete', child: Text('Delete')),
                            ],
                            onSelected: (v) {
                              if (v == 'edit') _showCategoryForm(category: cat);
                              if (v == 'delete') _confirmDelete(cat);
                            },
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
