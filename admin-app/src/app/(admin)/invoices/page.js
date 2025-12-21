'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Button, Input, Select, Tag, Card, Space, Modal, Form, InputNumber, DatePicker } from 'antd';
import {
  SearchOutlined,
  EyeOutlined,
  DollarOutlined,
  PrinterOutlined,
  FilterOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusColors = {
  draft: 'default',
  issued: 'blue',
  partial: 'orange',
  paid: 'green',
  overdue: 'red',
  cancelled: 'default',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [paymentModal, setPaymentModal] = useState({ visible: false, invoice: null });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const [form] = Form.useForm();

  // Fetch invoices from API
  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/invoices', {
        params: {
          page: pagination.page,
          limit: pagination.limit,
          ...(filters.status && { status: filters.status }),
        },
      });

      setInvoices(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (values) => {
    const { invoice_id, amount, payment_method, payment_date, reference } = values;

    try {
      setLoading(true);

      // Format payment_date to ISO string
      const formattedDate = payment_date ? dayjs(payment_date).toISOString() : dayjs().toISOString();

      await api.post(`/api/invoices/${invoice_id}/payments`, {
        amount,
        payment_method,
        payment_date: formattedDate,
        reference,
      });

      toast.success('Payment recorded successfully');
      setPaymentModal({ visible: false, invoice: null });
      form.resetFields();

      // Refresh invoices list
      await fetchInvoices();
    } catch (error) {
      console.error('Error recording payment:', error);
      toast.error(error.response?.data?.message || 'Failed to record payment');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_, record) => (
        <div>
          <div className="font-medium text-blue-600">{record.invoice_number}</div>
          <div className="text-sm text-gray-500">Order: {record.order_number}</div>
        </div>
      ),
    },
    {
      title: 'Customer',
      dataIndex: 'customer_name',
      key: 'customer',
    },
    {
      title: 'Date',
      key: 'date',
      render: (_, record) => (
        <div className="text-sm">
          <div>{dayjs(record.invoice_date).format('DD MMM YYYY')}</div>
          <div className="text-gray-500">Due: {dayjs(record.due_date).format('DD MMM')}</div>
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, record) => (
        <div>
          <div className="font-medium">₹{record.total_amount.toLocaleString()}</div>
          {record.paid_amount > 0 && record.paid_amount < record.total_amount && (
            <div className="text-sm text-gray-500">
              Paid: ₹{record.paid_amount.toLocaleString()}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Balance',
      key: 'balance',
      render: (_, record) => {
        const balance = record.total_amount - record.paid_amount;
        return balance > 0 ? (
          <span className="font-medium text-red-600">₹{balance.toLocaleString()}</span>
        ) : (
          <span className="text-green-600">Paid</span>
        );
      },
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
          <Button type="text" icon={<EyeOutlined />} title="View" />
          <Button type="text" icon={<PrinterOutlined />} title="Print" />
          {record.status !== 'paid' && record.status !== 'cancelled' && (
            <Button
              type="text"
              icon={<DollarOutlined />}
              title="Record Payment"
              onClick={() => {
                setPaymentModal({ visible: true, invoice: record });
                form.setFieldsValue({
                  invoice_id: record.id,
                  amount: record.total_amount - record.paid_amount,
                  payment_date: dayjs(),
                });
              }}
            />
          )}
        </Space>
      ),
    },
  ];

  const filteredInvoices = invoices.filter(inv => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!inv.invoice_number.toLowerCase().includes(search) &&
          !inv.customer_name.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filters.status && inv.status !== filters.status) return false;
    return true;
  });

  const totalOutstanding = invoices
    .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + (i.total_amount - i.paid_amount), 0);

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Invoices</h1>
          <p className="page-subtitle">Manage invoices and payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card size="small">
          <div className="text-gray-500 text-sm">Total Invoices</div>
          <div className="text-2xl font-bold">{invoices.length}</div>
        </Card>
        <Card size="small" className="border-red-200 bg-red-50">
          <div className="text-gray-500 text-sm">Outstanding Amount</div>
          <div className="text-2xl font-bold text-red-600">₹{totalOutstanding.toLocaleString()}</div>
        </Card>
        <Card size="small">
          <div className="text-gray-500 text-sm">Paid</div>
          <div className="text-2xl font-bold text-green-600">
            {invoices.filter(i => i.status === 'paid').length}
          </div>
        </Card>
        <Card size="small">
          <div className="text-gray-500 text-sm">Overdue</div>
          <div className="text-2xl font-bold text-orange-600">
            {invoices.filter(i => i.status === 'overdue').length}
          </div>
        </Card>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search invoices..."
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
              { value: 'issued', label: 'Issued' },
              { value: 'partial', label: 'Partial' },
              { value: 'paid', label: 'Paid' },
              { value: 'overdue', label: 'Overdue' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <Table
          dataSource={filteredInvoices}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} invoices`,
          }}
        />
      </Card>

      {/* Payment Modal */}
      <Modal
        title="Record Payment"
        open={paymentModal.visible}
        onCancel={() => {
          setPaymentModal({ visible: false, invoice: null });
          form.resetFields();
        }}
        footer={null}
      >
        {paymentModal.invoice && (
          <Form form={form} layout="vertical" onFinish={handlePayment}>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="font-medium">{paymentModal.invoice.invoice_number}</div>
              <div className="text-sm text-gray-500">{paymentModal.invoice.customer_name}</div>
              <div className="text-lg font-bold text-red-600 mt-2">
                Balance: ₹{(paymentModal.invoice.total_amount - paymentModal.invoice.paid_amount).toLocaleString()}
              </div>
            </div>

            <Form.Item name="invoice_id" hidden>
              <Input />
            </Form.Item>

            <Form.Item
              name="amount"
              label="Payment Amount"
              rules={[{ required: true, message: 'Please enter amount' }]}
            >
              <InputNumber
                className="w-full"
                min={1}
                max={paymentModal.invoice.total_amount - paymentModal.invoice.paid_amount}
                precision={2}
                prefix="₹"
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

            <Form.Item
              name="payment_date"
              label="Payment Date"
              rules={[{ required: true, message: 'Please select date' }]}
            >
              <DatePicker className="w-full" />
            </Form.Item>

            <Form.Item name="reference" label="Reference / Transaction ID">
              <Input placeholder="e.g., TXN123456" />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" block>
                Record Payment
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
