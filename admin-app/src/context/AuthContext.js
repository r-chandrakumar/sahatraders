'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { getCurrentUser, login as apiLogin, logout as apiLogout } from '@/lib/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = Cookies.get('admin_token');
    if (token) {
      try {
        const response = await getCurrentUser();
        setUser(response.data.user);
      } catch (error) {
        Cookies.remove('admin_token');
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    const response = await apiLogin(email, password);
    setUser(response.data.user);
    return response;
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      // Continue with local logout even if API fails
    }
    Cookies.remove('admin_token');
    setUser(null);
    router.push('/login');
  };

  const hasPermission = (roles) => {
    if (!user) return false;
    if (typeof roles === 'string') return user.role === roles;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, hasPermission, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
