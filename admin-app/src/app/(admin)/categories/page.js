'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Input, Card, Tag, Modal, Form, Switch, Space, Upload } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { getCategories, createCategory, updateCategory, deleteCategory, uploadImage } from '@/lib/api';

const { TextArea } = Input;
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api').replace(/\/api$/, '');

const getFullUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [imageFiles, setImageFiles] = useState([]);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await getCategories();
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true);

      let categoryId = editingCategory?.id;

      const payload = {
        name: values.name,
        description: values.description,
        sort_order: values.sort_order || 0,
        is_active: values.is_active,
      };

      if (editingCategory) {
        await updateCategory(categoryId, payload);
      } else {
        const res = await createCategory(payload);
        categoryId = res.data.id;
      }

      // Handle images: upload new ones, delete removed ones
      // Find existing images that were removed
      const existingImageIds = (editingCategory?.images || []).map(img => img.id);
      const keptImageIds = imageFiles
        .filter(f => f.imageId)
        .map(f => f.imageId);
      const removedImageIds = existingImageIds.filter(id => !keptImageIds.includes(id));

      // Delete removed images
      for (const imgId of removedImageIds) {
        await api.delete(`/admin/categories/${categoryId}/images/${imgId}`);
      }

      // Upload new images
      const newFiles = imageFiles.filter(f => f.originFileObj);
      for (let i = 0; i < newFiles.length; i++) {
        const file = newFiles[i];
        const uploadRes = await uploadImage(file.originFileObj, 'categories');
        await api.post(`/admin/categories/${categoryId}/images`, {
          url: uploadRes.data.url,
          alt_text: values.name,
          sort_order: keptImageIds.length + i,
        });
      }

      toast.success(editingCategory ? 'Category updated successfully' : 'Category created successfully');
      await fetchCategories();
      setModalVisible(false);
      setEditingCategory(null);
      setImageFiles([]);
      form.resetFields();
    } catch (error) {
      console.error('Error saving category:', error);
      toast.error(error.response?.data?.message || 'Failed to save category');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    const category = categories.find(c => c.id === id);
    if (category?.product_count > 0) {
      toast.error('Cannot delete category with products');
      return;
    }
    Modal.confirm({
      title: 'Delete Category',
      content: 'Are you sure you want to delete this category?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await deleteCategory(id);
          toast.success('Category deleted successfully');
          await fetchCategories();
        } catch (error) {
          console.error('Error deleting category:', error);
          toast.error(error.response?.data?.message || 'Failed to delete category');
        }
      },
    });
  };

  const openEditModal = (category) => {
    setEditingCategory(category);
    form.setFieldsValue({
      ...category,
      sort_order: category.sort_order || 0,
    });
    // Load existing images into fileList
    const existingImages = (category.images || []).map((img) => ({
      uid: `existing_${img.id}`,
      name: img.alt_text || 'image',
      status: 'done',
      url: getFullUrl(img.url),
      imageId: img.id,
    }));
    setImageFiles(existingImages);
    setModalVisible(true);
  };

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      render: (name, record) => {
        const firstImg = record.images?.[0];
        const imgUrl = firstImg ? getFullUrl(firstImg.url) : (record.image_url ? getFullUrl(record.image_url) : null);
        return (
          <div className="flex items-center gap-3">
            {imgUrl ? (
              <img
                src={imgUrl}
                alt={name}
                className="w-10 h-10 rounded object-cover"
                onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
              />
            ) : null}
            <div
              className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0"
              style={{ display: imgUrl ? 'none' : 'flex' }}
            >
              No img
            </div>
            <div>
              <div className="font-medium">{name}</div>
              <div className="text-sm text-gray-500">/{record.slug}</div>
            </div>
          </div>
        );
      },
    },
    {
      title: 'Images',
      key: 'images',
      width: 80,
      render: (_, record) => <Tag>{record.images?.length || 0}</Tag>,
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'Products',
      dataIndex: 'product_count',
      key: 'products',
      render: (count) => <Tag>{count} products</Tag>,
    },
    {
      title: 'Order',
      dataIndex: 'sort_order',
      key: 'sort_order',
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'status',
      render: (active) => (
        <Tag color={active ? 'green' : 'red'}>
          {active ? 'Active' : 'Inactive'}
        </Tag>
      ),
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
            onClick={() => openEditModal(record)}
          />
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Categories</h1>
          <p className="page-subtitle">Organize your products into categories</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingCategory(null);
            setImageFiles([]);
            form.resetFields();
            setModalVisible(true);
          }}
        >
          Add Category
        </Button>
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Search categories..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
          allowClear
        />
      </Card>

      <Card>
        <Table
          dataSource={filteredCategories}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={false}
        />
      </Card>

      {/* Category Modal */}
      <Modal
        title={editingCategory ? 'Edit Category' : 'Add Category'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false);
          setEditingCategory(null);
          setImageFiles([]);
          form.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit} initialValues={{ is_active: true, sort_order: 0 }}>
          <Form.Item
            name="name"
            label="Category Name"
            rules={[{ required: true, message: 'Please enter category name' }]}
          >
            <Input placeholder="Enter category name" />
          </Form.Item>

          <Form.Item name="description" label="Description">
            <TextArea rows={3} placeholder="Enter description" />
          </Form.Item>

          <Form.Item label="Category Images">
            <Upload
              listType="picture-card"
              fileList={imageFiles}
              beforeUpload={() => false}
              onChange={({ fileList }) => setImageFiles(fileList)}
              multiple
            >
              {imageFiles.length >= 5 ? null : (
                <div>
                  <PlusOutlined />
                  <div className="mt-2">Upload</div>
                </div>
              )}
            </Upload>
            <p className="text-gray-500 text-xs mt-1">Max 5 images. Recommended: 800x800px, JPG or PNG.</p>
          </Form.Item>

          <Form.Item name="sort_order" label="Display Order">
            <Input type="number" placeholder="0" />
          </Form.Item>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setModalVisible(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" loading={submitting}>
                {editingCategory ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
