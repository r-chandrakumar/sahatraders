'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Tag, Card, Space, Modal, Form, Spin, Divider } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  ShoppingCartOutlined,
  EnvironmentOutlined,
  PhoneOutlined,
  MailOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;

const statusColors = {
  new: 'blue',
  in_progress: 'orange',
  responded: 'green',
  converted: 'purple',
  closed: 'default',
};

const typeColors = {
  product: 'cyan',
  order: 'gold',
  general: 'default',
};

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '', type: '' });
  const [viewModal, setViewModal] = useState({ visible: false, enquiry: null, loading: false });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Fetch enquiries from API
  useEffect(() => {
    fetchEnquiries();
  }, [filters.status, filters.type, pagination.page]);

  const fetchEnquiries = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
      };

      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;

      const response = await api.get('/enquiries', { params });
      setEnquiries(response.data.data || []);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination?.total || 0,
      }));
    } catch (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to fetch enquiries');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    try {
      await api.put(`/enquiries/${id}`, { status: newStatus });

      // Update local state
      setEnquiries(enquiries.map(e =>
        e.id === id ? { ...e, status: newStatus } : e
      ));
      toast.success('Status updated');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const fetchEnquiryDetails = async (id) => {
    setViewModal({ visible: true, enquiry: null, loading: true });
    try {
      const response = await api.get(`/enquiries/${id}`);
      setViewModal({ visible: true, enquiry: response.data.data, loading: false });
    } catch (error) {
      console.error('Error fetching enquiry details:', error);
      toast.error('Failed to load enquiry details');
      setViewModal({ visible: false, enquiry: null, loading: false });
    }
  };

  const columns = [
    {
      title: 'Customer',
      key: 'customer',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <div className="text-sm text-gray-500">{record.phone}</div>
        </div>
      ),
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={typeColors[type]}>{type?.toUpperCase() || 'GENERAL'}</Tag>
      ),
    },
    {
      title: 'Items',
      key: 'items',
      render: (_, record) => {
        const itemsCount = parseInt(record.items_count) || 0;
        const estimatedTotal = parseFloat(record.estimated_total) || 0;
        if (itemsCount > 0) {
          return (
            <div>
              <span className="font-medium">{itemsCount} items</span>
              {estimatedTotal > 0 && (
                <div className="text-xs text-gray-500">₹{estimatedTotal.toLocaleString()}</div>
              )}
            </div>
          );
        }
        return record.product_name || '-';
      },
    },
    {
      title: 'Message',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
      width: 200,
      render: (msg) => msg || '-',
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => dayjs(date).format('DD MMM, hh:mm A'),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => (
        <Select
          value={status}
          onChange={(value) => handleStatusChange(record.id, value)}
          style={{ width: 130 }}
          size="small"
        >
          <Select.Option value="new"><Tag color="blue">NEW</Tag></Select.Option>
          <Select.Option value="in_progress"><Tag color="orange">IN PROGRESS</Tag></Select.Option>
          <Select.Option value="responded"><Tag color="green">RESPONDED</Tag></Select.Option>
          <Select.Option value="converted"><Tag color="purple">CONVERTED</Tag></Select.Option>
          <Select.Option value="closed"><Tag>CLOSED</Tag></Select.Option>
        </Select>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => fetchEnquiryDetails(record.id)}
          />
          {(record.type === 'order' && record.status !== 'converted') && (
            <Button
              type="text"
              icon={<ShoppingCartOutlined />}
              title="Convert to Order"
              onClick={() => {
                handleStatusChange(record.id, 'converted');
                toast.success('Converted to order');
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  // Client-side search filtering (status and type are handled by API)
  const filteredEnquiries = enquiries.filter(e => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!e.name.toLowerCase().includes(search) &&
          !e.message.toLowerCase().includes(search)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="page-title">Enquiries</h1>
        <p className="page-subtitle">Manage customer enquiries from the website</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { status: 'new', label: 'New', color: 'blue' },
          { status: 'in_progress', label: 'In Progress', color: 'orange' },
          { status: 'responded', label: 'Responded', color: 'green' },
          { status: 'converted', label: 'Converted', color: 'purple' },
          { status: 'closed', label: 'Closed', color: 'default' },
        ].map(item => {
          const count = enquiries.filter(e => e.status === item.status).length;
          return (
            <Card
              key={item.status}
              size="small"
              className={`cursor-pointer ${filters.status === item.status ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setFilters({ ...filters, status: filters.status === item.status ? '' : item.status })}
            >
              <div className="text-center">
                <Tag color={item.color}>{item.label}</Tag>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search enquiries..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="sm:w-64"
            allowClear
          />
          <Select
            placeholder="Type"
            value={filters.type || undefined}
            onChange={(value) => setFilters({ ...filters, type: value })}
            className="sm:w-32"
            allowClear
            options={[
              { value: 'product', label: 'Product' },
              { value: 'order', label: 'Order' },
              { value: 'general', label: 'General' },
            ]}
          />
          <Select
            placeholder="Status"
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value })}
            className="sm:w-40"
            allowClear
            options={[
              { value: 'new', label: 'New' },
              { value: 'in_progress', label: 'In Progress' },
              { value: 'responded', label: 'Responded' },
              { value: 'converted', label: 'Converted' },
              { value: 'closed', label: 'Closed' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <Table
          dataSource={filteredEnquiries}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            current: pagination.page,
            pageSize: pagination.limit,
            total: pagination.total,
            showTotal: (total) => `${total} enquiries`,
            onChange: (page) => setPagination(prev => ({ ...prev, page })),
          }}
        />
      </Card>

      {/* View Enquiry Modal */}
      <Modal
        title="Enquiry Details"
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, enquiry: null, loading: false })}
        footer={[
          <Button key="close" onClick={() => setViewModal({ visible: false, enquiry: null, loading: false })}>
            Close
          </Button>,
          viewModal.enquiry?.type === 'order' && viewModal.enquiry?.status !== 'converted' && (
            <Button
              key="convert"
              type="primary"
              icon={<ShoppingCartOutlined />}
              onClick={() => {
                handleStatusChange(viewModal.enquiry.id, 'converted');
                setViewModal({ visible: false, enquiry: null, loading: false });
              }}
            >
              Convert to Order
            </Button>
          ),
        ]}
        width={700}
      >
        {viewModal.loading ? (
          <div className="flex justify-center py-8">
            <Spin size="large" />
          </div>
        ) : viewModal.enquiry ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Tag color={typeColors[viewModal.enquiry.type]}>
                {viewModal.enquiry.type?.toUpperCase() || 'GENERAL'}
              </Tag>
              <Tag color={statusColors[viewModal.enquiry.status]}>
                {viewModal.enquiry.status?.replace('_', ' ').toUpperCase() || 'NEW'}
              </Tag>
            </div>

            {/* Customer Info */}
            <Card size="small" title="Customer Information">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-gray-500 text-sm">Name</div>
                  <div className="font-medium">{viewModal.enquiry.name}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm flex items-center gap-1">
                    <PhoneOutlined /> Phone
                  </div>
                  <div>{viewModal.enquiry.phone || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm flex items-center gap-1">
                    <MailOutlined /> Email
                  </div>
                  <div>{viewModal.enquiry.email || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">Date</div>
                  <div>{dayjs(viewModal.enquiry.created_at).format('DD MMM YYYY, hh:mm A')}</div>
                </div>
              </div>

              {viewModal.enquiry.address && (
                <div className="mt-4">
                  <div className="text-gray-500 text-sm flex items-center gap-1">
                    <EnvironmentOutlined /> Delivery Address
                  </div>
                  <div className="mt-1">{viewModal.enquiry.address}</div>
                </div>
              )}
            </Card>

            {/* Order Items */}
            {viewModal.enquiry.items && viewModal.enquiry.items.length > 0 && (
              <Card size="small" title="Enquiry Items">
                <Table
                  dataSource={viewModal.enquiry.items}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    {
                      title: 'Product',
                      key: 'product',
                      render: (_, item) => (
                        <div>
                          <div className="font-medium">{item.product_name}</div>
                          <div className="text-xs text-gray-500">{item.variant_name}</div>
                        </div>
                      ),
                    },
                    {
                      title: 'SKU',
                      dataIndex: 'sku',
                      key: 'sku',
                    },
                    {
                      title: 'Qty',
                      dataIndex: 'quantity',
                      key: 'quantity',
                      width: 60,
                    },
                    {
                      title: 'Unit Price',
                      dataIndex: 'unit_price',
                      key: 'unit_price',
                      render: (price) => price ? `₹${parseFloat(price).toLocaleString()}` : '-',
                    },
                    {
                      title: 'Total',
                      key: 'total',
                      render: (_, item) => {
                        if (item.unit_price && item.quantity) {
                          return `₹${(parseFloat(item.unit_price) * item.quantity).toLocaleString()}`;
                        }
                        return '-';
                      },
                    },
                  ]}
                />
                {viewModal.enquiry.estimated_total > 0 && (
                  <div className="flex justify-end mt-4 pt-4 border-t">
                    <div className="text-right">
                      <span className="text-gray-500 mr-4">Estimated Total:</span>
                      <span className="text-xl font-bold text-primary">
                        ₹{parseFloat(viewModal.enquiry.estimated_total).toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {/* Single Product (legacy support) */}
            {viewModal.enquiry.product_name && (!viewModal.enquiry.items || viewModal.enquiry.items.length === 0) && (
              <div>
                <div className="text-gray-500 text-sm">Product</div>
                <div className="font-medium">
                  {viewModal.enquiry.product_name}
                  {viewModal.enquiry.variant_name && (
                    <span className="text-gray-500 ml-2">({viewModal.enquiry.variant_name})</span>
                  )}
                </div>
              </div>
            )}

            {/* Message */}
            {viewModal.enquiry.message && (
              <div>
                <div className="text-gray-500 text-sm mb-1">Message / Notes</div>
                <div className="bg-gray-50 p-4 rounded-lg">{viewModal.enquiry.message}</div>
              </div>
            )}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
