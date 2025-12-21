'use client';

import { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Breadcrumb, Select, InputNumber, Table, Space, Spin, Empty } from 'antd';
import { HomeOutlined, PlusOutlined, DeleteOutlined, SendOutlined, PhoneOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;
const { Option } = Select;

export default function OrderEnquiryPage() {
  const [form] = Form.useForm();
  const [orderItems, setOrderItems] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);
  const [variants, setVariants] = useState([]);

  // Fetch all products with variants
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/products', { params: { limit: 500, is_active: true } });
      const productsData = response.data.data || [];
      setProducts(productsData);

      // Extract all variants with product info
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
                display_name: `${product.name} - ${variant.variant_name}`,
                image: product.default_image,
              });
            }
          });
        }
      });
      setVariants(allVariants);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    if (!selectedVariant) {
      toast.error('Please select a product');
      return;
    }

    const variant = variants.find(v => v.id === selectedVariant);
    if (!variant) {
      toast.error('Product not found');
      return;
    }

    const existingIndex = orderItems.findIndex(item => item.variant_id === selectedVariant);

    if (existingIndex >= 0) {
      const newItems = [...orderItems];
      newItems[existingIndex].quantity += quantity;
      setOrderItems(newItems);
    } else {
      setOrderItems([...orderItems, { ...variant, quantity }]);
    }

    setSelectedVariant(null);
    setQuantity(1);
    toast.success('Item added to order');
  };

  const removeItem = (variant_id) => {
    setOrderItems(orderItems.filter(item => item.variant_id !== variant_id));
  };

  const updateQuantity = (variant_id, newQty) => {
    const newItems = orderItems.map(item =>
      item.variant_id === variant_id ? { ...item, quantity: newQty } : item
    );
    setOrderItems(newItems);
  };

  const getTotal = () => {
    return orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const handleSubmit = async (values) => {
    if (orderItems.length === 0) {
      toast.error('Please add at least one product to your order');
      return;
    }

    setSubmitting(true);
    try {
      // Prepare items for API
      const items = orderItems.map(item => ({
        variant_id: item.variant_id,
        quantity: item.quantity,
        unit_price: item.price,
      }));

      const enquiryData = {
        name: values.name,
        email: values.email || null,
        phone: values.phone,
        type: 'order',
        message: values.notes || '',
        address: values.address || null,
        items: items,
        estimated_total: getTotal(),
      };

      await api.post('/enquiries', enquiryData);
      toast.success('Order enquiry submitted successfully! We will contact you soon.');
      form.resetFields();
      setOrderItems([]);
    } catch (error) {
      console.error('Submit error:', error);
      const msg = error.response?.data?.message || 'Failed to submit order. Please try again.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
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
      responsive: ['md'],
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price) => `₹${price.toLocaleString()}`,
    },
    {
      title: 'Qty',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty, record) => (
        <InputNumber
          min={1}
          value={qty}
          onChange={(val) => updateQuantity(record.variant_id, val)}
          className="w-20"
        />
      ),
    },
    {
      title: 'Total',
      key: 'total',
      render: (_, record) => `₹${(record.price * record.quantity).toLocaleString()}`,
    },
    {
      title: '',
      key: 'action',
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => removeItem(record.variant_id)}
        />
      ),
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-custom py-4">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Home</> },
              { title: 'Order Enquiry' }
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-gradient text-white py-12">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Place Your Order Enquiry</h1>
          <p className="text-white/90 max-w-2xl mx-auto">
            Add products to your order and submit your enquiry. Our team will contact you
            with the best prices and delivery options.
          </p>
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Order Form */}
          <div className="lg:col-span-2">
            {/* Add Products */}
            <Card title="Add Products" className="mb-6">
              {variants.length === 0 ? (
                <Empty description="No products available" />
              ) : (
                <div className="flex flex-col sm:flex-row gap-4">
                  <Select
                    placeholder="Search and select a product"
                    className="flex-1"
                    value={selectedVariant}
                    onChange={setSelectedVariant}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                      option.children.toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {variants.map(variant => (
                      <Option key={variant.id} value={variant.id}>
                        {variant.display_name} - ₹{variant.price.toLocaleString()}
                      </Option>
                    ))}
                  </Select>
                  <InputNumber
                    min={1}
                    value={quantity}
                    onChange={setQuantity}
                    className="w-24"
                    placeholder="Qty"
                  />
                  <Button type="primary" icon={<PlusOutlined />} onClick={addItem}>
                    Add
                  </Button>
                </div>
              )}
            </Card>

            {/* Order Items */}
            <Card title="Your Order" className="mb-6">
              {orderItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No items added yet. Select products above to add them to your order.
                </div>
              ) : (
                <>
                  <Table
                    dataSource={orderItems}
                    columns={columns}
                    rowKey="variant_id"
                    pagination={false}
                    className="mb-4"
                  />
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right">
                      <span className="text-gray-600">Estimated Total: </span>
                      <span className="text-2xl font-bold text-primary-600">₹{getTotal().toLocaleString()}</span>
                      <p className="text-xs text-gray-500">Final price may vary based on availability</p>
                    </div>
                  </div>
                </>
              )}
            </Card>

            {/* Contact Information */}
            <Card title="Your Information">
              <Form form={form} layout="vertical" onFinish={handleSubmit}>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Form.Item
                    name="name"
                    label="Full Name"
                    rules={[{ required: true, message: 'Please enter your name' }]}
                  >
                    <Input placeholder="Enter your full name" size="large" />
                  </Form.Item>
                  <Form.Item
                    name="phone"
                    label="Phone Number"
                    rules={[
                      { required: true, message: 'Please enter your phone number' },
                      { pattern: /^[6-9]\d{9}$/, message: 'Please enter a valid 10-digit phone number' }
                    ]}
                  >
                    <Input placeholder="Enter your phone number" size="large" maxLength={10} />
                  </Form.Item>
                </div>
                <Form.Item name="email" label="Email (Optional)">
                  <Input placeholder="Enter your email address" size="large" />
                </Form.Item>
                <Form.Item name="address" label="Delivery Address">
                  <TextArea rows={3} placeholder="Enter your delivery address" />
                </Form.Item>
                <Form.Item name="notes" label="Additional Notes">
                  <TextArea rows={3} placeholder="Any special requirements or notes?" />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    htmlType="submit"
                    size="large"
                    icon={<SendOutlined />}
                    loading={submitting}
                    block
                    className="h-12"
                    disabled={orderItems.length === 0}
                  >
                    Submit Order Enquiry
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-24">
              <h3 className="font-semibold text-lg mb-4">Need Help?</h3>
              <p className="text-gray-600 mb-6">
                Our team is available to assist you with your order. Feel free to call us
                for bulk orders, special requirements, or any queries.
              </p>
              <a href="tel:+919876543210">
                <Button icon={<PhoneOutlined />} size="large" block className="mb-4">
                  Call: +91 98765 43210
                </Button>
              </a>
              <div className="border-t pt-4 mt-4">
                <h4 className="font-medium mb-3">Order Process</h4>
                <div className="space-y-3 text-sm text-gray-600">
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">1</span>
                    <span>Submit your enquiry with products</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">2</span>
                    <span>Our team will contact you</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">3</span>
                    <span>Confirm order and payment</span>
                  </div>
                  <div className="flex gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-medium">4</span>
                    <span>Delivery at your doorstep</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
