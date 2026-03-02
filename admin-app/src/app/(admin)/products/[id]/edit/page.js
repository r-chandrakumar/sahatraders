'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card, Button, Form, Input, InputNumber, Switch, Select, Upload, Spin, Space, Table,
  Modal, Dropdown, Tag, Divider
} from 'antd';
import {
  ArrowLeftOutlined, SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, MoreOutlined
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;
const { Option } = Select;

export default function EditProductPage({ params }) {
  const router = useRouter();
  const [form] = Form.useForm();
  const [variantForm] = Form.useForm();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [variants, setVariants] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [productType, setProductType] = useState('inhouse');
  const [variantModal, setVariantModal] = useState({ visible: false, variant: null });

  useEffect(() => {
    fetchProduct();
    fetchCategories();
    fetchSuppliers();
  }, [params.id]);

  const fetchProduct = async () => {
    try {
      const response = await api.get(`/products/${params.id}`);
      const productData = response.data.data;
      setProduct(productData);
      setVariants(productData.variants || []);
      // Load existing images
      const existingImages = (productData.images || []).map((img) => ({
        uid: `existing_${img.id}`,
        name: img.alt_text || 'image',
        status: 'done',
        url: img.url.startsWith('http') ? img.url : `${(process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api').replace(/\/api$/, '')}${img.url}`,
        imageId: img.id,
        imageUrl: img.url,
      }));
      setImageFiles(existingImages);
      setProductType(productData.type || 'inhouse');
      form.setFieldsValue({
        name: productData.name,
        sku: productData.sku,
        description: productData.description,
        category_id: productData.category_id,
        brand: productData.brand,
        type: productData.type,
        supplier_id: productData.supplier_id,
        is_active: productData.is_active,
        seo_title: productData.seo_title,
        seo_description: productData.seo_description,
      });
    } catch (error) {
      toast.error('Failed to load product');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/admin/suppliers');
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch suppliers:', error);
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    try {
      await api.put(`/admin/products/${params.id}`, {
        ...values,
      });

      // Handle images: upload new ones, delete removed ones
      const existingImageIds = imageFiles
        .filter(f => f.imageId)
        .map(f => f.imageId);

      // Delete removed images
      const originalImageIds = (product.images || []).map(img => img.id);
      for (const imgId of originalImageIds) {
        if (!existingImageIds.includes(imgId)) {
          await api.delete(`/admin/products/${params.id}/images/${imgId}`);
        }
      }

      // Upload new images
      const newFiles = imageFiles.filter(f => !f.imageId && f.originFileObj);
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const formData = new FormData();
        formData.append('image', file.originFileObj);
        const uploadRes = await api.post('/admin/upload/image?type=products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await api.post(`/admin/products/${params.id}/images`, {
          url: uploadRes.data.data.url,
          alt_text: values.name || product.name,
          sort_order: existingImageIds.length + i,
        });
      }

      toast.success('Product updated successfully');
      router.push('/products');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update product');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveVariant = async (values) => {
    if (variantModal.variant) {
      // Update existing variant
      setVariants(variants.map(v =>
        v.id === variantModal.variant.id ? { ...v, ...values } : v
      ));
      toast.success('Variant updated');
    } else {
      // Add new variant
      const newVariant = {
        id: `new_${Date.now()}`,
        ...values,
        stock_qty: values.stock_qty || 0,
      };
      setVariants([...variants, newVariant]);
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
        setVariants(variants.filter(v => v.id !== variantId));
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
      render: (qty, record) => (
        <span className={qty <= (record.low_stock_threshold || 10) ? 'text-red-600 font-medium' : ''}>
          {qty || 0}
          {qty <= (record.low_stock_threshold || 10) && <Tag color="red" className="ml-2">Low</Tag>}
        </span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active) => (
        <Tag color={active !== false ? 'green' : 'red'}>{active !== false ? 'Active' : 'Inactive'}</Tag>
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Link href="/products" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-2">
            <ArrowLeftOutlined /> Back to Products
          </Link>
          <h1 className="text-2xl font-bold">Edit Product: {product.name}</h1>
        </div>
        <Space>
          <Button onClick={() => router.push('/products')}>Cancel</Button>
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={() => form.submit()}
            loading={saving}
          >
            Save Changes
          </Button>
        </Space>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <Card title="Product Information">
              <div className="grid sm:grid-cols-2 gap-4">
                <Form.Item
                  name="name"
                  label="Product Name"
                  rules={[{ required: true, message: 'Please enter product name' }]}
                >
                  <Input placeholder="Enter product name" />
                </Form.Item>
                <Form.Item
                  name="sku"
                  label="SKU"
                  rules={[{ required: true, message: 'Please enter SKU' }]}
                >
                  <Input placeholder="Enter SKU" />
                </Form.Item>
              </div>
              <Form.Item name="description" label="Description">
                <TextArea rows={4} placeholder="Enter product description" />
              </Form.Item>
              <div className="grid sm:grid-cols-2 gap-4">
                <Form.Item name="category_id" label="Category">
                  <Select placeholder="Select category">
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="brand" label="Brand">
                  <Input placeholder="Enter brand name" />
                </Form.Item>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <Form.Item name="type" label="Product Type">
                  <Select placeholder="Select type" onChange={(val) => setProductType(val)}>
                    <Option value="inhouse">In-house</Option>
                    <Option value="supplier">Supplier</Option>
                    <Option value="both">Both</Option>
                  </Select>
                </Form.Item>
                <Form.Item name="is_active" label="Status" valuePropName="checked">
                  <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
                </Form.Item>
              </div>
              {(productType === 'supplier' || productType === 'both') && (
                <Form.Item
                  name="supplier_id"
                  label="Supplier"
                  rules={[{ required: productType === 'supplier', message: 'Please select a supplier' }]}
                >
                  <Select placeholder="Select supplier" allowClear showSearch optionFilterProp="children">
                    {suppliers.map(s => (
                      <Option key={s.id} value={s.id}>{s.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              )}
            </Card>

            {/* Variants */}
            <Card
              title="Product Variants"
              extra={
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
              }
            >
              <Table
                dataSource={variants}
                columns={variantColumns}
                rowKey="id"
                pagination={false}
              />
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* SEO */}
            <Card title="SEO Settings">
              <Form.Item name="seo_title" label="SEO Title">
                <Input placeholder="Enter SEO title" />
              </Form.Item>
              <Form.Item name="seo_description" label="SEO Description">
                <TextArea rows={3} placeholder="Enter SEO description" />
              </Form.Item>
            </Card>

            {/* Product Images */}
            <Card title="Product Images">
              <Upload
                listType="picture-card"
                multiple
                fileList={imageFiles}
                beforeUpload={() => false}
                onChange={({ fileList }) => setImageFiles(fileList)}
              >
                {imageFiles.length >= 5 ? null : (
                  <div>
                    <PlusOutlined />
                    <div className="mt-2">Upload</div>
                  </div>
                )}
              </Upload>
              <p className="text-gray-500 text-sm mt-2">
                Max 5 images. JPG, PNG or WebP.
              </p>
            </Card>
          </div>
        </div>
      </Form>

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
            <Form.Item
              name="variant_name"
              label="Variant Name"
              rules={[{ required: true, message: 'Please enter variant name' }]}
            >
              <Input placeholder="e.g., 100g Pack" />
            </Form.Item>
            <Form.Item
              name="sku"
              label="SKU"
              rules={[{ required: true, message: 'Please enter SKU' }]}
            >
              <Input placeholder="e.g., CUM001-100G" />
            </Form.Item>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Form.Item name="weight" label="Weight">
              <InputNumber className="w-full" min={0} placeholder="Weight" />
            </Form.Item>
            <Form.Item name="weight_unit" label="Unit">
              <Select>
                <Option value="g">Grams (g)</Option>
                <Option value="kg">Kilograms (kg)</Option>
                <Option value="ml">Milliliters (ml)</Option>
                <Option value="l">Liters (l)</Option>
                <Option value="pcs">Pieces (pcs)</Option>
              </Select>
            </Form.Item>
            <Form.Item name="low_stock_threshold" label="Low Stock Alert">
              <InputNumber className="w-full" min={0} placeholder="Threshold" />
            </Form.Item>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <Form.Item
              name="buy_price"
              label="Buy Price (₹)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber className="w-full" min={0} precision={2} placeholder="Buy price" />
            </Form.Item>
            <Form.Item
              name="sell_price"
              label="Sell Price (₹)"
              rules={[{ required: true, message: 'Required' }]}
            >
              <InputNumber className="w-full" min={0} precision={2} placeholder="Sell price" />
            </Form.Item>
            <Form.Item name="compare_price" label="Compare Price (₹)">
              <InputNumber className="w-full" min={0} precision={2} placeholder="Compare price" />
            </Form.Item>
          </div>
          {!variantModal.variant && (
            <Form.Item name="stock_qty" label="Initial Stock">
              <InputNumber className="w-full" min={0} placeholder="Initial stock quantity" />
            </Form.Item>
          )}
          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
          </Form.Item>
          <Divider />
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setVariantModal({ visible: false, variant: null })}>
                Cancel
              </Button>
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
