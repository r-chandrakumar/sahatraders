'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Button, Input, Select, Tag, Card, Dropdown, Modal, DatePicker, Space } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  EditOutlined,
  FileTextOutlined,
  MoreOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { RangePicker } = DatePicker;

const statusColors = {
  enquiry: 'blue',
  confirmed: 'gold',
  processing: 'orange',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'enquiry', label: 'Enquiry' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'processing', label: 'Processing' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    dateRange: null,
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  const [statusModalVisible, setStatusModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Fetch orders from API
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
      };

      if (filters.status) {
        params.status = filters.status;
      }

      if (filters.search) {
        params.q = filters.search;
      }

      const response = await api.get('/admin/sales-orders', { params });

      setOrders(response.data.data || []);
      const paginationData = response.data.meta?.pagination || response.data.pagination || {};
      setPagination({
        ...pagination,
        total: paginationData.total || 0,
        current: paginationData.page || 1,
      });
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  // Fetch orders on mount and when filters/pagination change
  useEffect(() => {
    fetchOrders();
  }, [pagination.current, pagination.pageSize, filters.status, filters.search]);

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/api/orders/${orderId}/status`, { status: newStatus });

      // Update local state
      setOrders(orders.map(o =>
        o.id === orderId ? { ...o, status: newStatus } : o
      ));

      toast.success('Order status updated');
      setStatusModalVisible(false);
    } catch (error) {
      console.error('Error updating order status:', error);
      toast.error('Failed to update order status');
    }
  };

  const columns = [
    {
      title: 'Order',
      key: 'order',
      render: (_, record) => (
        <div>
          <Link href={`/orders/${record.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {record.order_number}
          </Link>
          <div className="text-xs text-gray-500">
            {dayjs(record.created_at).format('DD MMM YYYY, hh:mm A')}
          </div>
        </div>
      ),
    },
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.customer_name}</div>
          <div className="text-sm text-gray-500">{record.customer_phone}</div>
        </div>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'amount',
      render: (amount) => (
        <span className="font-medium">₹{amount.toLocaleString()}</span>
      ),
    },
    {
      title: 'Source',
      dataIndex: 'source',
      key: 'source',
      render: (source) => (
        <Tag>{source.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: <Link href={`/orders/${record.id}`}>View Details</Link>,
              },
              {
                key: 'status',
                icon: <EditOutlined />,
                label: 'Update Status',
                onClick: () => {
                  setSelectedOrder(record);
                  setStatusModalVisible(true);
                },
              },
              {
                key: 'invoice',
                icon: <FileTextOutlined />,
                label: 'Create Invoice',
                disabled: record.status === 'enquiry' || record.status === 'cancelled',
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const handleTableChange = (paginationConfig) => {
    setPagination({
      ...pagination,
      current: paginationConfig.current,
      pageSize: paginationConfig.pageSize,
    });
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Sales Orders</h1>
          <p className="page-subtitle">Manage customer orders and enquiries</p>
        </div>
        <Link href="/orders/new">
          <Button type="primary">Create Order</Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {statusOptions.slice(1).map(opt => {
          const count = orders.filter(o => o.status === opt.value).length;
          return (
            <Card
              key={opt.value}
              className={`cursor-pointer ${filters.status === opt.value ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setFilters({ ...filters, status: filters.status === opt.value ? '' : opt.value })}
              size="small"
            >
              <div className="text-center">
                <Tag color={statusColors[opt.value]} className="mb-1">{opt.label}</Tag>
                <div className="text-2xl font-bold">{count}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search orders..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="sm:w-64"
            allowClear
          />
          <Select
            placeholder="Status"
            value={filters.status}
            onChange={(value) => setFilters({ ...filters, status: value })}
            className="sm:w-40"
            options={statusOptions}
          />
          <RangePicker
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />
        </div>
      </Card>

      <Card>
        <Table
          dataSource={orders}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `${total} orders`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
          onChange={handleTableChange}
        />
      </Card>

      {/* Status Update Modal */}
      <Modal
        title="Update Order Status"
        open={statusModalVisible}
        onCancel={() => setStatusModalVisible(false)}
        footer={null}
      >
        {selectedOrder && (
          <div>
            <p className="mb-4">
              Update status for order <strong>{selectedOrder.order_number}</strong>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {statusOptions.slice(1).map(opt => (
                <Button
                  key={opt.value}
                  type={selectedOrder.status === opt.value ? 'primary' : 'default'}
                  onClick={() => handleStatusChange(selectedOrder.id, opt.value)}
                  block
                >
                  <Tag color={statusColors[opt.value]}>{opt.label}</Tag>
                </Button>
              ))}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
