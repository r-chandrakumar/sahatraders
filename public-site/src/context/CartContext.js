'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const CartContext = createContext({});

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], subtotal: 0, total_items: 0 });
  const [loading, setLoading] = useState(true);
  const [coupon, setCoupon] = useState(null);

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await api.get('/cart');
      setCart(response.data);
    } catch (error) {
      console.error('Fetch cart error:', error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (variantId, quantity = 1) => {
    try {
      const response = await api.post('/cart/add', { variant_id: variantId, quantity });
      await fetchCart();
      toast.success(`${response.data.product_name} added to cart`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to add to cart';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      await api.put(`/cart/items/${itemId}`, { quantity });
      await fetchCart();
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Failed to update cart';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const removeItem = async (itemId) => {
    try {
      await api.delete(`/cart/items/${itemId}`);
      await fetchCart();
      toast.success('Item removed from cart');
      return { success: true };
    } catch (error) {
      toast.error('Failed to remove item');
      return { success: false };
    }
  };

  const clearCart = async () => {
    try {
      await api.delete('/cart/clear');
      setCart({ items: [], subtotal: 0, total_items: 0 });
      setCoupon(null);
      return { success: true };
    } catch (error) {
      toast.error('Failed to clear cart');
      return { success: false };
    }
  };

  const applyCoupon = async (code) => {
    try {
      const response = await api.post('/cart/coupon', { code });
      setCoupon(response.data.coupon);
      await fetchCart();
      toast.success('Coupon applied!');
      return { success: true, discount: response.data.coupon.discount_amount };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid coupon';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const removeCoupon = async () => {
    try {
      await api.delete('/cart/coupon');
      setCoupon(null);
      await fetchCart();
      toast.success('Coupon removed');
      return { success: true };
    } catch (error) {
      return { success: false };
    }
  };

  const getCartSummary = async () => {
    try {
      const response = await api.get('/cart/summary');
      return response.data;
    } catch (error) {
      return null;
    }
  };

  return (
    <CartContext.Provider value={{
      cart,
      loading,
      coupon,
      itemCount: cart.total_items,
      addToCart,
      updateQuantity,
      removeItem,
      clearCart,
      applyCoupon,
      removeCoupon,
      getCartSummary,
      refreshCart: fetchCart
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
