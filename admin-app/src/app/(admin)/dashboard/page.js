'use client';

import { useState, useEffect } from 'react';
import { Card, Row, Col, Table, Tag, Statistic, Progress, Spin, message } from 'antd';
import {
  DollarOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  AlertOutlined,
  RiseOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
} from '@ant-design/icons';
import Link from 'next/link';
import api from '@/lib/api';

// Sample dashboard data
const sampleData = {
  sales: {
    total_orders: 156,
    total_revenue: 245000,
    delivered_revenue: 198000,
    by_status: [
      { status: 'enquiry', count: 12 },
      { status: 'confirmed', count: 8 },
      { status: 'processing', count: 5 },
      { status: 'shipped', count: 10 },
      { status: 'delivered', count: 118 },
      { status: 'cancelled', count: 3 },
    ]
  },
  recent_orders: [
    { id: 1, order_number: 'ORD-202512-0156', customer_name: 'John Sharma', total_amount: 2450, status: 'confirmed', created_at: '2025-12-05' },
    { id: 2, order_number: 'ORD-202512-0155', customer_name: 'Priya Patel', total_amount: 5680, status: 'processing', created_at: '2025-12-05' },
    { id: 3, order_number: 'ORD-202512-0154', customer_name: 'Raj Kumar', total_amount: 1200, status: 'shipped', created_at: '2025-12-04' },
    { id: 4, order_number: 'ORD-202512-0153', customer_name: 'Anita Singh', total_amount: 3400, status: 'delivered', created_at: '2025-12-04' },
    { id: 5, order_number: 'ORD-202512-0152', customer_name: 'Vikram Rao', total_amount: 8900, status: 'delivered', created_at: '2025-12-03' },
  ],
  stock: {
    total_stock_value: 1250000,
    total_units: 5680,
    low_stock_count: 8,
    low_stock_items: [
      { id: 1, sku: 'CUM001-500G', variant_name: '500g', stock_qty: 5, low_stock_threshold: 10, product_name: 'Cumin Seeds' },
      { id: 2, sku: 'PEP001-250G', variant_name: '250g', stock_qty: 3, low_stock_threshold: 10, product_name: 'Black Pepper' },
      { id: 3, sku: 'ALM001-500G', variant_name: '500g', stock_qty: 8, low_stock_threshold: 15, product_name: 'California Almonds' },
    ]
  },
  pending_enquiries: 5,
  pending_pos: 3,
  outstanding_invoices: {
    count: 12,
    total_outstanding: 45600
  },
  top_products: [
    { product_name: 'Cumin Seeds', variant_name: '250g', total_qty: 245, total_revenue: 23275 },
    { product_name: 'Black Pepper', variant_name: '100g', total_qty: 198, total_revenue: 23760 },
    { product_name: 'Turmeric Powder', variant_name: '500g', total_qty: 156, total_revenue: 23400 },
    { product_name: 'Groundnut Oil', variant_name: '1L', total_qty: 134, total_revenue: 33500 },
    { product_name: 'California Almonds', variant_name: '250g', total_qty: 98, total_revenue: 39200 },
  ]
};

const statusColors = {
  enquiry: 'blue',
  confirmed: 'gold',
  processing: 'orange',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/admin/dashboard/stats');
      setData(response.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data');
      message.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const recentOrderColumns = [
    {
      title: 'Order',
      dataIndex: 'order_number',
      key: 'order_number',
      render: (text, record) => (
        <Link href={`/orders/${record.id}`} className="text-blue-600 hover:text-blue-800">
          {text}
        </Link>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer_name',
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (amount) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
  ];

  const lowStockColumns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => `${record.product_name} - ${record.variant_name}`,
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Stock',
      dataIndex: 'stock_qty',
      key: 'stock_qty',
      render: (qty, record) => (
        <span className="text-red-600 font-medium">
          {qty} / {record.low_stock_threshold}
        </span>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Welcome back! Here is what is happening with your business.</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin size="large" tip="Loading dashboard data..." />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="text-red-500 text-lg mb-4">{error}</div>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={12} lg={6}>
              <Card className="dashboard-card">
                <Statistic
                  title="Total Revenue (30 days)"
                  value={data.sales.total_revenue}
                  prefix="₹"
                  valueStyle={{ color: '#3f8600' }}
                  suffix={<ArrowUpOutlined />}
                />
                <div className="mt-2 text-gray-500 text-sm">
                  {data.sales.total_orders} orders
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="dashboard-card">
                <Statistic
                  title="Stock Value"
                  value={data.stock.total_stock_value}
                  prefix="₹"
                  valueStyle={{ color: '#1890ff' }}
                />
                <div className="mt-2 text-gray-500 text-sm">
                  {data.stock.total_units.toLocaleString()} units
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="dashboard-card">
                <Statistic
                  title="Outstanding Invoices"
                  value={data.outstanding_invoices.total_outstanding}
                  prefix="₹"
                  valueStyle={{ color: '#faad14' }}
                />
                <div className="mt-2 text-gray-500 text-sm">
                  {data.outstanding_invoices.count} invoices pending
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card className="dashboard-card">
                <Statistic
                  title="Low Stock Alerts"
                  value={data.stock.low_stock_count}
                  valueStyle={{ color: '#cf1322' }}
                  prefix={<AlertOutlined />}
                />
                <div className="mt-2 text-gray-500 text-sm">
                  Items need restocking
                </div>
              </Card>
            </Col>
          </Row>

          {/* Quick Stats */}
          <Row gutter={[16, 16]} className="mb-6">
            <Col xs={24} sm={8}>
              <Card className="bg-blue-50 border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-blue-600 text-sm font-medium">Pending Enquiries</div>
                    <div className="text-2xl font-bold text-blue-700">{data.pending_enquiries}</div>
                  </div>
                  <Link href="/enquiries" className="text-blue-600 hover:text-blue-800 text-sm">
                    View All →
                  </Link>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="bg-orange-50 border-orange-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-orange-600 text-sm font-medium">Pending POs</div>
                    <div className="text-2xl font-bold text-orange-700">{data.pending_pos}</div>
                  </div>
                  <Link href="/purchase-orders" className="text-orange-600 hover:text-orange-800 text-sm">
                    View All →
                  </Link>
                </div>
              </Card>
            </Col>
            <Col xs={24} sm={8}>
              <Card className="bg-green-50 border-green-100">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-green-600 text-sm font-medium">Delivered Orders</div>
                    <div className="text-2xl font-bold text-green-700">
                      {data.sales.by_status.find(s => s.status === 'delivered')?.count || 0}
                    </div>
                  </div>
                  <Link href="/orders?status=delivered" className="text-green-600 hover:text-green-800 text-sm">
                    View All →
                  </Link>
                </div>
              </Card>
            </Col>
          </Row>

          {/* Tables */}
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={14}>
              <Card
                title="Recent Orders"
                extra={<Link href="/orders" className="text-blue-600">View All</Link>}
                className="dashboard-card"
              >
                <Table
                  dataSource={data.recent_orders}
                  columns={recentOrderColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
            <Col xs={24} lg={10}>
              <Card
                title={<span className="text-red-600">Low Stock Alerts</span>}
                extra={<Link href="/inventory?low_stock=true" className="text-blue-600">View All</Link>}
                className="dashboard-card"
              >
                <Table
                  dataSource={data.stock.low_stock_items}
                  columns={lowStockColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            </Col>
          </Row>

          {/* Top Products */}
          <Card title="Top Selling Products (30 days)" className="dashboard-card mt-6">
            <Row gutter={[16, 16]}>
              {data.top_products.map((product, index) => (
                <Col xs={24} sm={12} lg={4} key={index}>
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <div className="text-3xl mb-2">
                      {['🥇', '🥈', '🥉', '4️⃣', '5️⃣'][index]}
                    </div>
                    <div className="font-medium text-gray-900">{product.product_name}</div>
                    <div className="text-sm text-gray-500">{product.variant_name}</div>
                    <div className="text-lg font-bold text-blue-600 mt-2">
                      {product.total_qty} sold
                    </div>
                    <div className="text-sm text-gray-500">
                      ₹{product.total_revenue.toLocaleString()}
                    </div>
                  </div>
                </Col>
              ))}
            </Row>
          </Card>
        </>
      ) : null}
    </div>
  );
}
