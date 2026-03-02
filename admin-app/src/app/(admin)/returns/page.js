'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Tag,
  Input,
  Select,
  Space,
  Modal,
  Form,
  InputNumber,
  Descriptions,
  Empty,
  Divider,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  CloseOutlined,
  RollbackOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;

const statusColors = {
  pending: 'orange',
  approved: 'blue',
  processed: 'green',
  rejected: 'red',
};

const typeColors = {
  return: 'purple',
  credit_note: 'cyan',
};


export default function ReturnsPage() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: '', status: '', type: '' });
  const [viewModal, setViewModal] = useState({ visible: false, item: null });
  const [createModal, setCreateModal] = useState(false);
  const [processModal, setProcessModal] = useState({ visible: false, item: null });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [returnItems, setReturnItems] = useState([]);
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  const [form] = Form.useForm();

  // Fetch returns on mount
  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/returns');
      setReturns(response.data.data || []);
    } catch (error) {
      console.error('Error fetching returns:', error);
      toast.error('Failed to load returns');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReturn = async (values) => {
    try {
      const payload = {
        sales_order_id: selectedOrder.id,
        type: values.type,
        reason: values.reason,
        items: returnItems.filter(i => i.quantity > 0).map(i => ({
          variant_id: i.variant_id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          refund_amount: i.refund_amount,
        })),
      };

      await api.post('/admin/returns', payload);
      toast.success('Return request created successfully');

      setCreateModal(false);
      setSelectedOrder(null);
      setReturnItems([]);
      form.resetFields();

      // Refresh the returns list
      fetchReturns();
    } catch (error) {
      console.error('Error creating return:', error);
      toast.error(error.response?.data?.message || 'Failed to create return');
    }
  };

  const handleProcess = async (id, action, rejectionReason = '') => {
    try {
      let successMessage = '';

      switch (action) {
        case 'approve':
          await api.put(`/admin/returns/${id}/approve`);
          successMessage = 'Return approved successfully';
          break;
        case 'reject':
          await api.put(`/admin/returns/${id}/reject`, { rejection_reason: rejectionReason });
          successMessage = 'Return rejected';
          break;
        case 'process':
          await api.put(`/admin/returns/${id}/process`);
          successMessage = 'Return processed and stock updated';
          break;
        default:
          throw new Error('Invalid action');
      }

      toast.success(successMessage);
      setProcessModal({ visible: false, item: null });

      // Refresh the returns list
      fetchReturns();
    } catch (error) {
      console.error('Error processing return:', error);
      toast.error(error.response?.data?.message || 'Failed to process return');
    }
  };

  const fetchDeliveredOrders = async () => {
    try {
      setOrdersLoading(true);
      const response = await api.get('/admin/sales-orders?status=delivered&limit=100');
      setDeliveredOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch delivered orders:', error);
      toast.error('Failed to load delivered orders');
    } finally {
      setOrdersLoading(false);
    }
  };

  const handleOrderSelect = async (orderId) => {
    setSelectedOrder(null);
    setReturnItems([]);
    try {
      setOrderDetailLoading(true);
      const response = await api.get(`/admin/sales-orders/${orderId}`);
      const data = response.data.data;
      setSelectedOrder({
        id: data.id,
        order_number: data.order_number,
        customer_name: data.customer_name,
        total: parseFloat(data.total_amount),
        items: (data.items || []).map(item => ({
          id: item.id,
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant: item.variant_name,
          quantity: parseFloat(item.quantity),
          unit_price: parseFloat(item.unit_price),
        })),
      });
    } catch (error) {
      console.error('Failed to fetch order details:', error);
      toast.error('Failed to load order details');
    } finally {
      setOrderDetailLoading(false);
    }
  };

  const addReturnItem = (item, quantity) => {
    const existingIndex = returnItems.findIndex(i => i.variant_id === item.variant_id);
    if (existingIndex >= 0) {
      const updated = [...returnItems];
      updated[existingIndex].quantity = quantity;
      updated[existingIndex].refund_amount = quantity * item.unit_price;
      setReturnItems(updated);
    } else {
      setReturnItems([
        ...returnItems,
        {
          variant_id: item.variant_id,
          product_name: item.product_name,
          variant: item.variant,
          quantity,
          unit_price: item.unit_price,
          refund_amount: quantity * item.unit_price,
        }
      ]);
    }
  };

  const columns = [
    {
      title: 'Return #',
      key: 'return',
      render: (_, record) => (
        <div>
          <div className="font-medium text-blue-600">{record.return_number}</div>
          <div className="text-sm text-gray-500">{record.order_number}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer',
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={typeColors[type]}>
          {type === 'credit_note' ? 'CREDIT NOTE' : 'RETURN'}
        </Tag>
      ),
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'amount',
      render: (amount) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      ellipsis: true,
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
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
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => setViewModal({ visible: true, item: record })}
          />
          {record.status === 'pending' && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleProcess(record.id, 'approve')}
              >
                Approve
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setProcessModal({ visible: true, item: record })}
              >
                Reject
              </Button>
            </>
          )}
          {record.status === 'approved' && (
            <Button
              type="primary"
              size="small"
              onClick={() => handleProcess(record.id, 'process')}
            >
              Process
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const filteredReturns = returns.filter(r => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!r.return_number.toLowerCase().includes(search) &&
          !r.order_number.toLowerCase().includes(search) &&
          !r.customer_name.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filters.status && r.status !== filters.status) return false;
    if (filters.type && r.type !== filters.type) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Returns & Credit Notes</h1>
          <p className="page-subtitle">Manage product returns and credit notes</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => { setCreateModal(true); fetchDeliveredOrders(); }}
        >
          New Return
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { status: 'pending', label: 'Pending' },
          { status: 'approved', label: 'Approved' },
          { status: 'processed', label: 'Processed' },
          { status: 'rejected', label: 'Rejected' },
        ].map(item => {
          const count = returns.filter(r => r.status === item.status).length;
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

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search returns..."
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
            className="sm:w-40"
            allowClear
            options={[
              { value: 'return', label: 'Return' },
              { value: 'credit_note', label: 'Credit Note' },
            ]}
          />
          <Select
            placeholder="Status"
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value })}
            className="sm:w-40"
            allowClear
            options={[
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'processed', label: 'Processed' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <Table
          dataSource={filteredReturns}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} returns`,
          }}
        />
      </Card>

      {/* View Modal */}
      <Modal
        title="Return Details"
        open={viewModal.visible}
        onCancel={() => setViewModal({ visible: false, item: null })}
        footer={[
          <Button key="close" onClick={() => setViewModal({ visible: false, item: null })}>
            Close
          </Button>
        ]}
        width={600}
      >
        {viewModal.item && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Tag color={typeColors[viewModal.item.type]}>
                {viewModal.item.type === 'credit_note' ? 'CREDIT NOTE' : 'RETURN'}
              </Tag>
              <Tag color={statusColors[viewModal.item.status]}>
                {viewModal.item.status.toUpperCase()}
              </Tag>
            </div>

            <Descriptions column={2} size="small">
              <Descriptions.Item label="Return #">{viewModal.item.return_number}</Descriptions.Item>
              <Descriptions.Item label="Order #">{viewModal.item.order_number}</Descriptions.Item>
              <Descriptions.Item label="Customer">{viewModal.item.customer_name}</Descriptions.Item>
              <Descriptions.Item label="Date">{dayjs(viewModal.item.created_at).format('DD MMM YYYY, hh:mm A')}</Descriptions.Item>
            </Descriptions>

            <div>
              <div className="text-gray-500 text-sm mb-1">Reason</div>
              <div className="bg-gray-50 p-3 rounded">{viewModal.item.reason}</div>
            </div>

            {viewModal.item.rejection_reason && (
              <div>
                <div className="text-gray-500 text-sm mb-1">Rejection Reason</div>
                <div className="bg-red-50 p-3 rounded text-red-600">{viewModal.item.rejection_reason}</div>
              </div>
            )}

            {viewModal.item.items?.length > 0 && (
              <div>
                <div className="text-gray-500 text-sm mb-2">Items</div>
                {viewModal.item.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 border rounded mb-2">
                    <div>
                      <div className="font-medium">{item.product_name}</div>
                      <div className="text-sm text-gray-500">{item.variant} × {item.quantity}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">₹{item.refund_amount.toLocaleString()}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <Divider />
            <div className="flex justify-between text-lg">
              <span className="font-medium">Total Refund Amount</span>
              <span className="font-bold">₹{viewModal.item.total_amount.toLocaleString()}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Return Modal */}
      <Modal
        title="Create Return / Credit Note"
        open={createModal}
        onCancel={() => {
          setCreateModal(false);
          setSelectedOrder(null);
          setReturnItems([]);
          form.resetFields();
        }}
        footer={null}
        width={700}
      >
        <Form form={form} layout="vertical" onFinish={handleCreateReturn}>
          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true }]}
            initialValue="return"
          >
            <Select
              options={[
                { value: 'return', label: 'Product Return' },
                { value: 'credit_note', label: 'Credit Note' },
              ]}
            />
          </Form.Item>

          <Form.Item label="Select Delivered Order" required>
            <Select
              placeholder="Search order by number or customer"
              showSearch
              optionFilterProp="label"
              onChange={handleOrderSelect}
              loading={ordersLoading}
              options={deliveredOrders.map(o => ({
                value: o.id,
                label: `${o.order_number} - ${o.customer_name}`,
              }))}
            />
          </Form.Item>

          {orderDetailLoading && (
            <div className="text-center py-4"><Spin /> Loading order details...</div>
          )}

          {selectedOrder && (
            <>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <div className="font-medium">{selectedOrder.customer_name}</div>
                <div className="text-sm text-gray-500">Order Total: ₹{selectedOrder.total.toLocaleString()}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Select Items to Return</div>
                {selectedOrder.items.map((item) => {
                  const returnItem = returnItems.find(ri => ri.variant_id === item.variant_id);
                  return (
                    <div key={item.id} className="flex items-center gap-4 p-3 border rounded mb-2">
                      <div className="flex-1">
                        <div className="font-medium">{item.product_name}</div>
                        <div className="text-sm text-gray-500">
                          {item.variant} • Max: {item.quantity} • ₹{item.unit_price}/unit
                        </div>
                      </div>
                      <InputNumber
                        min={0}
                        max={item.quantity}
                        value={returnItem?.quantity || 0}
                        onChange={(val) => addReturnItem(item, val || 0)}
                        placeholder="Qty"
                        style={{ width: 80 }}
                      />
                      <div className="w-24 text-right font-medium">
                        ₹{((returnItem?.quantity || 0) * item.unit_price).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="bg-blue-50 p-3 rounded-lg mb-4 flex justify-between">
                <span className="font-medium">Total Refund</span>
                <span className="font-bold text-blue-600">
                  ₹{returnItems.reduce((sum, i) => sum + i.refund_amount, 0).toLocaleString()}
                </span>
              </div>
            </>
          )}

          <Form.Item
            name="reason"
            label="Reason"
            rules={[{ required: true, message: 'Please enter reason' }]}
          >
            <TextArea rows={3} placeholder="Reason for return / credit note" />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setCreateModal(false)}>Cancel</Button>
              <Button
                type="primary"
                htmlType="submit"
                disabled={!selectedOrder || returnItems.filter(i => i.quantity > 0).length === 0}
              >
                Create Return
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Reject Modal */}
      <Modal
        title="Reject Return"
        open={processModal.visible}
        onCancel={() => setProcessModal({ visible: false, item: null })}
        onOk={() => {
          const reason = document.getElementById('reject-reason')?.value;
          if (!reason) {
            toast.error('Please provide a rejection reason');
            return;
          }
          handleProcess(processModal.item.id, 'reject', reason);
        }}
        okText="Reject"
        okButtonProps={{ danger: true }}
      >
        <div className="mb-4">
          Are you sure you want to reject this return request?
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1">Rejection Reason *</label>
          <TextArea id="reject-reason" rows={3} placeholder="Reason for rejection..." />
        </div>
      </Modal>
    </div>
  );
}
