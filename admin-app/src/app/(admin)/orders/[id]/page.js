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
  Descriptions,
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
  CheckOutlined,
  CloseOutlined,
  TruckOutlined,
  DollarOutlined,
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const { TextArea } = Input;

const statusColors = {
  pending: 'orange',
  confirmed: 'blue',
  processing: 'cyan',
  shipped: 'purple',
  delivered: 'green',
  cancelled: 'red',
};

const statusSteps = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

const paymentStatusColors = {
  unpaid: 'red',
  partial: 'orange',
  paid: 'green',
};

// Sample order data
const sampleOrder = {
  id: 1,
  order_number: 'SO-202512-0089',
  status: 'processing',
  payment_status: 'partial',
  customer_name: 'Ramesh Patel',
  customer_email: 'ramesh@example.com',
  customer_phone: '9876543210',
  shipping_address: '123 Main Street, Sector 5, Jaipur, Rajasthan - 302001',
  billing_address: '123 Main Street, Sector 5, Jaipur, Rajasthan - 302001',
  subtotal: 15000,
  tax_amount: 2700,
  discount_amount: 500,
  shipping_charge: 150,
  total_amount: 17350,
  paid_amount: 10000,
  notes: 'Please deliver before 5 PM',
  created_at: '2025-12-03T10:30:00',
  updated_at: '2025-12-04T14:20:00',
  items: [
    {
      id: 1,
      product_name: 'Premium Cumin Seeds',
      variant_name: '500g Pack',
      sku: 'CUM-500',
      quantity: 20,
      unit_price: 450,
      tax_rate: 18,
      discount: 0,
      total: 10620,
    },
    {
      id: 2,
      product_name: 'Black Pepper Premium',
      variant_name: '250g Pack',
      sku: 'BPP-250',
      quantity: 10,
      unit_price: 380,
      tax_rate: 18,
      discount: 500,
      total: 3980,
    },
    {
      id: 3,
      product_name: 'Groundnut Oil',
      variant_name: '5L Can',
      sku: 'GNO-5L',
      quantity: 5,
      unit_price: 650,
      tax_rate: 5,
      discount: 0,
      total: 3412.50,
    },
  ],
  timeline: [
    { date: '2025-12-03T10:30:00', status: 'pending', note: 'Order placed' },
    { date: '2025-12-03T11:15:00', status: 'confirmed', note: 'Order confirmed by admin' },
    { date: '2025-12-04T09:00:00', status: 'processing', note: 'Items being packed' },
  ],
  payments: [
    { id: 1, amount: 5000, method: 'bank_transfer', reference: 'TXN123456', date: '2025-12-03T12:00:00' },
    { id: 2, amount: 5000, method: 'cash', reference: null, date: '2025-12-04T10:00:00' },
  ],
  invoices: [
    { id: 1, invoice_number: 'INV-202512-0089', amount: 17350, status: 'partial', date: '2025-12-03T11:30:00' },
  ],
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusModal, setStatusModal] = useState(false);
  const [paymentModal, setPaymentModal] = useState(false);
  const [form] = Form.useForm();
  const [paymentForm] = Form.useForm();

  useEffect(() => {
    // Simulate API fetch
    setTimeout(() => {
      setOrder(sampleOrder);
      setLoading(false);
    }, 500);
  }, [params.id]);

  const handleStatusUpdate = (values) => {
    setOrder({ ...order, status: values.status });
    setStatusModal(false);
    toast.success('Order status updated');
  };

  const handlePaymentRecord = (values) => {
    const newPayment = {
      id: order.payments.length + 1,
      ...values,
      date: new Date().toISOString(),
    };
    const newPaidAmount = order.paid_amount + values.amount;
    setOrder({
      ...order,
      payments: [...order.payments, newPayment],
      paid_amount: newPaidAmount,
      payment_status: newPaidAmount >= order.total_amount ? 'paid' : 'partial',
    });
    setPaymentModal(false);
    paymentForm.resetFields();
    toast.success('Payment recorded successfully');
  };

  const getCurrentStep = () => {
    if (order.status === 'cancelled') return -1;
    return statusSteps.indexOf(order.status);
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
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      align: 'right',
      render: (price) => `₹${price.toLocaleString()}`,
    },
    {
      title: 'Tax',
      dataIndex: 'tax_rate',
      key: 'tax_rate',
      align: 'center',
      render: (rate) => `${rate}%`,
    },
    {
      title: 'Discount',
      dataIndex: 'discount',
      key: 'discount',
      align: 'right',
      render: (discount) => discount > 0 ? `-₹${discount.toLocaleString()}` : '-',
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      align: 'right',
      render: (total) => <span className="font-medium">₹{total.toLocaleString()}</span>,
    },
  ];

  const paymentColumns = [
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date',
      render: (date) => dayjs(date).format('DD MMM YYYY, hh:mm A'),
    },
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      render: (method) => (
        <Tag>{method.replace('_', ' ').toUpperCase()}</Tag>
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
      render: (amount) => <span className="font-medium text-green-600">₹{amount.toLocaleString()}</span>,
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

  const balanceAmount = order.total_amount - order.paid_amount;

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
              <Tag color={statusColors[order.status]}>{order.status.toUpperCase()}</Tag>
            </h1>
            <p className="page-subtitle">
              Created on {dayjs(order.created_at).format('DD MMM YYYY, hh:mm A')}
            </p>
          </div>
        </div>
        <Space>
          <Button icon={<PrinterOutlined />}>Print</Button>
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
              dataSource={order.items}
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
                      ₹{order.subtotal.toLocaleString()}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">
                      <span className="text-gray-500">Tax (GST)</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      ₹{order.tax_amount.toLocaleString()}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  {order.discount_amount > 0 && (
                    <Table.Summary.Row>
                      <Table.Summary.Cell colSpan={5} align="right">
                        <span className="text-gray-500">Discount</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="right" className="text-red-500">
                        -₹{order.discount_amount.toLocaleString()}
                      </Table.Summary.Cell>
                    </Table.Summary.Row>
                  )}
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">
                      <span className="text-gray-500">Shipping</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      ₹{order.shipping_charge.toLocaleString()}
                    </Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} align="right">
                      <span className="font-bold text-lg">Total</span>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell align="right">
                      <span className="font-bold text-lg">₹{order.total_amount.toLocaleString()}</span>
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
                  onClick={() => setPaymentModal(true)}
                >
                  Record Payment
                </Button>
              )
            }
          >
            {order.payments.length > 0 ? (
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
                        <span className="font-bold text-green-600">₹{order.paid_amount.toLocaleString()}</span>
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

          {/* Order Timeline */}
          <Card title="Order Timeline">
            <Timeline
              items={order.timeline.map((item) => ({
                color: statusColors[item.status] === 'green' ? 'green' : 'blue',
                children: (
                  <div>
                    <div className="flex items-center gap-2">
                      <Tag color={statusColors[item.status]}>{item.status.toUpperCase()}</Tag>
                      <span className="text-gray-500 text-sm">
                        {dayjs(item.date).format('DD MMM YYYY, hh:mm A')}
                      </span>
                    </div>
                    <div className="mt-1">{item.note}</div>
                  </div>
                ),
              }))}
            />
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
              <div className="flex items-center gap-2">
                <PhoneOutlined className="text-gray-400" />
                <a href={`tel:${order.customer_phone}`} className="text-blue-600">
                  {order.customer_phone}
                </a>
              </div>
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
          <Card title="Shipping Address">
            <div className="flex gap-2">
              <EnvironmentOutlined className="text-gray-400 mt-1" />
              <span>{order.shipping_address}</span>
            </div>
          </Card>

          {/* Payment Summary */}
          <Card title="Payment Summary">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Tag color={paymentStatusColors[order.payment_status]}>
                  {order.payment_status.toUpperCase()}
                </Tag>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">Total Amount</span>
                <span className="font-medium">₹{order.total_amount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Paid Amount</span>
                <span className="font-medium text-green-600">₹{order.paid_amount.toLocaleString()}</span>
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
            {order.invoices.length > 0 ? (
              <div className="space-y-2">
                {order.invoices.map((inv) => (
                  <div key={inv.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 font-medium">
                        {inv.invoice_number}
                      </Link>
                      <Tag color={paymentStatusColors[inv.status]}>{inv.status.toUpperCase()}</Tag>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {dayjs(inv.date).format('DD MMM YYYY')} • ₹{inv.amount.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Empty description="No invoices" />
            )}
            <Button type="dashed" block className="mt-3" icon={<FileTextOutlined />}>
              Generate Invoice
            </Button>
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
                { value: 'pending', label: 'Pending' },
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
            name="method"
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
