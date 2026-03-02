import axios from 'axios';
import Cookies from 'js-cookie';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = Cookies.get('admin_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('admin_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.data?.token) {
    Cookies.set('admin_token', response.data.data.token, { expires: 7 });
  }
  return response.data;
};

export const logout = async () => {
  await api.post('/auth/logout');
  Cookies.remove('admin_token');
};

export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Dashboard
export const getDashboard = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

// Categories
export const getCategories = async (params = {}) => {
  const response = await api.get('/admin/categories', { params });
  return response.data;
};

export const createCategory = async (data) => {
  const response = await api.post('/admin/categories', data);
  return response.data;
};

export const updateCategory = async (id, data) => {
  const response = await api.put(`/admin/categories/${id}`, data);
  return response.data;
};

export const deleteCategory = async (id) => {
  const response = await api.delete(`/admin/categories/${id}`);
  return response.data;
};

// Products
export const getProducts = async (params = {}) => {
  const response = await api.get('/admin/products', { params });
  return response.data;
};

export const getProduct = async (id) => {
  const response = await api.get(`/admin/products/${id}`);
  return response.data;
};

export const createProduct = async (data) => {
  const response = await api.post('/admin/products', data);
  return response.data;
};

export const updateProduct = async (id, data) => {
  const response = await api.put(`/admin/products/${id}`, data);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await api.delete(`/admin/products/${id}`);
  return response.data;
};

// Variants
export const createVariant = async (productId, data) => {
  const response = await api.post(`/admin/products/${productId}/variants`, data);
  return response.data;
};

export const updateVariant = async (productId, variantId, data) => {
  const response = await api.put(`/admin/products/${productId}/variants/${variantId}`, data);
  return response.data;
};

export const deleteVariant = async (productId, variantId) => {
  const response = await api.delete(`/admin/products/${productId}/variants/${variantId}`);
  return response.data;
};

// Suppliers
export const getSuppliers = async (params = {}) => {
  const response = await api.get('/admin/suppliers', { params });
  return response.data;
};

export const getSupplier = async (id) => {
  const response = await api.get(`/admin/suppliers/${id}`);
  return response.data;
};

export const createSupplier = async (data) => {
  const response = await api.post('/admin/suppliers', data);
  return response.data;
};

export const updateSupplier = async (id, data) => {
  const response = await api.put(`/admin/suppliers/${id}`, data);
  return response.data;
};

// Purchase Orders
export const getPurchaseOrders = async (params = {}) => {
  const response = await api.get('/admin/purchase-orders', { params });
  return response.data;
};

export const getPurchaseOrder = async (id) => {
  const response = await api.get(`/admin/purchase-orders/${id}`);
  return response.data;
};

export const createPurchaseOrder = async (data) => {
  const response = await api.post('/admin/purchase-orders', data);
  return response.data;
};

export const receivePurchaseOrder = async (id, items) => {
  const response = await api.put(`/admin/purchase-orders/${id}/receive`, { items });
  return response.data;
};

// Sales Orders
export const getSalesOrders = async (params = {}) => {
  const response = await api.get('/admin/sales-orders', { params });
  return response.data;
};

export const getSalesOrder = async (id) => {
  const response = await api.get(`/admin/sales-orders/${id}`);
  return response.data;
};

export const createSalesOrder = async (data) => {
  const response = await api.post('/admin/sales-orders', data);
  return response.data;
};

export const updateSalesOrderStatus = async (id, status) => {
  const response = await api.put(`/admin/sales-orders/${id}/status`, { status });
  return response.data;
};

// Invoices
export const getInvoices = async (params = {}) => {
  const response = await api.get('/admin/invoices', { params });
  return response.data;
};

export const getInvoice = async (id) => {
  const response = await api.get(`/admin/invoices/${id}`);
  return response.data;
};

export const createInvoice = async (data) => {
  const response = await api.post('/admin/invoices', data);
  return response.data;
};

export const addPayment = async (invoiceId, data) => {
  const response = await api.post(`/admin/invoices/${invoiceId}/payments`, data);
  return response.data;
};

// Inventory
export const getStock = async (params = {}) => {
  const response = await api.get('/admin/inventory/stock', { params });
  return response.data;
};

export const getStockMovements = async (params = {}) => {
  const response = await api.get('/admin/inventory/movements', { params });
  return response.data;
};

export const adjustStock = async (data) => {
  const response = await api.post('/admin/inventory/adjustments', data);
  return response.data;
};

export const getLowStockAlerts = async () => {
  const response = await api.get('/admin/inventory/alerts/low-stock');
  return response.data;
};

// Users
export const getUsers = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

export const createUser = async (data) => {
  const response = await api.post('/admin/users', data);
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await api.put(`/admin/users/${id}`, data);
  return response.data;
};

// Upload
export const uploadImage = async (file, type = 'products') => {
  const formData = new FormData();
  formData.append('image', file);
  const response = await api.post(`/admin/upload/image?type=${type}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

// Reports
export const getSalesReport = async (params = {}) => {
  const response = await api.get('/admin/dashboard/reports/sales', { params });
  return response.data;
};

export const getProfitLossReport = async (params = {}) => {
  const response = await api.get('/admin/dashboard/reports/profit-loss', { params });
  return response.data;
};

export default api;
