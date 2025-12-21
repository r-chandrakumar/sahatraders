'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  DatePicker,
  Table,
  Space,
  Divider,
  AutoComplete,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  SendOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [suppliers, setSuppliers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  const [items, setItems] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [productSearch, setProductSearch] = useState('');

  // Fetch suppliers and product variants on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoadingData(true);
        const [suppliersRes, productsRes] = await Promise.all([
          api.get('/admin/suppliers'),
          api.get('/admin/products', { params: { include_variants: true } })
        ]);

        setSuppliers(suppliersRes.data.data || []);

        // Flatten products to get all variants
        const allVariants = [];
        (productsRes.data.data || []).forEach(product => {
          (product.variants || []).forEach(variant => {
            allVariants.push({
              id: variant.id,
              product_id: product.id,
              product_name: product.name,
              variant_name: variant.variant_name || variant.name,
              sku: variant.sku,
              buy_price: variant.buy_price || 0,
            });
          });
        });
        setVariants(allVariants);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast.error('Failed to load suppliers and products');
      } finally {
        setLoadingData(false);
      }
    };

    fetchData();
  }, []);

  const handleSupplierChange = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    setSelectedSupplier(supplier);
  };

  const addItem = (variant) => {
    const existingItem = items.find(i => i.variant_id === variant.id);
    if (existingItem) {
      setItems(items.map(i =>
        i.variant_id === variant.id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([
        ...items,
        {
          key: Date.now(),
          variant_id: variant.id,
          product_name: variant.product_name,
          variant_name: variant.variant_name,
          sku: variant.sku,
          quantity: 1,
          unit_price: variant.buy_price,
        }
      ]);
    }
    setProductSearch('');
  };

  const updateItemQuantity = (key, quantity) => {
    setItems(items.map(i =>
      i.key === key ? { ...i, quantity } : i
    ));
  };

  const updateItemPrice = (key, price) => {
    setItems(items.map(i =>
      i.key === key ? { ...i, unit_price: price } : i
    ));
  };

  const removeItem = (key) => {
    setItems(items.filter(i => i.key !== key));
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (values, status = 'draft') => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      const poData = {
        supplier_id: values.supplier_id,
        expected_date: values.expected_date ? values.expected_date.format('YYYY-MM-DD') : null,
        notes: values.notes || '',
        reference: values.reference || '',
        status: status,
        items: items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
        }))
      };

      await api.post('/admin/purchase-orders', poData);
      toast.success(status === 'draft' ? 'Purchase order saved as draft' : 'Purchase order created successfully');
      router.push('/purchase-orders');
    } catch (error) {
      console.error('Failed to create purchase order:', error);
      toast.error(error.response?.data?.message || 'Failed to create purchase order');
    } finally {
      setLoading(false);
    }
  };

  const productOptions = variants
    .filter(v =>
      v.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
      v.sku.toLowerCase().includes(productSearch.toLowerCase())
    )
    .slice(0, 20)
    .map(v => ({
      value: v.id,
      label: (
        <div className="flex justify-between">
          <span>{v.product_name} - {v.variant_name}</span>
          <span className="text-gray-500">₹{v.buy_price}</span>
        </div>
      ),
      variant: v,
    }));

  const columns = [
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
      title: 'Quantity',
      key: 'quantity',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(val) => updateItemQuantity(record.key, val)}
        />
      ),
    },
    {
      title: 'Unit Price',
      key: 'price',
      width: 150,
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.unit_price}
          prefix="₹"
          onChange={(val) => updateItemPrice(record.key, val)}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 120,
      align: 'right',
      render: (_, record) => (
        <span className="font-medium">
          ₹{(record.quantity * record.unit_price).toLocaleString()}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 60,
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.key)}
        />
      ),
    },
  ];

  const subtotal = calculateSubtotal();

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" tip="Loading..." />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => router.back()}
        />
        <div>
          <h1 className="page-title">New Purchase Order</h1>
          <p className="page-subtitle">Create a purchase order for supplier</p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => handleSubmit(values, 'draft')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Supplier Selection */}
            <Card title="Supplier Details">
              <Form.Item
                name="supplier_id"
                label="Select Supplier"
                rules={[{ required: true, message: 'Please select a supplier' }]}
              >
                <Select
                  placeholder="Choose supplier"
                  showSearch
                  optionFilterProp="children"
                  onChange={handleSupplierChange}
                  filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                  }
                  options={suppliers.map(s => ({
                    value: s.id,
                    label: s.name,
                  }))}
                />
              </Form.Item>

              {selectedSupplier && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-gray-500 text-sm">Phone</div>
                      <div>{selectedSupplier.phone || '-'}</div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Email</div>
                      <div>{selectedSupplier.email || '-'}</div>
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Add Items */}
            <Card title="Order Items">
              <div className="mb-4">
                <AutoComplete
                  style={{ width: '100%' }}
                  placeholder="Search products by name or SKU..."
                  value={productSearch}
                  onChange={setProductSearch}
                  options={productOptions}
                  onSelect={(value, option) => addItem(option.variant)}
                />
              </div>

              {items.length > 0 ? (
                <Table
                  dataSource={items}
                  columns={columns}
                  rowKey="key"
                  pagination={false}
                  summary={() => (
                    <Table.Summary.Row className="bg-gray-50">
                      <Table.Summary.Cell colSpan={3}>
                        <span className="font-bold">Subtotal</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell align="right">
                        <span className="font-bold text-lg">₹{subtotal.toLocaleString()}</span>
                      </Table.Summary.Cell>
                      <Table.Summary.Cell />
                    </Table.Summary.Row>
                  )}
                />
              ) : (
                <div className="text-center py-12 text-gray-400">
                  <PlusOutlined className="text-4xl mb-2" />
                  <div>Search and add products to this order</div>
                </div>
              )}
            </Card>

            {/* Notes */}
            <Card title="Additional Information">
              <Form.Item name="notes" label="Notes / Special Instructions">
                <TextArea
                  rows={4}
                  placeholder="Any special instructions for the supplier..."
                />
              </Form.Item>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Details */}
            <Card title="Order Details">
              <Form.Item name="expected_date" label="Expected Delivery Date">
                <DatePicker
                  className="w-full"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                />
              </Form.Item>

              <Form.Item name="reference" label="Reference Number">
                <Input placeholder="Your internal reference" />
              </Form.Item>
            </Card>

            {/* Summary */}
            <Card title="Order Summary">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Items</span>
                  <span>{items.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Quantity</span>
                  <span>{items.reduce((sum, i) => sum + i.quantity, 0)}</span>
                </div>
                <Divider className="my-3" />
                <div className="flex justify-between">
                  <span className="font-bold">Total Amount</span>
                  <span className="font-bold text-xl">₹{subtotal.toLocaleString()}</span>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <Space direction="vertical" className="w-full">
                <Button
                  block
                  icon={<SaveOutlined />}
                  onClick={() => form.submit()}
                  loading={loading}
                >
                  Save as Draft
                </Button>
                <Button
                  type="primary"
                  block
                  icon={<SendOutlined />}
                  onClick={() => {
                    form.validateFields().then(values => {
                      handleSubmit(values, 'ordered');
                    });
                  }}
                  loading={loading}
                  disabled={items.length === 0}
                >
                  Create & Send to Supplier
                </Button>
              </Space>
            </Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
