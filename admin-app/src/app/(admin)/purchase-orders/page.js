'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Button, Input, Select, Tag, Card, Space, Modal, Form, InputNumber, DatePicker } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusColors = {
  draft: 'default',
  ordered: 'blue',
  partial: 'orange',
  received: 'green',
  cancelled: 'red',
};

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [receiveModal, setReceiveModal] = useState({ visible: false, po: null, loading: false });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [form] = Form.useForm();

  // Fetch purchase orders on mount
  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/purchase-orders');
      setPOs(response.data.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const openReceiveModal = async (record) => {
    setReceiveModal({ visible: true, po: null, loading: true });
    try {
      // Fetch PO details with items
      const response = await api.get(`/admin/purchase-orders/${record.id}`);
      const poData = response.data.data;
      setReceiveModal({ visible: true, po: poData, loading: false });
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
      toast.error('Failed to load purchase order details');
      setReceiveModal({ visible: false, po: null, loading: false });
    }
  };

  const handleReceive = async (values) => {
    const { po_id, items } = values;

    // Convert items object to array (Ant Design form creates object with numeric keys)
    const itemsArray = items ? Object.values(items).filter(item => item && item.received_qty > 0) : [];

    if (itemsArray.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    try {
      setLoading(true);
      // Call API to receive items (PUT request)
      await api.put(`/admin/purchase-orders/${po_id}/receive`, { items: itemsArray });

      toast.success('Items received and stock updated');
      setReceiveModal({ visible: false, po: null, loading: false });
      form.resetFields();

      // Refresh the purchase orders list
      await fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to receive items:', error);
      toast.error('Failed to receive items');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'PO Number',
      key: 'po',
      render: (_, record) => (
        <div>
          <div className="font-medium text-blue-600">{record.po_number}</div>
          <div className="text-sm text-gray-500">{dayjs(record.created_at).format('DD MMM YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier',
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'amount',
      render: (amount) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Expected',
      dataIndex: 'expected_date',
      key: 'expected',
      render: (date) => date ? dayjs(date).format('DD MMM YYYY') : '-',
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
      width: 150,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EyeOutlined />} title="View Details" />
          {(record.status === 'ordered' || record.status === 'partial') && (
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => openReceiveModal(record)}
            >
              Receive
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredPOs = pos.filter(po => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!po.po_number.toLowerCase().includes(search) &&
          !po.supplier_name.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filters.status && po.status !== filters.status) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage supplier purchase orders</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Create PO
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { status: 'draft', label: 'Draft' },
          { status: 'ordered', label: 'Ordered' },
          { status: 'partial', label: 'Partial' },
          { status: 'received', label: 'Received' },
        ].map(item => {
          const count = pos.filter(p => p.status === item.status).length;
          return (
            <Card
              key={item.status}
              size="small"
              className={`cursor-pointer ${filters.status === item.status ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setFilters({ ...filters, status: filters.status === item.status ? '' : item.status })}
            >
              <div className="text-center">
                <Tag color={statusColors[item.status]}>{item.label}</Tag>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search POs..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="sm:w-64"
            allowClear
          />
          <Select
            placeholder="Status"
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value })}
            className="sm:w-40"
            allowClear
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'partial', label: 'Partial' },
              { value: 'received', label: 'Received' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <Table
          dataSource={filteredPOs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} purchase orders`,
          }}
        />
      </Card>

      {/* Receive Modal */}
      <Modal
        title="Receive Items"
        open={receiveModal.visible}
        onCancel={() => setReceiveModal({ visible: false, po: null, loading: false })}
        footer={null}
        width={600}
      >
        {receiveModal.loading && (
          <div className="text-center py-8">Loading purchase order details...</div>
        )}
        {receiveModal.po && receiveModal.po.items && (
          <Form
            form={form}
            layout="vertical"
            onFinish={(values) => handleReceive({ po_id: receiveModal.po.id, ...values })}
          >
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="font-medium">{receiveModal.po.po_number}</div>
              <div className="text-sm text-gray-500">{receiveModal.po.supplier_name}</div>
            </div>

            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Items to Receive</div>
              {receiveModal.po.items.map((item, index) => {
                const remaining = item.quantity - item.received_qty;
                return (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded mb-2">
                    <div className="flex-1">
                      <div className="font-medium">{item.product_name} - {item.variant_name}</div>
                      <div className="text-sm text-gray-500">
                        Ordered: {item.quantity} | Received: {item.received_qty} | Remaining: {remaining}
                      </div>
                    </div>
                    <Form.Item
                      name={['items', index, 'item_id']}
                      initialValue={item.id}
                      hidden
                    >
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={['items', index, 'received_qty']}
                      initialValue={remaining}
                      className="mb-0"
                    >
                      <InputNumber min={0} max={remaining} style={{ width: 100 }} />
                    </Form.Item>
                  </div>
                );
              })}
            </div>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" block>
                Confirm Receipt
              </Button>
            </Form.Item>
          </Form>
        )}
        {receiveModal.po && !receiveModal.po.items && !receiveModal.loading && (
          <div className="text-center py-8 text-gray-500">No items found for this purchase order</div>
        )}
      </Modal>
    </div>
  );
}
