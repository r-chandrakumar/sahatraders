'use client';

import { useState, useEffect, useLayoutEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Layout, Menu, Dropdown, Avatar, Badge, Spin } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  AppstoreOutlined,
  TeamOutlined,
  ShoppingCartOutlined,
  FileTextOutlined,
  DollarOutlined,
  InboxOutlined,
  MessageOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  RollbackOutlined,
  BarChartOutlined,
  GiftOutlined,
  AuditOutlined,
  GlobalOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/dashboard',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: 'catalog',
    icon: <ShoppingOutlined />,
    label: 'Catalog',
    children: [
      { key: '/products', label: 'Products' },
      { key: '/categories', label: 'Categories' },
    ],
  },
  {
    key: '/suppliers',
    icon: <TeamOutlined />,
    label: 'Suppliers',
  },
  {
    key: '/customers',
    icon: <UserOutlined />,
    label: 'Customers',
  },
  {
    key: 'purchases',
    icon: <InboxOutlined />,
    label: 'Purchases',
    children: [
      { key: '/purchase-orders', label: 'Purchase Orders' },
    ],
  },
  {
    key: 'sales',
    icon: <ShoppingCartOutlined />,
    label: 'Sales',
    children: [
      { key: '/orders', label: 'Sales Orders' },
      { key: '/enquiries', label: 'Enquiries' },
    ],
  },
  {
    key: '/invoices',
    icon: <FileTextOutlined />,
    label: 'Invoices',
  },
  {
    key: '/returns',
    icon: <RollbackOutlined />,
    label: 'Returns',
  },
  {
    key: '/inventory',
    icon: <AppstoreOutlined />,
    label: 'Inventory',
  },
  {
    key: '/reports',
    icon: <BarChartOutlined />,
    label: 'Reports',
  },
  {
    key: '/coupons',
    icon: <GiftOutlined />,
    label: 'Coupons',
  },
  {
    key: '/cms',
    icon: <GlobalOutlined />,
    label: 'CMS',
    roles: ['super_admin', 'admin'],
  },
  {
    key: '/users',
    icon: <UserOutlined />,
    label: 'Users',
    roles: ['super_admin'],
  },
  {
    key: '/audit-logs',
    icon: <AuditOutlined />,
    label: 'Audit Logs',
    roles: ['super_admin'],
  },
  {
    key: '/settings',
    icon: <SettingOutlined />,
    label: 'Settings',
    roles: ['super_admin', 'admin'],
  },
];

export default function AdminLayout({ children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, loading, logout, hasPermission } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (!mounted || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <Spin size="large" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const filterMenuItems = (items) => {
    return items.filter(item => {
      if (item.roles && !hasPermission(item.roles)) return false;
      if (item.children) {
        item.children = filterMenuItems(item.children);
      }
      return true;
    });
  };

  const filteredMenuItems = filterMenuItems([...menuItems]);

  const userMenu = {
    items: [
      {
        key: 'profile',
        icon: <UserOutlined />,
        label: 'Profile',
        onClick: () => router.push('/profile'),
      },
      {
        key: 'settings',
        icon: <SettingOutlined />,
        label: 'Settings',
        onClick: () => router.push('/settings'),
      },
      { type: 'divider' },
      {
        key: 'logout',
        icon: <LogoutOutlined />,
        label: 'Logout',
        onClick: logout,
      },
    ],
  };

  const getSelectedKeys = () => {
    const path = pathname;
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find(c => path.startsWith(c.key));
        if (child) return [child.key];
      }
      if (path.startsWith(item.key)) return [item.key];
    }
    return ['/dashboard'];
  };

  const getOpenKeys = () => {
    for (const item of menuItems) {
      if (item.children) {
        const child = item.children.find(c => pathname.startsWith(c.key));
        if (child) return [item.key];
      }
    }
    return [];
  };

  return (
    <Layout className="h-screen overflow-hidden">
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={260}
        className="shadow-lg fixed left-0 top-0 bottom-0 z-50 overflow-y-auto"
        style={{ height: '100vh' }}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-800 sticky top-0 bg-[#001529] z-10">
          {collapsed ? (
            <span className="text-white font-bold text-xl">S</span>
          ) : (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-500 rounded flex items-center justify-center">
                <span className="text-white font-bold">S</span>
              </div>
              <span className="text-white font-semibold">Sahaa Traders</span>
            </div>
          )}
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          defaultOpenKeys={getOpenKeys()}
          items={filteredMenuItems.map(item => ({
            ...item,
            label: item.children ? item.label : <Link href={item.key}>{item.label}</Link>,
            children: item.children?.map(child => ({
              ...child,
              label: <Link href={child.key}>{child.label}</Link>,
            })),
          }))}
        />
      </Sider>
      <Layout style={{ marginLeft: collapsed ? 80 : 260, transition: 'margin-left 0.2s' }}>
        <Header className="px-4 flex items-center justify-between sticky top-0 z-40 shadow-sm" style={{ background: '#fff' }}>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="text-xl text-gray-600 hover:text-gray-900"
            >
              {collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            </button>
          </div>
          <div className="flex items-center gap-4">
            <Badge count={5} size="small">
              <button className="text-xl text-gray-600 hover:text-gray-900">
                <BellOutlined />
              </button>
            </Badge>
            <Dropdown menu={userMenu} trigger={['click']} placement="bottomRight">
              <div className="flex items-center gap-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-lg">
                <Avatar size="small" icon={<UserOutlined />} className="bg-blue-500" />
                <div className="hidden sm:block">
                  <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{user.role.replace('_', ' ')}</div>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>
        <Content className="m-4 p-6 bg-white rounded-lg overflow-y-auto" style={{ height: 'calc(100vh - 96px)' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
