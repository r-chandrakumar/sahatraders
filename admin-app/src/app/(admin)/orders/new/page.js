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
  Table,
  Space,
  Divider,
  AutoComplete,
  Checkbox,
  Spin,
} from 'antd';
import {
  ArrowLeftOutlined,
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  CheckOutlined,
  UserOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;

export default function NewSalesOrderPage() {
  const router = useRouter();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [productSearch, setProductSearch] = useState('');
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [discount, setDiscount] = useState(0);
  const [shippingCharge, setShippingCharge] = useState(0);

  // Data from API
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loadingData, setLoadingData] = useState(true);

  // Fetch customers and products on mount
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoadingData(true);
    try {
      const [customersRes, productsRes] = await Promise.all([
        api.get('/customer/admin/list', { params: { limit: 500 } }),
        api.get('/admin/products', { params: { limit: 500, is_active: true } }),
      ]);

      setCustomers(customersRes.data.data || []);

      // Flatten products to variants
      const productsData = productsRes.data.data || [];
      const allVariants = [];
      productsData.forEach(product => {
        if (product.variants && product.variants.length > 0) {
          product.variants.forEach(variant => {
            if (variant.is_active) {
              allVariants.push({
                id: variant.id,
                variant_id: variant.id,
                product_id: product.id,
                product_name: product.name,
                variant_name: variant.variant_name,
                sku: variant.sku,
                price: parseFloat(variant.selling_price) || 0,
                cost_price: parseFloat(variant.cost_price) || 0,
                stock: parseInt(variant.stock_quantity) || 0,
                tax: 18, // Default GST
              });
            }
          });
        }
      });
      setProducts(allVariants);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleCustomerSelect = (customerId) => {
    const customer = customers.find(c => c.id === customerId);
    setSelectedCustomer(customer);
    if (customer) {
      form.setFieldsValue({
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_email: customer.email,
        shipping_address: customer.address || '',
      });
    }
  };

  const addItem = (product) => {
    const existingItem = items.find(i => i.variant_id === product.variant_id);
    if (existingItem) {
      setItems(items.map(i =>
        i.variant_id === product.variant_id
          ? { ...i, quantity: i.quantity + 1 }
          : i
      ));
    } else {
      setItems([
        ...items,
        {
          key: Date.now(),
          variant_id: product.variant_id,
          product_name: product.product_name,
          variant_name: product.variant_name,
          sku: product.sku,
          quantity: 1,
          unit_price: product.price,
          stock: product.stock,
          tax_percent: product.tax,
          discount_percent: 0,
        }
      ]);
    }
    setProductSearch('');
  };

  const updateItem = (key, field, value) => {
    setItems(items.map(i =>
      i.key === key ? { ...i, [field]: value } : i
    ));
  };

  const removeItem = (key) => {
    setItems(items.filter(i => i.key !== key));
  };

  const calculateItemTotal = (item) => {
    const subtotal = item.quantity * item.unit_price;
    const discountAmount = subtotal * (item.discount_percent || 0) / 100;
    const afterDiscount = subtotal - discountAmount;
    const tax = afterDiscount * (item.tax_percent / 100);
    return afterDiscount + tax;
  };

  const calculateTotals = () => {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const itemDiscounts = items.reduce((sum, item) => {
      const lineSubtotal = item.quantity * item.unit_price;
      return sum + (lineSubtotal * (item.discount_percent || 0) / 100);
    }, 0);
    const taxableAmount = subtotal - itemDiscounts - discount;
    const tax = items.reduce((sum, item) => {
      const itemSubtotal = item.quantity * item.unit_price;
      const itemDiscount = itemSubtotal * (item.discount_percent || 0) / 100;
      return sum + ((itemSubtotal - itemDiscount) * (item.tax_percent / 100));
    }, 0);
    const total = taxableAmount + tax + shippingCharge;

    return { subtotal, itemDiscounts, discount, tax, shippingCharge, total };
  };

  const handleSubmit = async (values, status = 'pending') => {
    if (items.length === 0) {
      toast.error('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      const orderData = {
        customer_id: selectedCustomer?.id || null,
        customer_name: values.customer_name,
        customer_phone: values.customer_phone,
        customer_email: values.customer_email || null,
        shipping_address: values.shipping_address,
        shipping_city: values.shipping_city || '',
        shipping_state: values.shipping_state || '',
        shipping_pincode: values.shipping_pincode || '',
        notes: values.notes || '',
        source: 'admin',
        items: items.map(item => ({
          variant_id: item.variant_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_percent: item.tax_percent,
          discount_percent: item.discount_percent || 0,
        })),
      };

      await api.post('/admin/sales-orders', orderData);
      toast.success(status === 'confirmed' ? 'Sales order created and confirmed' : 'Sales order created');
      router.push('/orders');
    } catch (error) {
      console.error('Error creating order:', error);
      toast.error(error.response?.data?.message || 'Failed to create order');
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.variant_name.toLowerCase().includes(productSearch.toLowerCase()) ||
    p.sku.toLowerCase().includes(productSearch.toLowerCase())
  );

  const productOptions = filteredProducts.slice(0, 20).map(p => ({
    value: p.variant_id,
    label: (
      <div className="flex justify-between items-center">
        <div>
          <span>{p.product_name} - {p.variant_name}</span>
          <span className="text-xs text-gray-400 ml-2">({p.sku})</span>
        </div>
        <span className="text-gray-500">₹{p.price.toLocaleString()}</span>
      </div>
    ),
    product: p,
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
      title: 'Qty',
      key: 'quantity',
      width: 100,
      render: (_, record) => (
        <InputNumber
          min={1}
          value={record.quantity}
          onChange={(val) => updateItem(record.key, 'quantity', val)}
        />
      ),
    },
    {
      title: 'Price',
      key: 'price',
      width: 120,
      render: (_, record) => (
        <InputNumber
          min={0}
          value={record.unit_price}
          prefix="₹"
          onChange={(val) => updateItem(record.key, 'unit_price', val)}
        />
      ),
    },
    {
      title: 'Tax',
      key: 'tax',
      width: 80,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={100}
          value={record.tax_percent}
          formatter={value => `${value}%`}
          parser={value => value.replace('%', '')}
          onChange={(val) => updateItem(record.key, 'tax_percent', val)}
        />
      ),
    },
    {
      title: 'Disc %',
      key: 'discount',
      width: 80,
      render: (_, record) => (
        <InputNumber
          min={0}
          max={100}
          value={record.discount_percent}
          formatter={value => `${value}%`}
          parser={value => value.replace('%', '')}
          onChange={(val) => updateItem(record.key, 'discount_percent', val)}
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      width: 100,
      align: 'right',
      render: (_, record) => (
        <span className="font-medium">
          ₹{calculateItemTotal(record).toLocaleString()}
        </span>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 50,
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

  const totals = calculateTotals();

  if (loadingData) {
    return (
      <div className="flex items-center justify-center h-96">
        <Spin size="large" />
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
          <h1 className="page-title">New Sales Order</h1>
          <p className="page-subtitle">Create a new customer order</p>
        </div>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => handleSubmit(values, 'pending')}
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Customer Details */}
            <Card title="Customer Details">
              <Checkbox
                checked={isNewCustomer}
                onChange={(e) => {
                  setIsNewCustomer(e.target.checked);
                  setSelectedCustomer(null);
                  form.resetFields(['customer_name', 'customer_phone', 'customer_email', 'shipping_address']);
                }}
                className="mb-4"
              >
                New Customer
              </Checkbox>

              {!isNewCustomer && (
                <Form.Item label="Select Existing Customer" className="mb-4">
                  <Select
                    placeholder="Search customer by name or phone"
                    showSearch
                    filterOption={(input, option) =>
                      option?.searchText?.toLowerCase().includes(input.toLowerCase())
                    }
                    onChange={handleCustomerSelect}
                    allowClear
                    onClear={() => {
                      setSelectedCustomer(null);
                      form.resetFields(['customer_name', 'customer_phone', 'customer_email', 'shipping_address']);
                    }}
                    value={selectedCustomer?.id}
                  >
                    {customers.map(c => (
                      <Select.Option
                        key={c.id}
                        value={c.id}
                        searchText={`${c.name} ${c.phone} ${c.email}`}
                      >
                        <div className="flex justify-between">
                          <span>{c.name}</span>
                          <span className="text-gray-400">{c.phone}</span>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  name="customer_name"
                  label="Customer Name"
                  rules={[{ required: true, message: 'Please enter customer name' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Full name" />
                </Form.Item>
                <Form.Item
                  name="customer_phone"
                  label="Phone Number"
                  rules={[{ required: true, message: 'Please enter phone number' }]}
                >
                  <Input placeholder="Mobile number" />
                </Form.Item>
                <Form.Item name="customer_email" label="Email (Optional)">
                  <Input placeholder="Email address" />
                </Form.Item>
              </div>
              <Form.Item
                name="shipping_address"
                label="Shipping Address"
                rules={[{ required: true, message: 'Please enter shipping address' }]}
              >
                <TextArea rows={2} placeholder="Complete delivery address" />
              </Form.Item>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Form.Item name="shipping_city" label="City">
                  <Input placeholder="City" />
                </Form.Item>
                <Form.Item name="shipping_state" label="State">
                  <Input placeholder="State" />
                </Form.Item>
                <Form.Item name="shipping_pincode" label="Pincode">
                  <Input placeholder="Pincode" />
                </Form.Item>
              </div>
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
                  onSelect={(value, option) => addItem(option.product)}
                >
                  <Input prefix={<SearchOutlined />} size="large" />
                </AutoComplete>
              </div>

              {items.length > 0 ? (
                <Table
                  dataSource={items}
                  columns={columns}
                  rowKey="key"
                  pagination={false}
                  scroll={{ x: 800 }}
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
              <Form.Item name="notes" label="Order Notes">
                <TextArea rows={3} placeholder="Any special instructions or notes..." />
              </Form.Item>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card title="Order Summary">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-500">Subtotal</span>
                  <span>₹{totals.subtotal.toLocaleString()}</span>
                </div>
                {totals.itemDiscounts > 0 && (
                  <div className="flex justify-between text-red-500">
                    <span>Item Discounts</span>
                    <span>-₹{totals.itemDiscounts.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Additional Discount</span>
                  <InputNumber
                    min={0}
                    value={discount}
                    onChange={setDiscount}
                    prefix="₹"
                    style={{ width: 100 }}
                  />
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax (GST)</span>
                  <span>₹{totals.tax.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500">Shipping</span>
                  <InputNumber
                    min={0}
                    value={shippingCharge}
                    onChange={setShippingCharge}
                    prefix="₹"
                    style={{ width: 100 }}
                  />
                </div>
                <Divider className="my-3" />
                <div className="flex justify-between">
                  <span className="font-bold text-lg">Total</span>
                  <span className="font-bold text-xl text-blue-600">
                    ₹{totals.total.toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Payment */}
            <Card title="Payment">
              <Form.Item name="payment_method" label="Payment Method">
                <Select
                  placeholder="Select payment method"
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'bank_transfer', label: 'Bank Transfer' },
                    { value: 'upi', label: 'UPI' },
                    { value: 'cheque', label: 'Cheque' },
                    { value: 'credit', label: 'Credit (Pay Later)' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="payment_reference" label="Reference (Optional)">
                <Input placeholder="Transaction ID / Cheque number" />
              </Form.Item>
            </Card>

            {/* Actions */}
            <Card>
              <Space direction="vertical" className="w-full">
                <Button
                  type="primary"
                  block
                  icon={<CheckOutlined />}
                  onClick={() => {
                    form.validateFields().then(values => {
                      handleSubmit(values, 'confirmed');
                    });
                  }}
                  loading={loading}
                  disabled={items.length === 0}
                >
                  Create Order
                </Button>
              </Space>
            </Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
