'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Switch,
  Tabs,
  Upload,
  InputNumber,
  Select,
  Divider,
  Space,
  Table,
  Modal,
  Tag,
  Spin,
} from 'antd';
import {
  SaveOutlined,
  UploadOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MailOutlined,
  BellOutlined,
  ShopOutlined,
  DollarOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import api, { uploadImage } from '@/lib/api';

const { TextArea } = Input;

export default function SettingsPage() {
  const [settings, setSettings] = useState({});
  const [taxRates, setTaxRates] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [taxModal, setTaxModal] = useState({ visible: false, editing: null });
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);

  const [generalForm] = Form.useForm();
  const [businessForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [shippingForm] = Form.useForm();
  const [taxForm] = Form.useForm();

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [settingsRes, taxRes, paymentRes] = await Promise.allSettled([
        api.get('/admin/settings'),
        api.get('/admin/settings/tax/rates'),
        api.get('/admin/settings/payment-methods'),
      ]);

      if (settingsRes.status === 'fulfilled') {
        const grouped = settingsRes.value.data;
        // Flatten grouped settings into a single object
        const flat = {};
        Object.values(grouped).forEach(group => {
          if (typeof group === 'object' && group !== null) {
            Object.assign(flat, group);
          }
        });
        setSettings(flat);
        setLogoUrl(flat.store_logo || null);

        // Set form values
        generalForm.setFieldsValue({
          store_name: flat.store_name,
          tagline: flat.tagline,
          contact_email: flat.contact_email,
          contact_phone: flat.contact_phone,
          business_address: flat.business_address,
          gstin: flat.gstin,
        });
        businessForm.setFieldsValue({
          currency: flat.currency || 'INR',
          currency_symbol: flat.currency_symbol || '₹',
          default_tax_rate: parseFloat(flat.default_tax_rate) || 18,
          low_stock_threshold: parseInt(flat.low_stock_threshold) || 10,
          order_prefix: flat.order_prefix || 'SO',
          invoice_prefix: flat.invoice_prefix || 'INV',
          po_prefix: flat.po_prefix || 'PO',
        });
        emailForm.setFieldsValue({
          smtp_host: flat.smtp_host,
          smtp_port: parseInt(flat.smtp_port) || 587,
          smtp_user: flat.smtp_user,
          smtp_pass: flat.smtp_pass,
          email_from_name: flat.email_from_name,
          email_from_address: flat.email_from_address,
        });
        notificationForm.setFieldsValue({
          email_on_new_order: flat.email_on_new_order === true || flat.email_on_new_order === 'true',
          email_on_low_stock: flat.email_on_low_stock === true || flat.email_on_low_stock === 'true',
          notify_customer_order_status: flat.notify_customer_order_status === true || flat.notify_customer_order_status === 'true',
        });
        shippingForm.setFieldsValue({
          free_shipping_threshold: parseFloat(flat.free_shipping_threshold) || 1000,
          default_shipping_charge: parseFloat(flat.default_shipping_charge) || 50,
          express_shipping_charge: parseFloat(flat.express_shipping_charge) || 150,
        });
      }

      if (taxRes.status === 'fulfilled') {
        setTaxRates(taxRes.value.data || []);
      }

      if (paymentRes.status === 'fulfilled') {
        setPaymentMethods(paymentRes.value.data || []);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (values, label) => {
    setSaving(true);
    try {
      await api.put('/admin/settings', { settings: values });
      setSettings(prev => ({ ...prev, ...values }));
      toast.success(`${label} saved`);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.message || `Failed to save ${label.toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (file) => {
    setLogoUploading(true);
    try {
      const res = await uploadImage(file, 'settings');
      const url = res.data?.url || res.url;
      setLogoUrl(url);
      await api.put('/admin/settings', { settings: { store_logo: url } });
      toast.success('Logo uploaded');
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast.error('Failed to upload logo');
    } finally {
      setLogoUploading(false);
    }
    return false; // prevent default upload
  };

  // Tax rate handlers
  const handleSaveTaxRate = async (values) => {
    try {
      if (taxModal.editing) {
        await api.put(`/admin/settings/tax/rates/${taxModal.editing.id}`, values);
        toast.success('Tax rate updated');
      } else {
        await api.post('/admin/settings/tax/rates', values);
        toast.success('Tax rate added');
      }
      setTaxModal({ visible: false, editing: null });
      taxForm.resetFields();
      // Refresh tax rates
      const res = await api.get('/admin/settings/tax/rates');
      setTaxRates(res.data || []);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save tax rate');
    }
  };

  const deleteTaxRate = (id) => {
    Modal.confirm({
      title: 'Delete Tax Rate',
      content: 'Are you sure you want to delete this tax rate?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/settings/tax/rates/${id}`);
          setTaxRates(taxRates.filter(t => t.id !== id));
          toast.success('Tax rate deleted');
        } catch (error) {
          toast.error('Failed to delete tax rate');
        }
      },
    });
  };

  const togglePaymentMethod = async (id) => {
    try {
      await api.put(`/admin/settings/payment-methods/${id}/toggle`);
      setPaymentMethods(paymentMethods.map(p =>
        p.id === id ? { ...p, is_active: !p.is_active } : p
      ));
      toast.success('Payment method updated');
    } catch (error) {
      toast.error('Failed to update payment method');
    }
  };

  const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api').replace(/\/api$/, '');

  const GeneralSettings = () => (
    <Form
      form={generalForm}
      layout="vertical"
      onFinish={(values) => saveSettings(values, 'General settings')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item name="store_name" label="Store Name" rules={[{ required: true }]}>
            <Input placeholder="Your store name" />
          </Form.Item>
          <Form.Item name="tagline" label="Tagline">
            <Input placeholder="Store tagline" />
          </Form.Item>
          <Form.Item name="contact_email" label="Contact Email" rules={[{ type: 'email' }]}>
            <Input prefix={<MailOutlined />} placeholder="contact@example.com" />
          </Form.Item>
          <Form.Item name="contact_phone" label="Phone Number">
            <Input placeholder="+91 98765 43210" />
          </Form.Item>
        </div>
        <div>
          <Form.Item label="Store Logo">
            {logoUrl && (
              <div className="mb-3">
                <img
                  src={logoUrl.startsWith('http') ? logoUrl : `${apiBaseUrl}${logoUrl}`}
                  alt="Logo"
                  style={{ maxHeight: 100, maxWidth: 200, objectFit: 'contain' }}
                />
              </div>
            )}
            <Upload
              name="logo"
              listType="picture-card"
              maxCount={1}
              showUploadList={false}
              beforeUpload={handleLogoUpload}
            >
              <div>
                {logoUploading ? <Spin size="small" /> : <UploadOutlined />}
                <div className="mt-2">{logoUrl ? 'Change Logo' : 'Upload Logo'}</div>
              </div>
            </Upload>
          </Form.Item>
          <Form.Item name="business_address" label="Business Address">
            <TextArea rows={3} placeholder="Full address" />
          </Form.Item>
          <Form.Item name="gstin" label="GSTIN">
            <Input placeholder="GST Number" />
          </Form.Item>
        </div>
      </div>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save General Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const BusinessSettings = () => (
    <Form
      form={businessForm}
      layout="vertical"
      onFinish={(values) => saveSettings(values, 'Business settings')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item name="currency" label="Currency">
            <Select options={[
              { value: 'INR', label: 'Indian Rupee (INR)' },
              { value: 'USD', label: 'US Dollar (USD)' },
            ]} />
          </Form.Item>
          <Form.Item name="currency_symbol" label="Currency Symbol">
            <Input placeholder="₹" style={{ width: 100 }} />
          </Form.Item>
          <Form.Item name="default_tax_rate" label="Default Tax Rate (%)">
            <InputNumber min={0} max={100} style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="low_stock_threshold" label="Low Stock Alert Threshold">
            <InputNumber min={1} style={{ width: 150 }} />
          </Form.Item>
        </div>
        <div>
          <Form.Item name="order_prefix" label="Order Number Prefix">
            <Input placeholder="SO" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="invoice_prefix" label="Invoice Number Prefix">
            <Input placeholder="INV" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item name="po_prefix" label="Purchase Order Prefix">
            <Input placeholder="PO" style={{ width: 150 }} />
          </Form.Item>
        </div>
      </div>

      <Divider />

      <h3 className="text-lg font-medium mb-4">Tax Rates</h3>
      <Button
        type="dashed"
        icon={<PlusOutlined />}
        onClick={() => {
          taxForm.resetFields();
          setTaxModal({ visible: true, editing: null });
        }}
        className="mb-4"
      >
        Add Tax Rate
      </Button>

      <Table
        dataSource={taxRates}
        rowKey="id"
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Rate', dataIndex: 'rate', key: 'rate', render: (rate) => `${rate}%` },
          { title: 'Type', dataIndex: 'type', key: 'type', render: (type) => <Tag>{(type || '').toUpperCase()}</Tag> },
          { title: 'Default', dataIndex: 'is_default', key: 'is_default', render: (v) => v ? <Tag color="blue">DEFAULT</Tag> : null },
          {
            title: 'Actions', key: 'actions',
            render: (_, record) => (
              <Space>
                <Button type="text" icon={<EditOutlined />} onClick={() => {
                  taxForm.setFieldsValue(record);
                  setTaxModal({ visible: true, editing: record });
                }} />
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => deleteTaxRate(record.id)} />
              </Space>
            ),
          },
        ]}
        className="mb-6"
      />

      <Divider />

      <h3 className="text-lg font-medium mb-4">Payment Methods</h3>
      <Table
        dataSource={paymentMethods}
        rowKey="id"
        pagination={false}
        columns={[
          { title: 'Name', dataIndex: 'name', key: 'name' },
          { title: 'Code', dataIndex: 'code', key: 'code' },
          {
            title: 'Enabled', dataIndex: 'is_active', key: 'is_active',
            render: (enabled, record) => (
              <Switch checked={!!enabled} onChange={() => togglePaymentMethod(record.id)} />
            ),
          },
        ]}
      />

      <Form.Item className="mt-6">
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Business Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const EmailSettings = () => (
    <Form
      form={emailForm}
      layout="vertical"
      onFinish={(values) => saveSettings(values, 'Email settings')}
    >
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <p className="text-yellow-700 text-sm">
          Configure your SMTP settings to enable email notifications. For Gmail, use smtp.gmail.com and port 587.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item name="smtp_host" label="SMTP Host">
            <Input placeholder="smtp.gmail.com" />
          </Form.Item>
          <Form.Item name="smtp_port" label="SMTP Port">
            <InputNumber placeholder="587" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="smtp_user" label="SMTP Username">
            <Input placeholder="your@email.com" />
          </Form.Item>
          <Form.Item name="smtp_pass" label="SMTP Password">
            <Input.Password placeholder="Your password or app password" />
          </Form.Item>
        </div>
        <div>
          <Form.Item name="email_from_name" label="From Name">
            <Input placeholder="Sahaa Traders" />
          </Form.Item>
          <Form.Item name="email_from_address" label="From Email Address">
            <Input placeholder="noreply@sahaatraders.com" />
          </Form.Item>
        </div>
      </div>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Email Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const NotificationSettings = () => (
    <Form
      form={notificationForm}
      layout="vertical"
      onFinish={(values) => saveSettings(values, 'Notification settings')}
    >
      <h3 className="text-lg font-medium mb-4">Admin Notifications</h3>
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">New Order Notification</div>
            <div className="text-sm text-gray-500">Receive email when a new order is placed</div>
          </div>
          <Form.Item name="email_on_new_order" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Low Stock Alert</div>
            <div className="text-sm text-gray-500">Receive email when stock falls below threshold</div>
          </div>
          <Form.Item name="email_on_low_stock" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>
      </div>
      <h3 className="text-lg font-medium mb-4">Customer Notifications</h3>
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Order Status Updates</div>
            <div className="text-sm text-gray-500">Send email to customer when order status changes</div>
          </div>
          <Form.Item name="notify_customer_order_status" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>
      </div>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Notification Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const ShippingSettings = () => (
    <Form
      form={shippingForm}
      layout="vertical"
      onFinish={(values) => saveSettings(values, 'Shipping settings')}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item
            name="free_shipping_threshold"
            label="Free Shipping Threshold (₹)"
            help="Orders above this amount get free shipping"
          >
            <InputNumber
              min={0}
              prefix="₹"
              style={{ width: '100%' }}
              formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={(value) => value.replace(/₹\s?|(,*)/g, '')}
            />
          </Form.Item>
          <Form.Item name="default_shipping_charge" label="Standard Shipping Charge (₹)">
            <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="express_shipping_charge" label="Express Shipping Charge (₹)">
            <InputNumber min={0} prefix="₹" style={{ width: '100%' }} />
          </Form.Item>
        </div>
      </div>
      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
          Save Shipping Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems = [
    { key: 'general', label: <span><ShopOutlined /> General</span>, children: <GeneralSettings /> },
    { key: 'business', label: <span><DollarOutlined /> Business</span>, children: <BusinessSettings /> },
    { key: 'email', label: <span><MailOutlined /> Email</span>, children: <EmailSettings /> },
    { key: 'notifications', label: <span><BellOutlined /> Notifications</span>, children: <NotificationSettings /> },
    { key: 'shipping', label: <span><TruckOutlined /> Shipping</span>, children: <ShippingSettings /> },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Configure your store settings</p>
      </div>

      <Card>
        <Tabs items={tabItems} />
      </Card>

      {/* Tax Rate Modal */}
      <Modal
        title={taxModal.editing ? 'Edit Tax Rate' : 'Add Tax Rate'}
        open={taxModal.visible}
        onCancel={() => setTaxModal({ visible: false, editing: null })}
        footer={null}
      >
        <Form form={taxForm} layout="vertical" onFinish={handleSaveTaxRate}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input placeholder="GST 18%" />
          </Form.Item>
          <Form.Item name="rate" label="Rate (%)" rules={[{ required: true }]}>
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="type" label="Type" rules={[{ required: true }]}>
            <Select options={[
              { value: 'inclusive', label: 'Inclusive' },
              { value: 'exclusive', label: 'Exclusive' },
            ]} />
          </Form.Item>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch /> Set as default
          </Form.Item>
          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setTaxModal({ visible: false, editing: null })}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {taxModal.editing ? 'Update' : 'Add'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
