'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card, Button, Tag, Table, Descriptions, Space, Modal, Form, Input,
  InputNumber, Switch, Upload, Tabs, Dropdown, Image, message
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  MoreOutlined, UploadOutlined, SaveOutlined
} from '@ant-design/icons';
import toast from 'react-hot-toast';

const { TextArea } = Input;

// Sample product data
const sampleProduct = {
  id: 1,
  sku: 'CUM001',
  name: 'Cumin Seeds',
  slug: 'cumin-seeds',
  description: 'Premium quality cumin seeds sourced from the best farms in Rajasthan. Our cumin seeds are carefully selected for their rich aroma and authentic flavor. Perfect for Indian cooking, these seeds add a distinctive warm, earthy flavor to your dishes.',
  category_id: 1,
  category_name: 'Spices',
  brand: 'Sahaa Premium',
  type: 'inhouse',
  is_active: true,
  default_image: null,
  seo_title: 'Buy Premium Cumin Seeds Online',
  seo_description: 'Order high-quality cumin seeds at best prices',
  created_at: '2025-01-15',
  updated_at: '2025-12-01',
  variants: [
    { id: 1, sku: 'CUM001-100G', variant_name: '100g Pack', buy_price: 25, sell_price: 40, compare_price: 50, stock_qty: 150, low_stock_threshold: 20, weight: 100, weight_unit: 'g', is_active: true },
    { id: 2, sku: 'CUM001-250G', variant_name: '250g Pack', buy_price: 60, sell_price: 95, compare_price: 120, stock_qty: 80, low_stock_threshold: 15, weight: 250, weight_unit: 'g', is_active: true },
    { id: 3, sku: 'CUM001-500G', variant_name: '500g Pack', buy_price: 115, sell_price: 180, compare_price: 230, stock_qty: 5, low_stock_threshold: 10, weight: 500, weight_unit: 'g', is_active: true },
    { id: 4, sku: 'CUM001-1KG', variant_name: '1kg Pack', buy_price: 220, sell_price: 340, compare_price: 420, stock_qty: 0, low_stock_threshold: 5, weight: 1000, weight_unit: 'g', is_active: false },
  ],
  images: [
    { id: 1, url: '/placeholder1.jpg', alt_text: 'Cumin Seeds Pack', sort_order: 0 },
    { id: 2, url: '/placeholder2.jpg', alt_text: 'Cumin Seeds Close-up', sort_order: 1 },
  ],
  stock_movements: [
    { id: 1, variant_name: '250g Pack', change_qty: -10, reason: 'sale', created_at: '2025-12-05T10:30:00' },
    { id: 2, variant_name: '100g Pack', change_qty: 50, reason: 'purchase_receipt', created_at: '2025-12-04T14:00:00' },
    { id: 3, variant_name: '500g Pack', change_qty: -8, reason: 'sale', created_at: '2025-12-03T11:20:00' },
  ]
};

const categories = [
  { value: 1, label: 'Spices' },
  { value: 2, label: 'Oils' },
  { value: 3, label: 'Grains & Pulses' },
  { value: 4, label: 'Dry Fruits' },
];

export default function ProductDetailPage({ params }) {
  const router = useRouter();
  const [product, setProduct] = useState(sampleProduct);
  const [loading, setLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [variantModal, setVariantModal] = useState({ visible: false, variant: null });
  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();

  const handleSaveProduct = async (values) => {
    setLoading(true);
    try {
      setProduct({ ...product, ...values });
      toast.success('Product updated successfully');
      setEditMode(false);
    } catch (error) {
      toast.error('Failed to update product');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveVariant = async (values) => {
    if (variantModal.variant) {
      // Update existing variant
      setProduct({
        ...product,
        variants: product.variants.map(v =>
          v.id === variantModal.variant.id ? { ...v, ...values } : v
        )
      });
      toast.success('Variant updated');
    } else {
      // Add new variant
      const newVariant = {
        id: product.variants.length + 1,
        ...values,
        stock_qty: values.stock_qty || 0,
      };
      setProduct({
        ...product,
        variants: [...product.variants, newVariant]
      });
      toast.success('Variant added');
    }
    setVariantModal({ visible: false, variant: null });
    variantForm.resetFields();
  };

  const handleDeleteVariant = (variantId) => {
    Modal.confirm({
      title: 'Delete Variant',
      content: 'Are you sure you want to delete this variant?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        setProduct({
          ...product,
          variants: product.variants.filter(v => v.id !== variantId)
        });
        toast.success('Variant deleted');
      },
    });
  };

  const variantColumns = [
    {
      title: 'Variant',
      key: 'variant',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.variant_name}</div>
          <div className="text-sm text-gray-500">SKU: {record.sku}</div>
        </div>
      ),
    },
    {
      title: 'Weight',
      key: 'weight',
      render: (_, record) => `${record.weight}${record.weight_unit}`,
    },
    {
      title: 'Buy Price',
      dataIndex: 'buy_price',
      key: 'buy_price',
      render: (price) => `₹${price}`,
    },
    {
      title: 'Sell Price',
      key: 'sell_price',
      render: (_, record) => (
        <div>
          <span className="font-medium">₹{record.sell_price}</span>
          {record.compare_price && (
            <span className="text-gray-400 line-through ml-2">₹{record.compare_price}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'stock_qty',
      key: 'stock',
      render: (qty, record) => (
        <span className={qty <= record.low_stock_threshold ? 'text-red-600 font-medium' : ''}>
          {qty}
          {qty <= record.low_stock_threshold && <Tag color="red" className="ml-2">Low</Tag>}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => {
                  setVariantModal({ visible: true, variant: record });
                  variantForm.setFieldsValue(record);
                },
              },
              { type: 'divider' },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
                onClick: () => handleDeleteVariant(record.id),
              },
            ],
          }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
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
      title: 'Variant',
      dataIndex: 'variant_name',
      key: 'variant',
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
      render: (reason) => <Tag>{reason.replace('_', ' ').toUpperCase()}</Tag>,
    },
  ];

  const tabItems = [
    {
      key: 'variants',
      label: `Variants (${product.variants.length})`,
      children: (
        <div>
          <div className="flex justify-end mb-4">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setVariantModal({ visible: true, variant: null });
                variantForm.resetFields();
              }}
            >
              Add Variant
            </Button>
          </div>
          <Table
            dataSource={product.variants}
            columns={variantColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'images',
      label: `Images (${product.images.length})`,
      children: (
        <div>
          <Upload
            listType="picture-card"
            fileList={product.images.map(img => ({
              uid: img.id,
              name: img.alt_text,
              status: 'done',
              url: img.url,
            }))}
            beforeUpload={() => false}
            onRemove={(file) => {
              setProduct({
                ...product,
                images: product.images.filter(img => img.id !== file.uid)
              });
            }}
          >
            <div>
              <PlusOutlined />
              <div className="mt-2">Upload</div>
            </div>
          </Upload>
        </div>
      ),
    },
    {
      key: 'stock_history',
      label: 'Stock History',
      children: (
        <Table
          dataSource={product.stock_movements}
          columns={movementColumns}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      ),
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Link href="/products" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-2">
            <ArrowLeftOutlined /> Back to Products
          </Link>
          <h1 className="page-title">{product.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Tag>{product.category_name}</Tag>
            <Tag color={product.type === 'inhouse' ? 'blue' : 'purple'}>
              {product.type === 'inhouse' ? 'In-house' : 'Supplier'}
            </Tag>
            <Tag color={product.is_active ? 'green' : 'red'}>
              {product.is_active ? 'Active' : 'Inactive'}
            </Tag>
          </div>
        </div>
        <Space>
          {editMode ? (
            <>
              <Button onClick={() => setEditMode(false)}>Cancel</Button>
              <Button type="primary" icon={<SaveOutlined />} onClick={() => form.submit()} loading={loading}>
                Save Changes
              </Button>
            </>
          ) : (
            <Button type="primary" icon={<EditOutlined />} onClick={() => setEditMode(true)}>
              Edit Product
            </Button>
          )}
        </Space>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card title="Product Information">
            {editMode ? (
              <Form
                form={form}
                layout="vertical"
                initialValues={product}
                onFinish={handleSaveProduct}
              >
                <div className="grid sm:grid-cols-2 gap-4">
                  <Form.Item name="name" label="Product Name" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                  <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
                    <Input />
                  </Form.Item>
                </div>
                <Form.Item name="description" label="Description">
                  <TextArea rows={4} />
                </Form.Item>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Form.Item name="category_id" label="Category">
                    <select className="w-full border rounded px-3 py-2">
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </Form.Item>
                  <Form.Item name="brand" label="Brand">
                    <Input />
                  </Form.Item>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Form.Item name="type" label="Type">
                    <select className="w-full border rounded px-3 py-2">
                      <option value="inhouse">In-house</option>
                      <option value="supplier">Supplier</option>
                      <option value="both">Both</option>
                    </select>
                  </Form.Item>
                  <Form.Item name="is_active" label="Active" valuePropName="checked">
                    <Switch />
                  </Form.Item>
                </div>
              </Form>
            ) : (
              <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
                <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
                <Descriptions.Item label="Category">{product.category_name}</Descriptions.Item>
                <Descriptions.Item label="Brand">{product.brand || '-'}</Descriptions.Item>
                <Descriptions.Item label="Type">{product.type}</Descriptions.Item>
                <Descriptions.Item label="Description" span={2}>{product.description}</Descriptions.Item>
                <Descriptions.Item label="Created">{new Date(product.created_at).toLocaleDateString()}</Descriptions.Item>
                <Descriptions.Item label="Updated">{new Date(product.updated_at).toLocaleDateString()}</Descriptions.Item>
              </Descriptions>
            )}
          </Card>

          {/* Variants, Images, History */}
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Stock Summary */}
          <Card title="Stock Summary">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Variants</span>
                <span className="font-medium">{product.variants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Stock</span>
                <span className="font-medium">
                  {product.variants.reduce((sum, v) => sum + v.stock_qty, 0)} units
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stock Value</span>
                <span className="font-medium">
                  ₹{product.variants.reduce((sum, v) => sum + (v.stock_qty * v.buy_price), 0).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Low Stock Items</span>
                <span className="font-medium text-red-600">
                  {product.variants.filter(v => v.stock_qty <= v.low_stock_threshold).length}
                </span>
              </div>
            </div>
          </Card>

          {/* Price Range */}
          <Card title="Price Range">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Min Price</span>
                <span className="font-medium">
                  ₹{Math.min(...product.variants.map(v => v.sell_price))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Price</span>
                <span className="font-medium">
                  ₹{Math.max(...product.variants.map(v => v.sell_price))}
                </span>
              </div>
            </div>
          </Card>

          {/* SEO */}
          <Card title="SEO Settings">
            {editMode ? (
              <Form form={form} layout="vertical">
                <Form.Item name="seo_title" label="SEO Title">
                  <Input />
                </Form.Item>
                <Form.Item name="seo_description" label="SEO Description">
                  <TextArea rows={2} />
                </Form.Item>
              </Form>
            ) : (
              <div className="space-y-3">
                <div>
                  <div className="text-gray-500 text-sm">SEO Title</div>
                  <div>{product.seo_title || '-'}</div>
                </div>
                <div>
                  <div className="text-gray-500 text-sm">SEO Description</div>
                  <div>{product.seo_description || '-'}</div>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* Variant Modal */}
      <Modal
        title={variantModal.variant ? 'Edit Variant' : 'Add Variant'}
        open={variantModal.visible}
        onCancel={() => {
          setVariantModal({ visible: false, variant: null });
          variantForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={variantForm}
          layout="vertical"
          onFinish={handleSaveVariant}
          initialValues={{ weight_unit: 'g', is_active: true, low_stock_threshold: 10 }}
        >
          <div className="grid sm:grid-cols-2 gap-4">
            <Form.Item name="variant_name" label="Variant Name" rules={[{ required: true }]}>
              <Input placeholder="e.g., 100g Pack" />
            </Form.Item>
            <Form.Item name="sku" label="SKU" rules={[{ required: true }]}>
              <Input placeholder="e.g., CUM001-100G" />
            </Form.Item>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Form.Item name="weight" label="Weight">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
            <Form.Item name="weight_unit" label="Unit">
              <select className="w-full border rounded px-3 py-2">
                <option value="g">Grams (g)</option>
                <option value="kg">Kilograms (kg)</option>
                <option value="ml">Milliliters (ml)</option>
                <option value="l">Liters (l)</option>
                <option value="pcs">Pieces (pcs)</option>
              </select>
            </Form.Item>
            <Form.Item name="low_stock_threshold" label="Low Stock Alert">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Form.Item name="buy_price" label="Buy Price (₹)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} precision={2} />
            </Form.Item>
            <Form.Item name="sell_price" label="Sell Price (₹)" rules={[{ required: true }]}>
              <InputNumber className="w-full" min={0} precision={2} />
            </Form.Item>
            <Form.Item name="compare_price" label="Compare Price (₹)">
              <InputNumber className="w-full" min={0} precision={2} />
            </Form.Item>
          </div>
          {!variantModal.variant && (
            <Form.Item name="stock_qty" label="Initial Stock">
              <InputNumber className="w-full" min={0} />
            </Form.Item>
          )}
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setVariantModal({ visible: false, variant: null })}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {variantModal.variant ? 'Update' : 'Add'} Variant
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
