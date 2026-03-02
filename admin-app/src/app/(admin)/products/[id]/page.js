'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card, Button, Tag, Table, Descriptions, Space, Modal, Form, Input,
  InputNumber, Switch, Upload, Tabs, Dropdown, Spin
} from 'antd';
import {
  ArrowLeftOutlined, EditOutlined, DeleteOutlined, PlusOutlined,
  MoreOutlined, SaveOutlined
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;
const { Option } = require('antd/es/select');

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api').replace(/\/api$/, '');

const getFullUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

export default function ProductDetailPage({ params }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [variantModal, setVariantModal] = useState({ visible: false, variant: null });
  const [variantForm] = Form.useForm();

  useEffect(() => {
    fetchProduct();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${params.id}`);
      setProduct(response.data.data);
    } catch (error) {
      console.error('Failed to fetch product:', error);
      toast.error('Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = () => {
    Modal.confirm({
      title: 'Delete Product',
      content: 'Are you sure you want to delete this product? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/products/${params.id}`);
          toast.success('Product deleted');
          router.push('/products');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete product');
        }
      },
    });
  };

  const handleSaveVariant = async (values) => {
    try {
      if (variantModal.variant) {
        await api.put(`/admin/products/${params.id}/variants/${variantModal.variant.id}`, values);
        toast.success('Variant updated');
      } else {
        await api.post(`/admin/products/${params.id}/variants`, values);
        toast.success('Variant added');
      }
      setVariantModal({ visible: false, variant: null });
      variantForm.resetFields();
      fetchProduct();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save variant');
    }
  };

  const handleDeleteVariant = (variantId) => {
    Modal.confirm({
      title: 'Delete Variant',
      content: 'Are you sure you want to delete this variant?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/products/${params.id}/variants/${variantId}`);
          toast.success('Variant deleted');
          fetchProduct();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete variant');
        }
      },
    });
  };

  const handleImageUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await api.post('/admin/upload/image?type=products', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await api.post(`/admin/products/${params.id}/images`, {
        url: uploadRes.data.data.url,
        alt_text: product.name,
        sort_order: (product.images || []).length,
      });
      toast.success('Image uploaded');
      fetchProduct();
    } catch (error) {
      toast.error('Failed to upload image');
    }
    return false;
  };

  const handleDeleteImage = async (imageId) => {
    try {
      await api.delete(`/admin/products/${params.id}/images/${imageId}`);
      toast.success('Image removed');
      fetchProduct();
    } catch (error) {
      toast.error('Failed to remove image');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-gray-600">Product not found</h2>
        <Link href="/products">
          <Button type="primary" className="mt-4">Back to Products</Button>
        </Link>
      </div>
    );
  }

  const variants = product.variants || [];
  const images = product.images || [];

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
      render: (_, record) => `${record.weight || 0}${record.weight_unit || 'g'}`,
    },
    {
      title: 'Buy Price',
      dataIndex: 'buy_price',
      key: 'buy_price',
      render: (price) => `₹${price || 0}`,
    },
    {
      title: 'Sell Price',
      key: 'sell_price',
      render: (_, record) => (
        <div>
          <span className="font-medium">₹{record.sell_price || 0}</span>
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
      render: (qty, record) => {
        const q = qty || 0;
        const threshold = record.low_stock_threshold || 10;
        return (
          <span className={q <= threshold ? 'text-red-600 font-medium' : ''}>
            {q}
            {q <= threshold && <Tag color="red" className="ml-2">Low</Tag>}
          </span>
        );
      },
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

  const tabItems = [
    {
      key: 'variants',
      label: `Variants (${variants.length})`,
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
            dataSource={variants}
            columns={variantColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'images',
      label: `Images (${images.length})`,
      children: (
        <div>
          <Upload
            listType="picture-card"
            fileList={images.map(img => ({
              uid: String(img.id),
              name: img.alt_text || 'image',
              status: 'done',
              url: getFullUrl(img.url),
            }))}
            beforeUpload={handleImageUpload}
            onRemove={(file) => handleDeleteImage(parseInt(file.uid))}
          >
            <div>
              <PlusOutlined />
              <div className="mt-2">Upload</div>
            </div>
          </Upload>
        </div>
      ),
    },
  ];

  const totalStock = variants.reduce((sum, v) => sum + (v.stock_qty || 0), 0);
  const stockValue = variants.reduce((sum, v) => sum + ((v.stock_qty || 0) * (v.buy_price || 0)), 0);
  const lowStockCount = variants.filter(v => (v.stock_qty || 0) <= (v.low_stock_threshold || 10)).length;
  const sellPrices = variants.map(v => v.sell_price || 0).filter(p => p > 0);
  const minPrice = sellPrices.length > 0 ? Math.min(...sellPrices) : 0;
  const maxPrice = sellPrices.length > 0 ? Math.max(...sellPrices) : 0;

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
            {product.category_name && <Tag>{product.category_name}</Tag>}
            <Tag color={product.type === 'inhouse' ? 'blue' : 'purple'}>
              {product.type === 'inhouse' ? 'In-house' : 'Supplier'}
            </Tag>
            <Tag color={product.is_active ? 'green' : 'red'}>
              {product.is_active ? 'Active' : 'Inactive'}
            </Tag>
          </div>
        </div>
        <Space>
          <Button danger onClick={handleDeleteProduct}>
            Delete
          </Button>
          <Link href={`/products/${params.id}/edit`}>
            <Button type="primary" icon={<EditOutlined />}>
              Edit Product
            </Button>
          </Link>
        </Space>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card title="Product Information">
            <Descriptions column={{ xs: 1, sm: 2 }} bordered size="small">
              <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
              <Descriptions.Item label="Category">{product.category_name || '-'}</Descriptions.Item>
              <Descriptions.Item label="Brand">{product.brand || '-'}</Descriptions.Item>
              <Descriptions.Item label="Type">{product.type}</Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>{product.description || '-'}</Descriptions.Item>
              <Descriptions.Item label="Created">{product.created_at ? new Date(product.created_at).toLocaleDateString() : '-'}</Descriptions.Item>
              <Descriptions.Item label="Updated">{product.updated_at ? new Date(product.updated_at).toLocaleDateString() : '-'}</Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Variants, Images */}
          <Card>
            <Tabs items={tabItems} />
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Product Image Preview */}
          {images.length > 0 && (
            <Card title="Primary Image">
              <img
                src={getFullUrl(images[0].url)}
                alt={product.name}
                className="w-full rounded object-cover"
                style={{ maxHeight: 250 }}
              />
            </Card>
          )}

          {/* Stock Summary */}
          <Card title="Stock Summary">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Variants</span>
                <span className="font-medium">{variants.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Stock</span>
                <span className="font-medium">{totalStock} units</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Stock Value</span>
                <span className="font-medium">₹{stockValue.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Low Stock Items</span>
                <span className="font-medium text-red-600">{lowStockCount}</span>
              </div>
            </div>
          </Card>

          {/* Price Range */}
          <Card title="Price Range">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Min Price</span>
                <span className="font-medium">₹{minPrice}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Max Price</span>
                <span className="font-medium">₹{maxPrice}</span>
              </div>
            </div>
          </Card>

          {/* SEO */}
          <Card title="SEO Settings">
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
              <Input placeholder="g" />
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
