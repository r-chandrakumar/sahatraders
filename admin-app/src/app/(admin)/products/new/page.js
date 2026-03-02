'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Select, Button, Card, Switch, InputNumber, Space, Divider, Upload, message } from 'antd';
import { PlusOutlined, MinusCircleOutlined, UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import Link from 'next/link';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { TextArea } = Input;
const { Option } = Select;

export default function NewProductPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [imageFiles, setImageFiles] = useState([]);
  const [productType, setProductType] = useState('inhouse');
  const router = useRouter();

  useEffect(() => {
    fetchCategories();
    fetchSuppliers();
  }, []);

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
    setLoading(true);
    try {
      // Extract variants from form values
      const { variants, ...productData } = values;

      // Create the product first
      const productResponse = await api.post('/admin/products', {
        sku: productData.sku,
        name: productData.name,
        description: productData.description,
        category_id: productData.category_id,
        brand: productData.brand,
        type: productData.type || 'inhouse',
        supplier_id: productData.supplier_id || null,
        seo_title: productData.seo_title,
        seo_description: productData.seo_description,
      });

      const productId = productResponse.data.data.id;

      // Create each variant
      if (variants && variants.length > 0) {
        for (const variant of variants) {
          await api.post(`/admin/products/${productId}/variants`, {
            sku: variant.sku,
            variant_name: variant.variant_name,
            weight: variant.weight,
            weight_unit: 'g',
            buy_price: variant.buy_price || 0,
            sell_price: variant.sell_price,
            stock_qty: variant.stock_qty || 0,
            low_stock_threshold: 10,
          });
        }
      }

      // Upload images
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        const formData = new FormData();
        formData.append('image', file.originFileObj || file);
        const uploadRes = await api.post('/admin/upload/image?type=products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        await api.post(`/admin/products/${productId}/images`, {
          url: uploadRes.data.data.url,
          alt_text: productData.name,
          sort_order: i,
        });
      }

      toast.success('Product created successfully');
      router.push('/products');
    } catch (error) {
      console.error('Error creating product:', error);
      toast.error(error.response?.data?.message || 'Failed to create product');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link href="/products" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-2">
          <ArrowLeftOutlined /> Back to Products
        </Link>
        <h1 className="page-title">Add New Product</h1>
        <p className="page-subtitle">Create a new product with variants</p>
      </div>

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          type: 'inhouse',
          is_active: true,
          variants: [{ variant_name: '', sku: '', buy_price: 0, sell_price: 0, stock_qty: 0 }]
        }}
      >
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card title="Basic Information">
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
                  <Input placeholder="e.g., CUM001" />
                </Form.Item>
              </div>
              <Form.Item name="description" label="Description">
                <TextArea rows={4} placeholder="Enter product description" />
              </Form.Item>
              <div className="grid sm:grid-cols-2 gap-4">
                <Form.Item
                  name="category_id"
                  label="Category"
                  rules={[{ required: true, message: 'Please select a category' }]}
                >
                  <Select placeholder="Select category">
                    {categories.map(cat => (
                      <Option key={cat.id} value={cat.id}>{cat.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="brand" label="Brand">
                  <Input placeholder="Enter brand name (optional)" />
                </Form.Item>
              </div>
            </Card>

            <Card title="Product Variants">
              <Form.List name="variants">
                {(fields, { add, remove }) => (
                  <>
                    {fields.map(({ key, name, ...restField }, index) => (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg mb-4">
                        <div className="flex justify-between items-center mb-4">
                          <span className="font-medium">Variant {index + 1}</span>
                          {fields.length > 1 && (
                            <Button
                              type="text"
                              danger
                              icon={<MinusCircleOutlined />}
                              onClick={() => remove(name)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          <Form.Item
                            {...restField}
                            name={[name, 'variant_name']}
                            label="Variant Name"
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <Input placeholder="e.g., 100g Pack" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'sku']}
                            label="Variant SKU"
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <Input placeholder="e.g., CUM001-100G" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'weight']}
                            label="Weight (g)"
                          >
                            <InputNumber className="w-full" placeholder="100" />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'buy_price']}
                            label="Buy Price (₹)"
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <InputNumber className="w-full" min={0} precision={2} />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'sell_price']}
                            label="Sell Price (₹)"
                            rules={[{ required: true, message: 'Required' }]}
                          >
                            <InputNumber className="w-full" min={0} precision={2} />
                          </Form.Item>
                          <Form.Item
                            {...restField}
                            name={[name, 'stock_qty']}
                            label="Initial Stock"
                          >
                            <InputNumber className="w-full" min={0} />
                          </Form.Item>
                        </div>
                      </div>
                    ))}
                    <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                      Add Variant
                    </Button>
                  </>
                )}
              </Form.List>
            </Card>

            <Card title="SEO (Optional)">
              <Form.Item name="seo_title" label="SEO Title">
                <Input placeholder="Enter SEO title" />
              </Form.Item>
              <Form.Item name="seo_description" label="SEO Description">
                <TextArea rows={2} placeholder="Enter SEO description" />
              </Form.Item>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card title="Status">
              <Form.Item name="is_active" label="Active" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="type" label="Product Type">
                <Select onChange={(val) => setProductType(val)}>
                  <Option value="inhouse">In-house</Option>
                  <Option value="supplier">Supplier</Option>
                  <Option value="both">Both</Option>
                </Select>
              </Form.Item>
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
                Recommended: 800x800px, JPG or PNG. Max 5 images.
              </p>
            </Card>

            <Card>
              <Space direction="vertical" className="w-full">
                <Button type="primary" htmlType="submit" loading={loading} block size="large">
                  Create Product
                </Button>
                <Link href="/products">
                  <Button block>Cancel</Button>
                </Link>
              </Space>
            </Card>
          </div>
        </div>
      </Form>
    </div>
  );
}
