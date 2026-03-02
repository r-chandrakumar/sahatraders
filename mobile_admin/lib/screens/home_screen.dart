import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../core/auth_provider.dart';
import '../core/app_theme.dart';
import 'dashboard_screen.dart';
import 'orders_screen.dart';
import 'products_screen.dart';
import 'categories_screen.dart';
import 'inventory_screen.dart';
import 'purchase_orders_screen.dart';
import 'returns_screen.dart';
import 'suppliers_screen.dart';
import 'customers_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;

  final _screens = const [
    DashboardScreen(),
    OrdersScreen(),
    ProductsScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(
        index: _currentIndex < 3 ? _currentIndex : 0,
        children: _screens,
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex < 3 ? _currentIndex : 3,
        onTap: (index) {
          if (index == 3) {
            _showMoreMenu(context);
          } else {
            setState(() => _currentIndex = index);
          }
        },
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.dashboard_outlined),
            activeIcon: Icon(Icons.dashboard),
            label: 'Dashboard',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.receipt_long_outlined),
            activeIcon: Icon(Icons.receipt_long),
            label: 'Orders',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.inventory_2_outlined),
            activeIcon: Icon(Icons.inventory_2),
            label: 'Products',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.more_horiz),
            label: 'More',
          ),
        ],
      ),
    );
  }

  void _showMoreMenu(BuildContext context) {
    final auth = context.read<AuthProvider>();
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => DraggableScrollableSheet(
        initialChildSize: 0.65,
        minChildSize: 0.4,
        maxChildSize: 0.85,
        expand: false,
        builder: (_, controller) => Column(
          children: [
            // Handle bar
            Container(
              margin: const EdgeInsets.only(top: 12, bottom: 8),
              width: 40,
              height: 4,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            // User info
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
              child: Row(
                children: [
                  CircleAvatar(
                    backgroundColor: AppTheme.primaryColor,
                    child: Text(
                      auth.userName[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(auth.userName,
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                        Text(auth.userRole.replaceAll('_', ' '),
                            style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const Divider(),
            // Menu items
            Expanded(
              child: ListView(
                controller: controller,
                padding: const EdgeInsets.symmetric(horizontal: 8),
                children: [
                  _MoreMenuItem(
                    icon: Icons.category_outlined,
                    label: 'Categories',
                    onTap: () => _navigateTo(ctx, const CategoriesScreen()),
                  ),
                  _MoreMenuItem(
                    icon: Icons.warehouse_outlined,
                    label: 'Inventory',
                    onTap: () => _navigateTo(ctx, const InventoryScreen()),
                  ),
                  _MoreMenuItem(
                    icon: Icons.local_shipping_outlined,
                    label: 'Purchase Orders',
                    onTap: () => _navigateTo(ctx, const PurchaseOrdersScreen()),
                  ),
                  _MoreMenuItem(
                    icon: Icons.assignment_return_outlined,
                    label: 'Returns',
                    onTap: () => _navigateTo(ctx, const ReturnsScreen()),
                  ),
                  _MoreMenuItem(
                    icon: Icons.people_outline,
                    label: 'Suppliers',
                    onTap: () => _navigateTo(ctx, const SuppliersScreen()),
                  ),
                  _MoreMenuItem(
                    icon: Icons.person_outline,
                    label: 'Customers',
                    onTap: () => _navigateTo(ctx, const CustomersScreen()),
                  ),
                  const Divider(),
                  _MoreMenuItem(
                    icon: Icons.logout,
                    label: 'Logout',
                    color: AppTheme.errorColor,
                    onTap: () {
                      Navigator.pop(ctx);
                      _confirmLogout(context);
                    },
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _navigateTo(BuildContext ctx, Widget screen) {
    Navigator.pop(ctx); // close bottom sheet
    Navigator.push(context, MaterialPageRoute(builder: (_) => screen));
  }

  void _confirmLogout(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Logout'),
        content: const Text('Are you sure you want to logout?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<AuthProvider>().logout();
            },
            style: FilledButton.styleFrom(backgroundColor: AppTheme.errorColor),
            child: const Text('Logout'),
          ),
        ],
      ),
    );
  }
}

class _MoreMenuItem extends StatelessWidget {
  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  const _MoreMenuItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    return ListTile(
      leading: Icon(icon, color: color ?? Colors.grey.shade700),
      title: Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w500)),
      trailing: Icon(Icons.chevron_right, color: Colors.grey.shade400),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      onTap: onTap,
    );
  }
}
