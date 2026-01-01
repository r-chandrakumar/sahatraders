import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Categories
export const getCategories = async (params = {}) => {
  const response = await api.get('/categories', { params });
  return response.data;
};

export const getCategoryBySlug = async (slug) => {
  const response = await api.get(`/categories/slug/${slug}`);
  return response.data;
};

// Products
export const getProducts = async (params = {}) => {
  const response = await api.get('/products', { params });
  return response.data;
};

export const getProductBySlug = async (slug) => {
  const response = await api.get(`/products/slug/${slug}`);
  return response.data;
};

// Enquiries
export const submitEnquiry = async (data) => {
  const response = await api.post('/enquiries', data);
  return response.data;
};

export default api;
