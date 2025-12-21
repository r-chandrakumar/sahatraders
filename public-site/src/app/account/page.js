'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Tabs,
  Table,
  Button,
  Form,
  Input,
  Empty,
  Spin,
  Tag,
  Modal,
  Space,
} from 'antd';
import {
  UserOutlined,
  ShoppingOutlined,
  HeartOutlined,
  SettingOutlined,
  LogoutOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import Link from 'next/link';

const { TextArea } = Input;

export default function AccountPage() {
  const router = useRouter();
  const { customer, isAuthenticated, loading: authLoading, logout, updateProfile } = useAuth();
  const [activeTab, setActiveTab] = useState('orders');
  const [orders, setOrders] = useState([]);
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(false);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/login?redirect=/account');
    }
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchOrders();
      fetchWishlist();
      if (customer) {
        profileForm.setFieldsValue({
          name: customer.name,
          email: customer.email,
          phone: customer.phone,
          address: customer.address,
        });
      }
    }
  }, [isAuthenticated, customer]);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/customer/orders');
      setOrders(response.data.orders);
    } catch (error) {
      console.error('Fetch orders error:', error);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await api.get('/customer/wishlist');
      setWishlist(response.data);
    } catch (error) {
      console.error('Fetch wishlist error:', error);
    }
  };

  const handleUpdateProfile = async (values) => {
    setLoading(true);
    await updateProfile(values);
    setLoading(false);
  };

  const handleChangePassword = async (values) => {
    setLoading(true);
    try {
      await api.put('/customer/change-password', values);
      toast.success('Password changed successfully');
      passwordForm.resetFields();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to change password');
    }
    setLoading(false);
  };

  const removeFromWishlist = async (productId) => {
    try {
      await api.delete(`/customer/wishlist/${productId}`);
      setWishlist(wishlist.filter(w => w.product_id !== productId));
      toast.success('Removed from wishlist');
    } catch (error) {
      toast.error('Failed to remove');
    }
  };

  const statusColors = {
    pending: 'orange',
    confirmed: 'blue',
    processing: 'cyan',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };

  const orderColumns = [
    {
      title: 'Order',
      key: 'order',
      render: (_, record) => (
        <div>
          <p className="font-medium text-primary">{record.order_number}</p>
          <p className="text-xs text-gray-500">
            {new Date(record.created_at).toLocaleDateString('en-IN')}
          </p>
        </div>
      ),
    },
    {
      title: 'Items',
      dataIndex: 'item_count',
      key: 'items',
    },
    {
      title: 'Total',
      dataIndex: 'total_amount',
      key: 'total',
      render: (amount) => `₹${amount?.toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status?.toUpperCase()}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      render: (_, record) => (
        <Link href={`/track-order?order=${record.order_number}`}>
          <Button type="link" icon={<EyeOutlined />}>Track</Button>
        </Link>
      ),
    },
  ];

  if (authLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  const tabItems = [
    {
      key: 'orders',
      label: (
        <span>
          <ShoppingOutlined /> My Orders
        </span>
      ),
      children: (
        <div>
          {orders.length > 0 ? (
            <Table
              dataSource={orders}
              columns={orderColumns}
              rowKey="id"
              pagination={{ pageSize: 10 }}
            />
          ) : (
            <Empty
              description="No orders yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link href="/products">
                <Button type="primary">Start Shopping</Button>
              </Link>
            </Empty>
          )}
        </div>
      ),
    },
    {
      key: 'wishlist',
      label: (
        <span>
          <HeartOutlined /> Wishlist
        </span>
      ),
      children: (
        <div>
          {wishlist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {wishlist.map((item) => (
                <Card key={item.id} size="small">
                  <div className="flex gap-4">
                    <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ShoppingOutlined className="text-gray-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <Link href={`/products/${item.slug}`}>
                        <h4 className="font-medium hover:text-primary">{item.name}</h4>
                      </Link>
                      <p className="text-primary font-semibold">
                        ₹{item.min_price?.toLocaleString()}
                        {item.max_price !== item.min_price && ` - ₹${item.max_price?.toLocaleString()}`}
                      </p>
                      <Button
                        type="link"
                        danger
                        size="small"
                        onClick={() => removeFromWishlist(item.product_id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Empty
              description="Your wishlist is empty"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            >
              <Link href="/products">
                <Button type="primary">Browse Products</Button>
              </Link>
            </Empty>
          )}
        </div>
      ),
    },
    {
      key: 'profile',
      label: (
        <span>
          <UserOutlined /> Profile
        </span>
      ),
      children: (
        <div className="max-w-md">
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
          >
            <Form.Item
              name="name"
              label="Full Name"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="email" label="Email">
              <Input disabled />
            </Form.Item>

            <Form.Item
              name="phone"
              label="Phone"
              rules={[{ required: true }]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="address" label="Default Address">
              <TextArea rows={3} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Update Profile
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <SettingOutlined /> Security
        </span>
      ),
      children: (
        <div className="max-w-md">
          <h3 className="font-semibold mb-4">Change Password</h3>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="current_password"
              label="Current Password"
              rules={[{ required: true }]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="new_password"
              label="New Password"
              rules={[
                { required: true },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item
              name="confirm_password"
              label="Confirm New Password"
              dependencies={['new_password']}
              rules={[
                { required: true },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('new_password') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('Passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </div>
      ),
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Account</h1>
          <p className="text-gray-500">Welcome back, {customer?.name}</p>
        </div>
        <Button
          icon={<LogoutOutlined />}
          onClick={logout}
          danger
        >
          Logout
        </Button>
      </div>

      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
}
