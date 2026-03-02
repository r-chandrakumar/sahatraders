import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  bool _isLoading = true;
  bool _isLoggedIn = false;
  Map<String, dynamic>? _user;

  bool get isLoading => _isLoading;
  bool get isLoggedIn => _isLoggedIn;
  Map<String, dynamic>? get user => _user;
  String get userName => _user?['name'] ?? 'Admin';
  String get userRole => _user?['role'] ?? '';

  Future<void> init() async {
    await _api.loadToken();
    if (_api.token != null) {
      _isLoggedIn = true;
      final prefs = await SharedPreferences.getInstance();
      _user = {
        'name': prefs.getString('user_name') ?? 'Admin',
        'email': prefs.getString('user_email') ?? '',
        'role': prefs.getString('user_role') ?? '',
      };
    }
    _isLoading = false;
    notifyListeners();
  }

  Future<String?> login(String email, String password) async {
    try {
      final response = await _api.login(email, password);
      final data = response.data;

      if (data['token'] != null) {
        await _api.saveToken(data['token']);

        final userData = data['user'] ?? {};
        _user = {
          'name': userData['name'] ?? 'Admin',
          'email': userData['email'] ?? email,
          'role': userData['role'] ?? '',
        };

        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('user_name', _user!['name']);
        await prefs.setString('user_email', _user!['email']);
        await prefs.setString('user_role', _user!['role']);

        _isLoggedIn = true;
        notifyListeners();
        return null; // success
      }
      return data['message'] ?? 'Login failed';
    } catch (e) {
      if (e is dynamic && e.response?.data != null) {
        return e.response.data['message'] ?? 'Login failed';
      }
      return 'Connection error. Please check your network.';
    }
  }

  Future<void> logout() async {
    await _api.clearToken();
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('user_name');
    await prefs.remove('user_email');
    await prefs.remove('user_role');
    _isLoggedIn = false;
    _user = null;
    notifyListeners();
  }
}
