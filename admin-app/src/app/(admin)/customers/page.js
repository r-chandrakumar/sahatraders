'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Input, Card, Tag, Modal, Space, Spin, Tabs, Statistic, Row, Col, Divider, Switch } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  PhoneOutlined,
  MailOutlined,
  ShoppingCartOutlined,
  DollarOutlined,
  CalendarOutlined,
  UserOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '@/lib/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchCustomers();
    fetchStats();
  }, [pagination.page, statusFilter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };
      if (searchTerm) params.q = searchTerm;
      if (statusFilter) params.status = statusFilter;

      const response = await api.get('/customer/admin/list', { params });
      setCustomers(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Failed to load customers');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/customer/admin/stats/summary');
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchCustomerDetails = async (id) => {
    setViewLoading(true);
    setViewingCustomer({ id });
    try {
      const response = await api.get(`/customer/admin/${id}`);
      setViewingCustomer(response.data.data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
      toast.error('Failed to load customer details');
      setViewingCustomer(null);
    } finally {
      setViewLoading(false);
    }
  };

  const handleStatusToggle = async (id, currentStatus) => {
    try {
      await api.put(`/customer/admin/${id}/status`, { is_active: !currentStatus });
      toast.success(`Customer ${!currentStatus ? 'activated' : 'deactivated'}`);
      fetchCustomers();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchCustomers();
  };

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <div className="text-sm text-gray-500">{record.email}</div>
        </div>
      ),
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone) => (
        <span className="flex items-center gap-1">
          <PhoneOutlined className="text-gray-400" /> {phone}
        </span>
      ),
    },
    {
      title: 'Orders',
      dataIndex: 'total_orders',
      key: 'orders',
      render: (orders) => (
        <Tag color={orders > 0 ? 'blue' : 'default'}>{orders || 0}</Tag>
      ),
    },
    {
      title: 'Total Spent',
      dataIndex: 'total_spent',
      key: 'spent',
      render: (spent) => `₹${parseFloat(spent || 0).toLocaleString()}`,
    },
    {
      title: 'Last Login',
      dataIndex: 'last_login',
      key: 'last_login',
      render: (date) => date ? dayjs(date).format('DD MMM YY') : 'Never',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active, record) => (
        <Switch
          checked={active}
          onChange={() => handleStatusToggle(record.id, active)}
          checkedChildren="Active"
          unCheckedChildren="Inactive"
        />
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 80,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EyeOutlined />}
          onClick={() => fetchCustomerDetails(record.id)}
        />
      ),
    },
  ];

  const orderStatusColors = {
    pending: 'orange',
    confirmed: 'blue',
    processing: 'cyan',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">Manage your customers and view their purchase history</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Total Customers"
                value={parseInt(stats.total_customers) || 0}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Active"
                value={parseInt(stats.active_customers) || 0}
                valueStyle={{ color: '#22c55e' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="New This Month"
                value={parseInt(stats.new_this_month) || 0}
                valueStyle={{ color: '#3b82f6' }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Ordered This Month"
                value={parseInt(stats.ordering_customers) || 0}
                valueStyle={{ color: '#f59e0b' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search by name, email or phone..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onPressEnter={handleSearch}
            className="sm:w-64"
            allowClear
          />
          <Button type="primary" onClick={handleSearch}>Search</Button>
          <div className="flex gap-2">
            <Button
              type={statusFilter === '' ? 'primary' : 'default'}
              onClick={() => { setStatusFilter(''); setPagination(p => ({ ...p, page: 1 })); }}
            >
              All
            </Button>
            <Button
              type={statusFilter === 'active' ? 'primary' : 'default'}
              onClick={() => { setStatusFilter('active'); setPagination(p => ({ ...p, page: 1 })); }}
            >
              Active
            </Button>
            <Button
              type={statusFilter === 'inactive' ? 'primary' : 'default'}
              onClick={() => { setStatusFilter('inactive'); setPagination(p => ({ ...p, page: 1 })); }}
            >
              Inactive
            </Button>
          </div>
        </div>
      </Card>

      {/* Customers Table */}
      <Card>
        <Table
          dataSource={customers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showTotal: (total) => `${total} customers`,
            onChange: (page) => setPagination(prev => ({ ...prev, page })),
          }}
        />
      </Card>

      {/* Customer View Modal */}
      <Modal
        title="Customer Details"
        open={!!viewingCustomer}
        onCancel={() => setViewingCustomer(null)}
        footer={[
          <Button key="close" onClick={() => setViewingCustomer(null)}>Close</Button>,
        ]}
        width={900}
      >
        {viewLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : viewingCustomer && viewingCustomer.name ? (
          <Tabs
            defaultActiveKey="overview"
            items={[
              {
                key: 'overview',
                label: 'Overview',
                children: (
                  <div className="space-y-6">
                    {/* Customer Info */}
                    <Card size="small" title="Customer Information">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-gray-500 text-sm">Name</div>
                          <div className="font-medium text-lg">{viewingCustomer.name}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-sm">Status</div>
                          <Tag color={viewingCustomer.is_active ? 'green' : 'red'}>
                            {viewingCustomer.is_active ? 'Active' : 'Inactive'}
                          </Tag>
                        </div>
                        <div>
                          <div className="text-gray-500 text-sm flex items-center gap-1">
                            <MailOutlined /> Email
                          </div>
                          <div>{viewingCustomer.email}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-sm flex items-center gap-1">
                            <PhoneOutlined /> Phone
                          </div>
                          <div>{viewingCustomer.phone}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-sm">Member Since</div>
                          <div>{dayjs(viewingCustomer.created_at).format('DD MMM YYYY')}</div>
                        </div>
                        <div>
                          <div className="text-gray-500 text-sm">Last Login</div>
                          <div>{viewingCustomer.last_login ? dayjs(viewingCustomer.last_login).format('DD MMM YYYY, hh:mm A') : 'Never'}</div>
                        </div>
                      </div>
                    </Card>

                    {/* Order Summary */}
                    {viewingCustomer.order_summary && (
                      <Row gutter={[16, 16]}>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Total Orders"
                              value={parseInt(viewingCustomer.order_summary.total_orders) || 0}
                              prefix={<ShoppingCartOutlined />}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Completed"
                              value={parseInt(viewingCustomer.order_summary.completed_orders) || 0}
                              valueStyle={{ color: '#22c55e' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Total Spent"
                              value={parseFloat(viewingCustomer.order_summary.total_spent) || 0}
                              prefix="₹"
                              valueStyle={{ color: '#3b82f6' }}
                            />
                          </Card>
                        </Col>
                        <Col span={6}>
                          <Card size="small">
                            <Statistic
                              title="Avg Order Value"
                              value={parseFloat(viewingCustomer.order_summary.avg_order_value) || 0}
                              prefix="₹"
                              precision={0}
                            />
                          </Card>
                        </Col>
                      </Row>
                    )}

                    {viewingCustomer.order_summary?.last_order_date && (
                      <div className="text-sm text-gray-500">
                        <CalendarOutlined className="mr-1" />
                        Last order: {dayjs(viewingCustomer.order_summary.last_order_date).format('DD MMM YYYY')}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'orders',
                label: 'Recent Orders',
                children: viewingCustomer.recent_orders && viewingCustomer.recent_orders.length > 0 ? (
                  <Table
                    dataSource={viewingCustomer.recent_orders}
                    rowKey="id"
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Order #',
                        dataIndex: 'order_number',
                        key: 'order_number',
                        render: (num) => <span className="font-mono">{num}</span>,
                      },
                      {
                        title: 'Date',
                        dataIndex: 'created_at',
                        key: 'date',
                        render: (date) => dayjs(date).format('DD MMM YYYY'),
                      },
                      {
                        title: 'Amount',
                        dataIndex: 'total_amount',
                        key: 'amount',
                        render: (amt) => `₹${parseFloat(amt || 0).toLocaleString()}`,
                      },
                      {
                        title: 'Status',
                        dataIndex: 'status',
                        key: 'status',
                        render: (status) => (
                          <Tag color={orderStatusColors[status]}>{status?.toUpperCase()}</Tag>
                        ),
                      },
                    ]}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">No orders yet</div>
                ),
              },
              {
                key: 'products',
                label: 'Top Products',
                children: viewingCustomer.top_products && viewingCustomer.top_products.length > 0 ? (
                  <Table
                    dataSource={viewingCustomer.top_products}
                    rowKey={(record) => `${record.product_id}-${record.variant_id}`}
                    pagination={false}
                    size="small"
                    columns={[
                      {
                        title: 'Product',
                        key: 'product',
                        render: (_, record) => (
                          <div>
                            <div className="font-medium">{record.product_name}</div>
                            <div className="text-xs text-gray-500">{record.variant_name}</div>
                          </div>
                        ),
                      },
                      {
                        title: 'SKU',
                        dataIndex: 'sku',
                        key: 'sku',
                        render: (sku) => <code className="text-xs">{sku}</code>,
                      },
                      {
                        title: 'Qty Bought',
                        dataIndex: 'total_qty',
                        key: 'qty',
                        render: (qty) => parseInt(qty || 0),
                      },
                      {
                        title: 'Total Value',
                        dataIndex: 'total_value',
                        key: 'value',
                        render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
                      },
                      {
                        title: 'Orders',
                        dataIndex: 'order_count',
                        key: 'orders',
                      },
                    ]}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">No purchase history</div>
                ),
              },
              {
                key: 'addresses',
                label: 'Addresses',
                children: viewingCustomer.addresses && viewingCustomer.addresses.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {viewingCustomer.addresses.map(addr => (
                      <Card key={addr.id} size="small" className={addr.is_default ? 'border-blue-500' : ''}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <EnvironmentOutlined />
                              {addr.label}
                              {addr.is_default && <Tag color="blue" className="ml-2">Default</Tag>}
                            </div>
                            <div className="text-sm text-gray-600 mt-2">
                              {addr.address_line1}
                              {addr.address_line2 && <>, {addr.address_line2}</>}
                              <br />
                              {addr.city}, {addr.state} - {addr.pincode}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No addresses saved</div>
                ),
              },
            ]}
          />
        ) : null}
      </Modal>
    </div>
  );
}
