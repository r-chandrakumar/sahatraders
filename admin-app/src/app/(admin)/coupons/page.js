'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  Switch,
  DatePicker,
  Space,
  Tag,
  Statistic,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  GiftOutlined,
  PercentageOutlined,
  DollarOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { RangePicker } = DatePicker;

export default function CouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [form] = Form.useForm();

  // Fetch coupons on mount
  useEffect(() => {
    fetchCoupons();
  }, []);

  const fetchCoupons = async () => {
    setLoading(true);
    try {
      const response = await api.get('/admin/coupons');
      setCoupons(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch coupons');
      console.error('Error fetching coupons:', error);
    } finally {
      setLoading(false);
    }
  };

  const discountType = Form.useWatch('discount_type', form);

  const columns = [
    {
      title: 'Code',
      dataIndex: 'code',
      key: 'code',
      render: (code, record) => (
        <div>
          <div className="flex items-center gap-2">
            <Tag color="blue" className="font-mono font-bold">{code}</Tag>
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                navigator.clipboard.writeText(code);
                toast.success('Copied!');
              }}
            />
          </div>
          <div className="text-xs text-gray-500 mt-1">{record.description}</div>
        </div>
      ),
    },
    {
      title: 'Discount',
      key: 'discount',
      width: 150,
      render: (_, record) => (
        <div className="flex items-center gap-2">
          {record.discount_type === 'percentage' ? (
            <>
              <PercentageOutlined className="text-green-500" />
              <span className="font-semibold">{record.discount_value}% OFF</span>
            </>
          ) : (
            <>
              <DollarOutlined className="text-green-500" />
              <span className="font-semibold">Rs.{record.discount_value} OFF</span>
            </>
          )}
        </div>
      ),
    },
    {
      title: 'Min Order',
      dataIndex: 'min_order_amount',
      key: 'min_order',
      width: 100,
      render: (amount) => amount ? `Rs.${amount}` : '-',
    },
    {
      title: 'Usage',
      key: 'usage',
      width: 120,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.usage_count} used</div>
          <div className="text-xs text-gray-500">
            {record.usage_limit ? `of ${record.usage_limit}` : 'Unlimited'}
          </div>
        </div>
      ),
    },
    {
      title: 'Validity',
      key: 'validity',
      width: 150,
      render: (_, record) => {
        if (!record.start_date && !record.end_date) {
          return <span className="text-gray-500">No Expiry</span>;
        }
        const isExpired = record.end_date && dayjs(record.end_date).isBefore(dayjs());
        const isUpcoming = record.start_date && dayjs(record.start_date).isAfter(dayjs());

        return (
          <div className="text-xs">
            {record.start_date && <div>From: {dayjs(record.start_date).format('DD MMM YY')}</div>}
            {record.end_date && (
              <div className={isExpired ? 'text-red-500' : ''}>
                To: {dayjs(record.end_date).format('DD MMM YY')}
              </div>
            )}
            {isExpired && <Tag color="red" className="mt-1">EXPIRED</Tag>}
            {isUpcoming && <Tag color="orange" className="mt-1">UPCOMING</Tag>}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      width: 100,
      render: (active, record) => {
        const isExpired = record.end_date && dayjs(record.end_date).isBefore(dayjs());
        const isExhausted = record.usage_limit && record.usage_count >= record.usage_limit;

        if (isExpired) return <Tag color="red">EXPIRED</Tag>;
        if (isExhausted) return <Tag color="orange">EXHAUSTED</Tag>;
        return <Tag color={active ? 'green' : 'default'}>{active ? 'ACTIVE' : 'INACTIVE'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          />
          <Popconfirm
            title="Delete this coupon?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleEdit = (coupon) => {
    setEditingCoupon(coupon);
    form.setFieldsValue({
      ...coupon,
      date_range: coupon.start_date && coupon.end_date
        ? [dayjs(coupon.start_date), dayjs(coupon.end_date)]
        : null,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/api/coupons/${id}`);
      setCoupons(coupons.filter(c => c.id !== id));
      toast.success('Coupon deleted');
    } catch (error) {
      toast.error('Failed to delete coupon');
      console.error('Error deleting coupon:', error);
    }
  };

  const handleSave = async (values) => {
    const couponData = {
      ...values,
      start_date: values.date_range?.[0]?.format('YYYY-MM-DD') || null,
      end_date: values.date_range?.[1]?.format('YYYY-MM-DD') || null,
    };
    delete couponData.date_range;

    setLoading(true);
    try {
      if (editingCoupon) {
        // Update existing coupon
        const response = await api.put(`/api/coupons/${editingCoupon.id}`, couponData);
        setCoupons(coupons.map(c =>
          c.id === editingCoupon.id
            ? response.data.data
            : c
        ));
        toast.success('Coupon updated');
      } else {
        // Create new coupon
        const response = await api.post('/admin/coupons', couponData);
        setCoupons([...coupons, response.data.data]);
        toast.success('Coupon created');
      }
      setModalOpen(false);
      setEditingCoupon(null);
      form.resetFields();
    } catch (error) {
      toast.error(editingCoupon ? 'Failed to update coupon' : 'Failed to create coupon');
      console.error('Error saving coupon:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setFieldValue('code', code);
  };

  // Calculate stats
  const activeCoupons = coupons.filter(c => c.is_active &&
    (!c.end_date || dayjs(c.end_date).isAfter(dayjs())) &&
    (!c.usage_limit || c.usage_count < c.usage_limit)
  ).length;
  const totalUsage = coupons.reduce((sum, c) => sum + c.usage_count, 0);

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="page-title">Coupons & Discounts</h1>
        <p className="page-subtitle">Manage promotional coupons and discount codes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <Statistic
            title="Total Coupons"
            value={coupons.length}
            prefix={<GiftOutlined />}
          />
        </Card>
        <Card>
          <Statistic
            title="Active Coupons"
            value={activeCoupons}
            valueStyle={{ color: '#52c41a' }}
          />
        </Card>
        <Card>
          <Statistic
            title="Total Redemptions"
            value={totalUsage}
          />
        </Card>
        <Card>
          <Statistic
            title="Expired/Exhausted"
            value={coupons.length - activeCoupons}
            valueStyle={{ color: '#ff4d4f' }}
          />
        </Card>
      </div>

      {/* Coupons Table */}
      <Card
        title="All Coupons"
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingCoupon(null);
              form.resetFields();
              setModalOpen(true);
            }}
          >
            Create Coupon
          </Button>
        }
      >
        <Table
          dataSource={coupons}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
        />
      </Card>

      {/* Coupon Modal */}
      <Modal
        title={editingCoupon ? 'Edit Coupon' : 'Create Coupon'}
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingCoupon(null);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            discount_type: 'percentage',
            is_active: true,
          }}
        >
          <div className="flex gap-2">
            <Form.Item
              name="code"
              label="Coupon Code"
              rules={[{ required: true }]}
              className="flex-1"
            >
              <Input placeholder="e.g., SUMMER20" className="uppercase" />
            </Form.Item>
            <Form.Item label=" ">
              <Button onClick={generateCode}>Generate</Button>
            </Form.Item>
          </div>

          <Form.Item name="description" label="Description">
            <Input placeholder="Brief description of the coupon" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="discount_type"
              label="Discount Type"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'percentage', label: 'Percentage (%)' },
                  { value: 'fixed', label: 'Fixed Amount (Rs.)' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="discount_value"
              label={discountType === 'percentage' ? 'Discount Percentage' : 'Discount Amount'}
              rules={[{ required: true }]}
            >
              <InputNumber
                min={1}
                max={discountType === 'percentage' ? 100 : undefined}
                className="w-full"
                prefix={discountType === 'percentage' ? '%' : 'Rs.'}
              />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="min_order_amount" label="Minimum Order Amount">
              <InputNumber min={0} className="w-full" prefix="Rs." />
            </Form.Item>

            {discountType === 'percentage' && (
              <Form.Item name="max_discount" label="Maximum Discount">
                <InputNumber min={0} className="w-full" prefix="Rs." />
              </Form.Item>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="usage_limit" label="Total Usage Limit">
              <InputNumber min={1} className="w-full" placeholder="Leave empty for unlimited" />
            </Form.Item>

            <Form.Item name="per_user_limit" label="Per User Limit">
              <InputNumber min={1} className="w-full" placeholder="Leave empty for unlimited" />
            </Form.Item>
          </div>

          <Form.Item name="date_range" label="Validity Period">
            <RangePicker className="w-full" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingCoupon ? 'Update Coupon' : 'Create Coupon'}
            </Button>
          </div>
        </Form>
      </Modal>
    </div>
  );
}
