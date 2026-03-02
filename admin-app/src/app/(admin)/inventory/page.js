'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Input, Card, Tag, Modal, Form, InputNumber, Select, Tabs } from 'antd';
import {
  SearchOutlined,
  WarningOutlined,
  PlusOutlined,
  MinusOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;

const reasonColors = {
  purchase_receipt: 'green',
  sale: 'blue',
  adjustment: 'orange',
  return: 'purple',
  damage: 'red',
  initial: 'default',
};

export default function InventoryPage() {
  const [stock, setStock] = useState([]);
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showLowStock, setShowLowStock] = useState(false);
  const [adjustmentModal, setAdjustmentModal] = useState({ visible: false, item: null });
  const [form] = Form.useForm();

  // Fetch stock and movements on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch stock and movements in parallel
      const [stockResponse, movementsResponse] = await Promise.all([
        api.get('/admin/inventory/stock', { params: { limit: 500 } }),
        api.get('/admin/inventory/movements', { params: { limit: 100 } })
      ]);

      setStock(stockResponse.data.data || []);
      setMovements(movementsResponse.data.data || []);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      toast.error('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  };

  const handleAdjustment = async (values) => {
    const { variant_id, new_qty, reason, notes } = values;

    try {
      // Call API to adjust stock
      await api.post('/admin/inventory/adjustments', {
        variant_id,
        new_qty,
        reason,
        notes
      });

      toast.success('Stock adjusted successfully');
      setAdjustmentModal({ visible: false, item: null });
      form.resetFields();

      // Refresh data to get updated stock and movements
      fetchData();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      toast.error(error.response?.data?.error || 'Failed to adjust stock');
    }
  };

  const stockColumns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          <div className="text-sm text-gray-500">{record.variant_name}</div>
        </div>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
      render: (sku) => <code className="text-sm">{sku}</code>,
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category',
      render: (cat) => <Tag>{cat}</Tag>,
    },
    {
      title: 'Stock',
      dataIndex: 'stock_qty',
      key: 'stock',
      render: (qty, record) => {
        const stockQty = parseFloat(qty || 0);
        const threshold = parseFloat(record.low_stock_threshold || 0);
        const isLow = stockQty <= threshold;
        return (
          <div className={isLow ? 'text-red-600' : ''}>
            <span className="font-medium text-lg">{stockQty}</span>
            {isLow && (
              <Tag color="red" className="ml-2">
                <WarningOutlined /> Low
              </Tag>
            )}
          </div>
        );
      },
    },
    {
      title: 'Threshold',
      dataIndex: 'low_stock_threshold',
      key: 'threshold',
    },
    {
      title: 'Value',
      key: 'value',
      render: (_, record) => `₹${(parseFloat(record.stock_qty || 0) * parseFloat(record.buy_price || 0)).toLocaleString()}`,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Button
          size="small"
          onClick={() => {
            setAdjustmentModal({ visible: true, item: record });
            form.setFieldsValue({
              variant_id: record.id,
              current_qty: record.stock_qty,
              new_qty: record.stock_qty,
            });
          }}
        >
          Adjust
        </Button>
      ),
    },
  ];

  const movementColumns = [
    {
      title: 'Date',
      dataIndex: 'created_at',
      key: 'date',
      render: (date) => new Date(date).toLocaleString(),
    },
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          <div className="text-sm text-gray-500">{record.variant_name}</div>
        </div>
      ),
    },
    {
      title: 'SKU',
      dataIndex: 'sku',
      key: 'sku',
    },
    {
      title: 'Change',
      dataIndex: 'change_qty',
      key: 'change',
      render: (qty) => (
        <span className={qty > 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
          {qty > 0 ? '+' : ''}{qty}
        </span>
      ),
    },
    {
      title: 'Reason',
      dataIndex: 'reason',
      key: 'reason',
      render: (reason) => (
        <Tag color={reasonColors[reason]}>{reason.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'By',
      dataIndex: 'created_by_name',
      key: 'created_by',
    },
  ];

  const filteredStock = stock.filter(s => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      if (!s.product_name.toLowerCase().includes(term) &&
          !s.sku.toLowerCase().includes(term)) {
        return false;
      }
    }
    if (showLowStock && parseFloat(s.stock_qty || 0) > parseFloat(s.low_stock_threshold || 0)) {
      return false;
    }
    return true;
  });

  const totalValue = stock.reduce((sum, s) => sum + (parseFloat(s.stock_qty || 0) * parseFloat(s.buy_price || 0)), 0);
  const lowStockCount = stock.filter(s => parseFloat(s.stock_qty || 0) <= parseFloat(s.low_stock_threshold || 0)).length;

  const tabItems = [
    {
      key: 'stock',
      label: 'Stock Overview',
      children: (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Card size="small">
              <div className="text-gray-500 text-sm">Total Items</div>
              <div className="text-2xl font-bold">{stock.length}</div>
            </Card>
            <Card size="small">
              <div className="text-gray-500 text-sm">Total Units</div>
              <div className="text-2xl font-bold">{stock.reduce((s, i) => s + parseFloat(i.stock_qty || 0), 0).toLocaleString()}</div>
            </Card>
            <Card size="small">
              <div className="text-gray-500 text-sm">Total Value</div>
              <div className="text-2xl font-bold">₹{totalValue.toLocaleString()}</div>
            </Card>
            <Card size="small" className={lowStockCount > 0 ? 'border-red-200 bg-red-50' : ''}>
              <div className="text-gray-500 text-sm">Low Stock Items</div>
              <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-red-600' : ''}`}>
                {lowStockCount}
              </div>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search by product or SKU..."
                prefix={<SearchOutlined className="text-gray-400" />}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="sm:w-64"
                allowClear
              />
              <Button
                type={showLowStock ? 'primary' : 'default'}
                danger={showLowStock}
                icon={<WarningOutlined />}
                onClick={() => setShowLowStock(!showLowStock)}
              >
                Low Stock Only ({lowStockCount})
              </Button>
            </div>
          </Card>

          {/* Stock Table */}
          <Card>
            <Table
              dataSource={filteredStock}
              columns={stockColumns}
              rowKey="id"
              loading={loading}
              pagination={{
                pageSize: 20,
                showTotal: (total) => `${total} items`,
              }}
            />
          </Card>
        </>
      ),
    },
    {
      key: 'movements',
      label: (
        <span>
          <HistoryOutlined /> Stock Movements
        </span>
      ),
      children: (
        <Card>
          <Table
            dataSource={movements}
            columns={movementColumns}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 20,
              showTotal: (total) => `${total} movements`,
            }}
          />
        </Card>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Inventory Management</h1>
        <p className="page-subtitle">Track and manage your stock levels</p>
      </div>

      <Tabs items={tabItems} />

      {/* Adjustment Modal */}
      <Modal
        title="Adjust Stock"
        open={adjustmentModal.visible}
        onCancel={() => {
          setAdjustmentModal({ visible: false, item: null });
          form.resetFields();
        }}
        footer={null}
      >
        {adjustmentModal.item && (
          <Form form={form} layout="vertical" onFinish={handleAdjustment}>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="font-medium">{adjustmentModal.item.product_name}</div>
              <div className="text-sm text-gray-500">{adjustmentModal.item.variant_name}</div>
              <div className="text-sm text-gray-500">SKU: {adjustmentModal.item.sku}</div>
            </div>

            <Form.Item name="variant_id" hidden>
              <Input />
            </Form.Item>

            <Form.Item name="current_qty" label="Current Stock">
              <InputNumber disabled className="w-full" />
            </Form.Item>

            <Form.Item
              name="new_qty"
              label="New Stock Quantity"
              rules={[{ required: true, message: 'Please enter new quantity' }]}
            >
              <InputNumber min={0} className="w-full" />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Reason"
              rules={[{ required: true, message: 'Please select a reason' }]}
            >
              <Select
                options={[
                  { value: 'count_correction', label: 'Stock Count Correction' },
                  { value: 'damage', label: 'Damaged Goods' },
                  { value: 'expired', label: 'Expired' },
                  { value: 'lost', label: 'Lost/Theft' },
                  { value: 'found', label: 'Found' },
                  { value: 'other', label: 'Other' },
                ]}
              />
            </Form.Item>

            <Form.Item name="notes" label="Notes">
              <TextArea rows={2} placeholder="Additional notes" />
            </Form.Item>

            <Form.Item className="mb-0">
              <Button type="primary" htmlType="submit" block>
                Update Stock
              </Button>
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
}
