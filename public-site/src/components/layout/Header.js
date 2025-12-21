'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Input, Button, Drawer, Badge, Dropdown } from 'antd';
import {
  SearchOutlined,
  MenuOutlined,
  PhoneOutlined,
  MailOutlined,
  ShoppingCartOutlined,
  UserOutlined,
  LogoutOutlined,
  HeartOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const { customer, isAuthenticated, logout } = useAuth();
  const { cart } = useCart();

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  const navigation = [
    { name: 'Home', href: '/' },
    { name: 'Products', href: '/products' },
    { name: 'Categories', href: '/categories' },
    { name: 'About Us', href: '/about' },
    { name: 'Contact', href: '/contact' },
  ];

  return (
    <header className="bg-white shadow-sm">
      {/* Top bar */}
      <div className="bg-primary-600 text-white py-2">
        <div className="container-custom flex justify-between items-center text-sm">
          <div className="hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-1">
              <PhoneOutlined /> +91 98765 43210
            </span>
            <span className="flex items-center gap-1">
              <MailOutlined /> contact@sahatraders.com
            </span>
          </div>
          <div className="w-full sm:w-auto text-center">
            <span>Welcome to Saha Traders - Quality Products, Trusted Service</span>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-custom py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="Saha Traders"
              className="h-12 w-auto"
            />
            <div>
              <h1 className="text-xl font-bold text-primary-600">Saha Traders</h1>
              <p className="text-xs text-secondary-600">Premium Spices & Grocery</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-600 hover:text-primary-600 font-medium transition-colors"
              >
                {item.name}
              </Link>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="hidden md:block">
              <Input
                placeholder="Search products..."
                prefix={<SearchOutlined className="text-gray-400" />}
                className="w-64"
                onPressEnter={(e) => {
                  if (e.target.value) {
                    window.location.href = `/products?q=${encodeURIComponent(e.target.value)}`;
                  }
                }}
              />
            </div>

            {/* Mobile search toggle */}
            <Button
              type="text"
              icon={<SearchOutlined />}
              className="md:hidden"
              onClick={() => setSearchOpen(!searchOpen)}
            />

            {/* Cart */}
            <Link href="/cart">
              <Badge count={cartItemCount} size="small">
                <Button type="text" icon={<ShoppingCartOutlined style={{ fontSize: '20px' }} />} />
              </Badge>
            </Link>

            {/* Account */}
            {isAuthenticated ? (
              <Dropdown
                menu={{
                  items: [
                    {
                      key: 'orders',
                      icon: <ShoppingOutlined />,
                      label: <Link href="/account">My Orders</Link>,
                    },
                    {
                      key: 'wishlist',
                      icon: <HeartOutlined />,
                      label: <Link href="/account?tab=wishlist">Wishlist</Link>,
                    },
                    {
                      key: 'profile',
                      icon: <UserOutlined />,
                      label: <Link href="/account?tab=profile">Profile</Link>,
                    },
                    { type: 'divider' },
                    {
                      key: 'logout',
                      icon: <LogoutOutlined />,
                      label: 'Logout',
                      onClick: logout,
                    },
                  ],
                }}
                trigger={['click']}
              >
                <Button type="text" icon={<UserOutlined style={{ fontSize: '20px' }} />}>
                  <span className="hidden sm:inline ml-1">{customer?.name?.split(' ')[0]}</span>
                </Button>
              </Dropdown>
            ) : (
              <Link href="/login">
                <Button type="text" icon={<UserOutlined style={{ fontSize: '20px' }} />}>
                  <span className="hidden sm:inline ml-1">Login</span>
                </Button>
              </Link>
            )}

            {/* Order Enquiry Button */}
            <Link href="/enquiry">
              <Button type="primary" className="hidden sm:block">
                Order Enquiry
              </Button>
            </Link>

            {/* Mobile menu toggle */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              className="lg:hidden"
              onClick={() => setMobileMenuOpen(true)}
            />
          </div>
        </div>

        {/* Mobile search bar */}
        {searchOpen && (
          <div className="md:hidden mt-4">
            <Input
              placeholder="Search products..."
              prefix={<SearchOutlined className="text-gray-400" />}
              className="w-full"
              autoFocus
              onPressEnter={(e) => {
                if (e.target.value) {
                  window.location.href = `/products?q=${encodeURIComponent(e.target.value)}`;
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile menu drawer */}
      <Drawer
        title="Menu"
        placement="right"
        onClose={() => setMobileMenuOpen(false)}
        open={mobileMenuOpen}
        width={280}
      >
        <nav className="flex flex-col gap-4">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-gray-600 hover:text-primary-600 font-medium py-2 border-b border-gray-100"
              onClick={() => setMobileMenuOpen(false)}
            >
              {item.name}
            </Link>
          ))}

          <Link
            href="/cart"
            className="text-gray-600 hover:text-primary-600 font-medium py-2 border-b border-gray-100 flex items-center gap-2"
            onClick={() => setMobileMenuOpen(false)}
          >
            <ShoppingCartOutlined /> Cart {cartItemCount > 0 && `(${cartItemCount})`}
          </Link>

          <Link
            href="/track-order"
            className="text-gray-600 hover:text-primary-600 font-medium py-2 border-b border-gray-100"
            onClick={() => setMobileMenuOpen(false)}
          >
            Track Order
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                href="/account"
                className="text-gray-600 hover:text-primary-600 font-medium py-2 border-b border-gray-100 flex items-center gap-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                <UserOutlined /> My Account
              </Link>
              <Button
                type="text"
                danger
                icon={<LogoutOutlined />}
                onClick={() => {
                  logout();
                  setMobileMenuOpen(false);
                }}
                className="justify-start"
              >
                Logout
              </Button>
            </>
          ) : (
            <Link
              href="/login"
              className="text-gray-600 hover:text-primary-600 font-medium py-2 border-b border-gray-100 flex items-center gap-2"
              onClick={() => setMobileMenuOpen(false)}
            >
              <UserOutlined /> Login / Register
            </Link>
          )}

          <Link href="/enquiry" onClick={() => setMobileMenuOpen(false)}>
            <Button type="primary" block className="mt-4">
              Order Enquiry
            </Button>
          </Link>
        </nav>
      </Drawer>
    </header>
  );
};

export default Header;
