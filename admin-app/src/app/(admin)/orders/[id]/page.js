'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Button,
  Tag,
  Table,
  Timeline,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Divider,
  Spin,
  Empty,
  Steps,
} from 'antd';
import {
  ArrowLeftOutlined,
  PrinterOutlined,
  EditOutlined,
  DollarOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  UserOutlined,
  SendOutlined,
  BellOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;

const statusColors = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

const statusSteps = ['confirmed', 'processing', 'shipped', 'delivered'];

const paymentStatusColors = {
  unpaid: 'red',
  partial: 'orange',
  paid: 'green',
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [notifyModal, setNotifyModal] = useState(false);
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  useEffect(() => {
    fetchOrder();
  }, [params.id]);

  const fetchOrder = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/admin/sales-orders/${params.id}`);
      const orderData = response.data.data || response.data;
      setOrder(orderData);
    } catch (error) {
      console.error('Error fetching order:', error);
      toast.error('Failed to load order details');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (values) => {
    try {
      await api.put(`/admin/sales-orders/${params.id}/status`, { status: values.status });
      toast.success('Order status updated');
      setStatusModal(false);
      fetchOrder();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error.response?.data?.message || 'Failed to update status');
    }
  };

  const handleGenerateInvoice = async () => {
    setInvoiceLoading(true);
    try {
      await api.post('/admin/invoices', {
        sales_order_id: order.id,
        due_date: dayjs().add(30, 'day').format('YYYY-MM-DD'),
      });
      toast.success('Invoice generated');
      fetchOrder();
    } catch (error) {
      console.error('Error generating invoice:', error);
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const handlePaymentRecord = async (values) => {
    const invoice = order.invoices?.[0];
    if (!invoice) {
      toast.error('Please generate an invoice first');
      return;
    }
    try {
      await api.post(`/admin/invoices/${invoice.id}/payments`, {
        amount: values.amount,
        payment_method: values.payment_method,
        payment_date: dayjs().format('YYYY-MM-DD'),
        reference: values.reference || null,
        notes: values.notes || null,
      });
      toast.success('Payment recorded');
      setPaymentModal(false);
      paymentForm.resetFields();
      fetchOrder();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    }
  };

  const handleSendNotification = async (type) => {
    setNotifyLoading(true);
    try {
      const response = await api.post(`/admin/sales-orders/${params.id}/notify`, { type });
      const msg = response.data?.message || 'Notification sent';
      toast.success(msg);
      setNotifyModal(false);
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error(error.response?.data?.message || 'Failed to send notification');
    } finally {
      setNotifyLoading(false);
    }
  };

  const getCurrentStep = () => {
    if (!order) return -1;
    if (order.status === 'cancelled') return -1;
    return statusSteps.indexOf(order.status);
  };

  const getPaidAmount = () => {
    if (!order) return 0;
    if (order.paid_amount != null) return parseFloat(order.paid_amount) || 0;
    if (!order.payments?.length) return 0;
    return order.payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
  };

  const getPaymentStatus = () => {
    if (!order) return 'unpaid';
    const paid = getPaidAmount();
    const total = parseFloat(order.total_amount) || 0;
    if (paid >= total && total > 0) return 'paid';
    if (paid > 0) return 'partial';
    return 'unpaid';
  };

  const itemColumns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          <div className="text-sm text-gray-500">{record.variant_name}</div>
          <div className="text-xs text-gray-400">SKU: {record.sku}</div>
        </div>
      ),
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      align: 'center',
      render: (qty) => parseFloat(qty) || 0,
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right',
      render: (price) => `₹${(parseFloat(price) || 0).toLocaleString()}`,
    },
    {
      title: 'Tax',
      dataIndex: 'tax_percent',
      key: 'tax_percent',
      align: 'center',
      render: (rate) => `${parseFloat(rate) || 0}%`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount_percent',
      key: 'discount_percent',
      align: 'right',
      render: (disc) => {
        const d = parseFloat(disc) || 0;
        return d > 0 ? `${d}%` : '-';
      },
    },
    {
      title: 'Total',
      dataIndex: 'total_line',
      key: 'total_line',
      align: 'right',
      render: (total) => <span className="font-medium">₹{(parseFloat(total) || 0).toLocaleString()}</span>,
    },
  ];

  const paymentColumns = [
    {
      title: 'Date',
      dataIndex: 'payment_date',
      key: 'payment_date',
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Method',
      dataIndex: 'payment_method',
      key: 'payment_method',
      render: (method) => (
        <Tag>{(method || '').replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Reference',
      dataIndex: 'reference',
      key: 'reference',
      render: (ref) => ref || '-',
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      key: 'amount',
      align: 'right',
      render: (amount) => <span className="font-medium text-green-600">₹{(parseFloat(amount) || 0).toLocaleString()}</span>,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Empty description="Order not found" />
      </div>
    );
  }

  const paidAmount = getPaidAmount();
  const paymentStatus = getPaymentStatus();
  const totalAmount = parseFloat(order.total_amount) || 0;
  const balanceAmount = totalAmount - paidAmount;

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
          />
          <div>
            <h1 className="page-title flex items-center gap-2">
              {order.order_number}
              <Tag color={statusColors[order.status]}>{(order.status || '').toUpperCase()}</Tag>
            </h1>
            <p className="page-subtitle">
              Created on {dayjs(order.created_at).format('DD MMM YYYY, hh:mm A')}
            </p>
          </div>
        </div>
        <Space>
          <Button icon={<PrinterOutlined />}>Print</Button>
          {order.customer_email && (
            <Button
              icon={<BellOutlined />}
              onClick={() => setNotifyModal(true)}
            >
              Send Notification
            </Button>
          )}
          <Button
            type="primary"
            icon={<EditOutlined />}
            onClick={() => {
              form.setFieldsValue({ status: order.status });
              setStatusModal(true);
            }}
          >
            Update Status
          </Button>
        </Space>
      </div>

      {/* Order Progress */}
      {order.status !== 'cancelled' && (
        <Card className="mb-6">
          <Steps
            current={getCurrentStep()}
            items={statusSteps.map((status) => ({
              title: status.charAt(0).toUpperCase() + status.slice(1),
            }))}
          />
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <Card title="Order Items">
            <Table
              dataSource={order.items || []}
              columns={itemColumns}
              rowKey="id"
              pagination={false}
              summary={() => (
                <>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">
                      <span className="text-gray-500">Subtotal</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      ₹{(parseFloat(order.subtotal) || 0).toLocaleString()}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">
                      <span className="text-gray-500">Tax (GST)</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      ₹{(parseFloat(order.tax_amount) || 0).toLocaleString()}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {parseFloat(order.discount_amount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={5} align="right">
                        <span className="text-gray-500">Discount</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="right" className="text-red-500">
                        -₹{(parseFloat(order.discount_amount) || 0).toLocaleString()}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  {parseFloat(order.shipping_amount) > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={5} align="right">
                        <span className="text-gray-500">Shipping</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="right">
                        ₹{(parseFloat(order.shipping_amount) || 0).toLocaleString()}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">
                      <span className="font-bold text-lg">Total</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      <span className="font-bold text-lg">₹{totalAmount.toLocaleString()}</span>
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                </>
              )}
            />
          </Card>

          {/* Payment History */}
          <Card
            title="Payment History"
            extra={
              balanceAmount > 0 && (
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={() => {
                    if (!order.invoices?.length) {
                      toast.error('Please generate an invoice first');
                      return;
                    }
                    paymentForm.setFieldsValue({ amount: balanceAmount });
                    setPaymentModal(true);
                  }}
                >
                  Record Payment
                </Button>
              )
            }
          >
            {order.payments?.length > 0 ? (
              <Table
                dataSource={order.payments}
                columns={paymentColumns}
                rowKey="id"
                pagination={false}
                summary={() => (
                  <>
                    <Table.Summary.Row className="bg-gray-50">
                      <Table.Summary.Cell colSpan={3}>
                        <span className="font-medium">Total Paid</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="right">
                        <span className="font-bold text-green-600">₹{paidAmount.toLocaleString()}</span>
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                    {balanceAmount > 0 && (
                      <Table.Summary.Row className="bg-red-50">
                        <Table.Summary.Cell colSpan={3}>
                          <span className="font-medium text-red-600">Balance Due</span>
                        </Table.Summary.Cell>
                        <Table.Summary.Cell align="right">
                          <span className="font-bold text-red-600">₹{balanceAmount.toLocaleString()}</span>
                        </Table.Summary.Cell>
                      </Table.Summary.Row>
                    )}
                  </>
                )}
              />
            ) : (
              <Empty description="No payments recorded" />
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Details */}
          <Card title="Customer Details">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <UserOutlined className="text-gray-400" />
                <span className="font-medium">{order.customer_name}</span>
              </div>
              {order.customer_phone && (
                <div className="flex items-center gap-2">
                  <PhoneOutlined className="text-gray-400" />
                  <a href={`tel:${order.customer_phone}`} className="text-blue-600">
                    {order.customer_phone}
                  </a>
                </div>
              )}
              {order.customer_email && (
                <div className="flex items-center gap-2">
                  <MailOutlined className="text-gray-400" />
                  <a href={`mailto:${order.customer_email}`} className="text-blue-600">
                    {order.customer_email}
                  </a>
                </div>
              )}
            </div>
          </Card>

          {/* Shipping Address */}
          {order.shipping_address && (
            <Card title="Shipping Address">
              <div className="flex gap-2">
                <EnvironmentOutlined className="text-gray-400 mt-1" />
                <div>
                  <div>{order.shipping_address}</div>
                  {(order.shipping_city || order.shipping_state || order.shipping_pincode) && (
                    <div className="text-gray-500 text-sm mt-1">
                      {[order.shipping_city, order.shipping_state, order.shipping_pincode].filter(Boolean).join(', ')}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Payment Summary */}
          <Card title="Payment Summary">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Tag color={paymentStatusColors[paymentStatus]}>
                  {paymentStatus.toUpperCase()}
                </Tag>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid Amount</span>
                <span className="font-medium text-green-600">₹{paidAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance</span>
                <span className={`font-bold ${balanceAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  ₹{balanceAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </Card>

          {/* Invoices */}
          <Card title="Invoices">
            {order.invoices?.length > 0 ? (
              <div className="space-y-2">
                {order.invoices.map((inv) => (
                  <div key={inv.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 font-medium">
                        {inv.invoice_number}
                      </Link>
                      <Tag color={paymentStatusColors[inv.status] || 'default'}>{(inv.status || '').toUpperCase()}</Tag>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {dayjs(inv.invoice_date || inv.created_at).format('DD MMM YYYY')} • ₹{(parseFloat(inv.total_amount) || 0).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="No invoices" />
            )}
            <Button
              type="dashed"
              block
              className="mt-3"
              icon={<FileTextOutlined />}
              onClick={handleGenerateInvoice}
              loading={invoiceLoading}
              disabled={order.invoices?.length > 0}
            >
              {order.invoices?.length > 0 ? 'Invoice Generated' : 'Generate Invoice'}
            </Button>
          </Card>

          {/* Order Info */}
          <Card title="Order Info">
            <div className="space-y-2 text-sm">
              {order.source && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Source</span>
                  <Tag>{order.source.replace('_', ' ').toUpperCase()}</Tag>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{dayjs(order.created_at).format('DD MMM YYYY, hh:mm A')}</span>
              </div>
              {order.updated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated</span>
                  <span>{dayjs(order.updated_at).format('DD MMM YYYY, hh:mm A')}</span>
                </div>
              )}
            </div>
          </Card>

          {/* Notes */}
          {order.notes && (
            <Card title="Order Notes">
              <div className="text-gray-600">{order.notes}</div>
            </Card>
          )}
        </div>
      </div>

      {/* Status Update Modal */}
      <Modal
        title="Update Order Status"
        open={statusModal}
        onCancel={() => setStatusModal(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleStatusUpdate}>
          <Form.Item
            name="status"
            label="New Status"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'processing', label: 'Processing' },
                { value: 'shipped', label: 'Shipped' },
                { value: 'delivered', label: 'Delivered' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          </Form.Item>
          <Form.Item name="note" label="Note (Optional)">
            <TextArea rows={3} placeholder="Add a note about this status change..." />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setStatusModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Update</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Send Notification Modal */}
      <Modal
        title="Send Email Notification"
        open={notifyModal}
        onCancel={() => setNotifyModal(false)}
        footer={null}
      >
        <div className="mb-4">
          <p className="text-gray-500 text-sm mb-1">Sending to:</p>
          <p className="font-medium">{order.customer_email}</p>
        </div>
        <div className="space-y-3">
          <Button
            block
            size="large"
            icon={<SendOutlined />}
            loading={notifyLoading}
            onClick={() => handleSendNotification('confirmation')}
            className="text-left h-auto py-3"
          >
            <div>
              <div className="font-medium">Order Confirmation</div>
              <div className="text-xs text-gray-500 font-normal">Order details, items, and total amount</div>
            </div>
          </Button>
          <Button
            block
            size="large"
            icon={<SendOutlined />}
            loading={notifyLoading}
            onClick={() => handleSendNotification('shipped')}
            disabled={!['shipped', 'delivered'].includes(order.status)}
            className="text-left h-auto py-3"
          >
            <div>
              <div className="font-medium">Order Shipped</div>
              <div className="text-xs text-gray-500 font-normal">Shipment notification with delivery info</div>
            </div>
          </Button>
          <Button
            block
            size="large"
            icon={<SendOutlined />}
            loading={notifyLoading}
            onClick={() => handleSendNotification('delivered')}
            disabled={order.status !== 'delivered'}
            className="text-left h-auto py-3"
          >
            <div>
              <div className="font-medium">Order Delivered</div>
              <div className="text-xs text-gray-500 font-normal">Delivery confirmation</div>
            </div>
          </Button>
        </div>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentModal}
        onCancel={() => {
          setPaymentModal(false);
          paymentForm.resetFields();
        }}
        footer={null}
      >
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <div className="text-sm text-gray-500">Balance Due</div>
          <div className="text-xl font-bold text-blue-600">₹{balanceAmount.toLocaleString()}</div>
        </div>
        <Form form={paymentForm} layout="vertical" onFinish={handlePaymentRecord}>
          <Form.Item
            name="amount"
            label="Amount"
            rules={[
              { required: true, message: 'Please enter amount' },
              { type: 'number', max: balanceAmount, message: `Amount cannot exceed ₹${balanceAmount}` },
            ]}
            initialValue={balanceAmount}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={1}
              max={balanceAmount}
              prefix="₹"
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item
            name="payment_method"
            label="Payment Method"
            rules={[{ required: true, message: 'Please select payment method' }]}
          >
            <Select
              options={[
                { value: 'cash', label: 'Cash' },
                { value: 'bank_transfer', label: 'Bank Transfer' },
                { value: 'upi', label: 'UPI' },
                { value: 'cheque', label: 'Cheque' },
                { value: 'card', label: 'Card' },
              ]}
            />
          </Form.Item>
          <Form.Item name="reference" label="Reference Number">
            <Input placeholder="Transaction ID, Cheque number, etc." />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setPaymentModal(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">Record Payment</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
