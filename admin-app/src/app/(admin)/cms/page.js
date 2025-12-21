'use client';

import { useState, useEffect } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Tag,
  Tabs,
  Upload,
  message,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  FileTextOutlined,
  PictureOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';

const { TextArea } = Input;

// Sample pages data
const samplePages = [
  {
    id: 1,
    title: 'About Us',
    slug: 'about-us',
    content: '<h2>About Sahaa Traders</h2><p>Established in 2010, Sahaa Traders has been your trusted source for premium quality spices and groceries...</p>',
    meta_title: 'About Us - Sahaa Traders',
    meta_description: 'Learn about Sahaa Traders, your trusted partner for quality spices and groceries.',
    status: 'published',
    created_at: '2025-01-15T10:00:00',
    updated_at: '2025-12-01T14:30:00',
  },
  {
    id: 2,
    title: 'Contact Us',
    slug: 'contact-us',
    content: '<h2>Get in Touch</h2><p>We would love to hear from you. Reach out to us for any queries or feedback.</p>',
    meta_title: 'Contact Us - Sahaa Traders',
    meta_description: 'Contact Sahaa Traders for enquiries, feedback, or support.',
    status: 'published',
    created_at: '2025-01-15T10:00:00',
    updated_at: '2025-11-20T09:15:00',
  },
  {
    id: 3,
    title: 'Privacy Policy',
    slug: 'privacy-policy',
    content: '<h2>Privacy Policy</h2><p>Your privacy is important to us. This policy outlines how we collect and use your information...</p>',
    meta_title: 'Privacy Policy - Sahaa Traders',
    meta_description: 'Read our privacy policy to understand how we protect your data.',
    status: 'published',
    created_at: '2025-01-15T10:00:00',
    updated_at: '2025-10-05T11:45:00',
  },
  {
    id: 4,
    title: 'Terms & Conditions',
    slug: 'terms-conditions',
    content: '<h2>Terms & Conditions</h2><p>Please read these terms carefully before using our services...</p>',
    meta_title: 'Terms & Conditions - Sahaa Traders',
    meta_description: 'Terms and conditions for using Sahaa Traders services.',
    status: 'published',
    created_at: '2025-01-15T10:00:00',
    updated_at: '2025-10-05T11:45:00',
  },
  {
    id: 5,
    title: 'Shipping Information',
    slug: 'shipping',
    content: '<h2>Shipping Information</h2><p>We deliver across India with various shipping options...</p>',
    meta_title: 'Shipping - Sahaa Traders',
    meta_description: 'Learn about our shipping options and delivery times.',
    status: 'draft',
    created_at: '2025-12-01T10:00:00',
    updated_at: '2025-12-01T10:00:00',
  },
];

// Sample banners data
const sampleBanners = [
  {
    id: 1,
    title: 'Diwali Sale',
    subtitle: 'Up to 30% off on all spices',
    image: '/banners/diwali-sale.jpg',
    link: '/products?category=spices',
    position: 'home_hero',
    sort_order: 1,
    is_active: true,
    start_date: '2025-10-15',
    end_date: '2025-11-15',
  },
  {
    id: 2,
    title: 'Premium Quality',
    subtitle: 'Fresh from farm to your kitchen',
    image: '/banners/quality.jpg',
    link: '/about-us',
    position: 'home_hero',
    sort_order: 2,
    is_active: true,
    start_date: null,
    end_date: null,
  },
  {
    id: 3,
    title: 'Free Shipping',
    subtitle: 'On orders above Rs. 500',
    image: '/banners/free-shipping.jpg',
    link: '/products',
    position: 'home_promo',
    sort_order: 1,
    is_active: true,
    start_date: null,
    end_date: null,
  },
];

export default function CMSPage() {
  const [pages, setPages] = useState(samplePages);
  const [banners, setBanners] = useState(sampleBanners);
  const [loading, setLoading] = useState(false);
  const [pageModalOpen, setPageModalOpen] = useState(false);
  const [bannerModalOpen, setBannerModalOpen] = useState(false);
  const [editingPage, setEditingPage] = useState(null);
  const [editingBanner, setEditingBanner] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState(null);
  const [pageForm] = Form.useForm();
  const [bannerForm] = Form.useForm();

  const pageColumns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title, record) => (
        <div>
          <div className="font-medium">{title}</div>
          <div className="text-xs text-gray-500">/{record.slug}</div>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status) => (
        <Tag color={status === 'published' ? 'green' : 'orange'}>
          {status.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Last Updated',
      dataIndex: 'updated_at',
      key: 'updated_at',
      width: 150,
      render: (date) => dayjs(date).format('DD MMM YYYY'),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewPage(record)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => handleEditPage(record)}
          />
          <Popconfirm
            title="Delete this page?"
            onConfirm={() => handleDeletePage(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const bannerColumns = [
    {
      title: 'Banner',
      key: 'banner',
      render: (_, record) => (
        <div className="flex items-center gap-3">
          <div className="w-24 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
            {record.image ? (
              <img src={record.image} alt={record.title} className="w-full h-full object-cover" />
            ) : (
              <PictureOutlined className="text-gray-400 text-xl" />
            )}
          </div>
          <div>
            <div className="font-medium">{record.title}</div>
            <div className="text-xs text-gray-500">{record.subtitle}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Position',
      dataIndex: 'position',
      key: 'position',
      width: 120,
      render: (position) => (
        <Tag>{position.replace('_', ' ').toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      render: (active) => (
        <Tag color={active ? 'green' : 'default'}>
          {active ? 'ACTIVE' : 'INACTIVE'}
        </Tag>
      ),
    },
    {
      title: 'Schedule',
      key: 'schedule',
      width: 150,
      render: (_, record) => (
        record.start_date || record.end_date ? (
          <div className="text-xs text-gray-500">
            {record.start_date && <div>From: {dayjs(record.start_date).format('DD MMM')}</div>}
            {record.end_date && <div>To: {dayjs(record.end_date).format('DD MMM')}</div>}
          </div>
        ) : (
          <span className="text-gray-400">Always</span>
        )
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
            onClick={() => handleEditBanner(record)}
          />
          <Popconfirm
            title="Delete this banner?"
            onConfirm={() => handleDeleteBanner(record.id)}
          >
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const handleEditPage = (page) => {
    setEditingPage(page);
    pageForm.setFieldsValue(page);
    setPageModalOpen(true);
  };

  const handlePreviewPage = (page) => {
    setPreviewContent(page);
    setPreviewModalOpen(true);
  };

  const handleDeletePage = (id) => {
    setPages(pages.filter(p => p.id !== id));
    toast.success('Page deleted');
  };

  const handleSavePage = async (values) => {
    if (editingPage) {
      setPages(pages.map(p =>
        p.id === editingPage.id
          ? { ...p, ...values, updated_at: new Date().toISOString() }
          : p
      ));
      toast.success('Page updated');
    } else {
      const newPage = {
        id: Math.max(...pages.map(p => p.id)) + 1,
        ...values,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setPages([...pages, newPage]);
      toast.success('Page created');
    }
    setPageModalOpen(false);
    setEditingPage(null);
    pageForm.resetFields();
  };

  const handleEditBanner = (banner) => {
    setEditingBanner(banner);
    bannerForm.setFieldsValue(banner);
    setBannerModalOpen(true);
  };

  const handleDeleteBanner = (id) => {
    setBanners(banners.filter(b => b.id !== id));
    toast.success('Banner deleted');
  };

  const handleSaveBanner = async (values) => {
    if (editingBanner) {
      setBanners(banners.map(b =>
        b.id === editingBanner.id ? { ...b, ...values } : b
      ));
      toast.success('Banner updated');
    } else {
      const newBanner = {
        id: Math.max(...banners.map(b => b.id)) + 1,
        ...values,
      };
      setBanners([...banners, newBanner]);
      toast.success('Banner created');
    }
    setBannerModalOpen(false);
    setEditingBanner(null);
    bannerForm.resetFields();
  };

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const tabItems = [
    {
      key: 'pages',
      label: (
        <span>
          <FileTextOutlined /> Pages
        </span>
      ),
      children: (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium">Static Pages</h3>
              <p className="text-sm text-gray-500">Manage website pages like About Us, Contact, etc.</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingPage(null);
                pageForm.resetFields();
                setPageModalOpen(true);
              }}
            >
              Add Page
            </Button>
          </div>
          <Table
            dataSource={pages}
            columns={pageColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: 'banners',
      label: (
        <span>
          <PictureOutlined /> Banners
        </span>
      ),
      children: (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-medium">Promotional Banners</h3>
              <p className="text-sm text-gray-500">Manage homepage and promotional banners</p>
            </div>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => {
                setEditingBanner(null);
                bannerForm.resetFields();
                setBannerModalOpen(true);
              }}
            >
              Add Banner
            </Button>
          </div>
          <Table
            dataSource={banners}
            columns={bannerColumns}
            rowKey="id"
            pagination={false}
          />
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="page-title">Content Management</h1>
        <p className="page-subtitle">Manage website pages, banners, and content</p>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Page Modal */}
      <Modal
        title={editingPage ? 'Edit Page' : 'Create Page'}
        open={pageModalOpen}
        onCancel={() => {
          setPageModalOpen(false);
          setEditingPage(null);
          pageForm.resetFields();
        }}
        footer={null}
        width={800}
      >
        <Form
          form={pageForm}
          layout="vertical"
          onFinish={handleSavePage}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="title"
              label="Page Title"
              rules={[{ required: true }]}
            >
              <Input
                placeholder="e.g., About Us"
                onChange={(e) => {
                  if (!editingPage) {
                    pageForm.setFieldValue('slug', generateSlug(e.target.value));
                  }
                }}
              />
            </Form.Item>

            <Form.Item
              name="slug"
              label="URL Slug"
              rules={[{ required: true }]}
            >
              <Input placeholder="e.g., about-us" addonBefore="/" />
            </Form.Item>
          </div>

          <Form.Item
            name="content"
            label="Page Content (HTML)"
            rules={[{ required: true }]}
          >
            <TextArea rows={10} placeholder="Enter HTML content..." />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="meta_title" label="Meta Title (SEO)">
              <Input placeholder="Page title for search engines" />
            </Form.Item>

            <Form.Item
              name="status"
              label="Status"
              initialValue="draft"
            >
              <Select
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'published', label: 'Published' },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item name="meta_description" label="Meta Description (SEO)">
            <TextArea rows={2} placeholder="Brief description for search engines" />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setPageModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingPage ? 'Update Page' : 'Create Page'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Banner Modal */}
      <Modal
        title={editingBanner ? 'Edit Banner' : 'Create Banner'}
        open={bannerModalOpen}
        onCancel={() => {
          setBannerModalOpen(false);
          setEditingBanner(null);
          bannerForm.resetFields();
        }}
        footer={null}
        width={600}
      >
        <Form
          form={bannerForm}
          layout="vertical"
          onFinish={handleSaveBanner}
          initialValues={{ is_active: true, sort_order: 1 }}
        >
          <Form.Item
            name="title"
            label="Banner Title"
            rules={[{ required: true }]}
          >
            <Input placeholder="e.g., Summer Sale" />
          </Form.Item>

          <Form.Item name="subtitle" label="Subtitle">
            <Input placeholder="e.g., Up to 50% off" />
          </Form.Item>

          <Form.Item name="image" label="Image URL">
            <Input placeholder="/banners/banner-image.jpg" />
          </Form.Item>

          <Form.Item name="link" label="Link URL">
            <Input placeholder="/products?category=spices" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              name="position"
              label="Position"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'home_hero', label: 'Home Hero Slider' },
                  { value: 'home_promo', label: 'Home Promo Section' },
                  { value: 'category_top', label: 'Category Page Top' },
                  { value: 'sidebar', label: 'Sidebar' },
                ]}
              />
            </Form.Item>

            <Form.Item name="sort_order" label="Sort Order">
              <Input type="number" min={1} />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="start_date" label="Start Date (Optional)">
              <Input type="date" />
            </Form.Item>

            <Form.Item name="end_date" label="End Date (Optional)">
              <Input type="date" />
            </Form.Item>
          </div>

          <Form.Item name="is_active" label="Active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <div className="flex justify-end gap-2">
            <Button onClick={() => setBannerModalOpen(false)}>Cancel</Button>
            <Button type="primary" htmlType="submit">
              {editingBanner ? 'Update Banner' : 'Create Banner'}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Preview Modal */}
      <Modal
        title={`Preview: ${previewContent?.title}`}
        open={previewModalOpen}
        onCancel={() => {
          setPreviewModalOpen(false);
          setPreviewContent(null);
        }}
        footer={null}
        width={800}
      >
        {previewContent && (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ __html: previewContent.content }} />
          </div>
        )}
      </Modal>
    </div>
  );
}
