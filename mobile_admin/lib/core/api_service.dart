import 'dart:ui' show VoidCallback;
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;

  late Dio dio;
  String? _token;
  VoidCallback? onUnauthorized;

  // Change this to your API URL
  static const String baseUrl = 'https://api.sahatraders.in/api';

  ApiService._internal() {
    dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 15),
      receiveTimeout: const Duration(seconds: 15),
      headers: {'Content-Type': 'application/json'},
    ));

    dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_token != null) {
          options.headers['Authorization'] = 'Bearer $_token';
        }
        return handler.next(options);
      },
      onError: (error, handler) {
        if (error.response?.statusCode == 401) {
          _token = null;
          onUnauthorized?.call();
        }
        return handler.next(error);
      },
    ));
  }

  void setToken(String? token) {
    _token = token;
  }

  String? get token => _token;

  Future<void> loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
  }

  Future<void> saveToken(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('auth_token', token);
  }

  Future<void> clearToken() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
  }

  // Auth
  Future<Response> login(String email, String password) {
    return dio.post('/auth/login', data: {'email': email, 'password': password});
  }

  // Dashboard
  Future<Response> getDashboardStats() => dio.get('/admin/dashboard/stats');
  Future<Response> getRecentOrders() => dio.get('/admin/dashboard/recent-orders');

  // Products
  Future<Response> getProducts({Map<String, dynamic>? params}) =>
      dio.get('/admin/products', queryParameters: params);
  Future<Response> getProduct(int id) => dio.get('/admin/products/$id');
  Future<Response> createProduct(Map<String, dynamic> data) =>
      dio.post('/admin/products', data: data);
  Future<Response> updateProduct(int id, Map<String, dynamic> data) =>
      dio.put('/admin/products/$id', data: data);
  Future<Response> deleteProduct(int id) => dio.delete('/admin/products/$id');

  // Categories
  Future<Response> getCategories({Map<String, dynamic>? params}) =>
      dio.get('/admin/categories', queryParameters: params);
  Future<Response> createCategory(Map<String, dynamic> data) =>
      dio.post('/admin/categories', data: data);
  Future<Response> updateCategory(int id, Map<String, dynamic> data) =>
      dio.put('/admin/categories/$id', data: data);
  Future<Response> deleteCategory(int id) => dio.delete('/admin/categories/$id');

  // Sales Orders
  Future<Response> getOrders({Map<String, dynamic>? params}) =>
      dio.get('/admin/sales-orders', queryParameters: params);
  Future<Response> getOrder(int id) => dio.get('/admin/sales-orders/$id');
  Future<Response> updateOrder(int id, Map<String, dynamic> data) =>
      dio.put('/admin/sales-orders/$id', data: data);

  // Inventory
  Future<Response> getStock({Map<String, dynamic>? params}) =>
      dio.get('/admin/inventory/stock', queryParameters: params);
  Future<Response> getMovements({Map<String, dynamic>? params}) =>
      dio.get('/admin/inventory/movements', queryParameters: params);
  Future<Response> adjustStock(Map<String, dynamic> data) =>
      dio.post('/admin/inventory/adjustments', data: data);

  // Purchase Orders
  Future<Response> getPurchaseOrders({Map<String, dynamic>? params}) =>
      dio.get('/admin/purchase-orders', queryParameters: params);
  Future<Response> createPurchaseOrder(Map<String, dynamic> data) =>
      dio.post('/admin/purchase-orders', data: data);
  Future<Response> receivePurchaseOrder(int id, Map<String, dynamic> data) =>
      dio.put('/admin/purchase-orders/$id/receive', data: data);

  // Returns
  Future<Response> getReturns({Map<String, dynamic>? params}) =>
      dio.get('/admin/returns', queryParameters: params);
  Future<Response> createReturn(Map<String, dynamic> data) =>
      dio.post('/admin/returns', data: data);
  Future<Response> processReturn(int id, Map<String, dynamic> data) =>
      dio.put('/admin/returns/$id/process', data: data);

  // Suppliers
  Future<Response> getSuppliers({Map<String, dynamic>? params}) =>
      dio.get('/admin/suppliers', queryParameters: params);
  Future<Response> createSupplier(Map<String, dynamic> data) =>
      dio.post('/admin/suppliers', data: data);
  Future<Response> updateSupplier(int id, Map<String, dynamic> data) =>
      dio.put('/admin/suppliers/$id', data: data);
  Future<Response> deleteSupplier(int id) => dio.delete('/admin/suppliers/$id');

  // Customers
  Future<Response> getCustomers({Map<String, dynamic>? params}) =>
      dio.get('/customer/admin/list', queryParameters: params);
}
