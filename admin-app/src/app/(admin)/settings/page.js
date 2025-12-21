'use client';

import { useState } from 'react';
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
  message,
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
  SettingOutlined,
  DollarOutlined,
  TruckOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';

const { TextArea } = Input;

// Sample data
const initialSettings = {
  // General
  storeName: 'Sahaa Traders',
  tagline: 'Quality Groceries Since 1990',
  email: 'contact@sahaatraders.com',
  phone: '+91 98765 43210',
  address: '123 Market Street, Jaipur, Rajasthan - 302001',
  gstin: '08ABCDE1234F1Z5',

  // Business
  currency: 'INR',
  currencySymbol: '₹',
  taxRate: 18,
  lowStockThreshold: 10,
  orderPrefix: 'SO',
  invoicePrefix: 'INV',
  poPrefix: 'PO',

  // Email
  smtpHost: 'smtp.gmail.com',
  smtpPort: 587,
  smtpUser: '',
  smtpPass: '',
  emailFromName: 'Sahaa Traders',
  emailFromAddress: 'noreply@sahaatraders.com',

  // Notifications
  emailOnNewOrder: true,
  emailOnLowStock: true,
  emailOnEnquiry: true,
  notifyAdminNewOrder: true,
  notifyCustomerOrderStatus: true,

  // Shipping
  freeShippingThreshold: 1000,
  defaultShippingCharge: 50,
  expressShippingCharge: 150,
};

const sampleTaxRates = [
  { id: 1, name: 'GST 5%', rate: 5, type: 'inclusive', isDefault: false },
  { id: 2, name: 'GST 12%', rate: 12, type: 'inclusive', isDefault: false },
  { id: 3, name: 'GST 18%', rate: 18, type: 'inclusive', isDefault: true },
  { id: 4, name: 'GST 28%', rate: 28, type: 'inclusive', isDefault: false },
];

const samplePaymentMethods = [
  { id: 1, name: 'Cash', code: 'cash', enabled: true },
  { id: 2, name: 'Bank Transfer', code: 'bank_transfer', enabled: true },
  { id: 3, name: 'UPI', code: 'upi', enabled: true },
  { id: 4, name: 'Cheque', code: 'cheque', enabled: true },
  { id: 5, name: 'Credit (Pay Later)', code: 'credit', enabled: true },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState(initialSettings);
  const [taxRates, setTaxRates] = useState(sampleTaxRates);
  const [paymentMethods, setPaymentMethods] = useState(samplePaymentMethods);
  const [loading, setLoading] = useState(false);
  const [taxModal, setTaxModal] = useState({ visible: false, editing: null });
  const [generalForm] = Form.useForm();
  const [businessForm] = Form.useForm();
  const [emailForm] = Form.useForm();
  const [notificationForm] = Form.useForm();
  const [shippingForm] = Form.useForm();
  const [taxForm] = Form.useForm();

  const handleSaveGeneral = async (values) => {
    setLoading(true);
    setTimeout(() => {
      setSettings({ ...settings, ...values });
      toast.success('General settings saved');
      setLoading(false);
    }, 500);
  };

  const handleSaveBusiness = async (values) => {
    setLoading(true);
    setTimeout(() => {
      setSettings({ ...settings, ...values });
      toast.success('Business settings saved');
      setLoading(false);
    }, 500);
  };

  const handleSaveEmail = async (values) => {
    setLoading(true);
    setTimeout(() => {
      setSettings({ ...settings, ...values });
      toast.success('Email settings saved');
      setLoading(false);
    }, 500);
  };

  const handleSaveNotifications = async (values) => {
    setLoading(true);
    setTimeout(() => {
      setSettings({ ...settings, ...values });
      toast.success('Notification settings saved');
      setLoading(false);
    }, 500);
  };

  const handleSaveShipping = async (values) => {
    setLoading(true);
    setTimeout(() => {
      setSettings({ ...settings, ...values });
      toast.success('Shipping settings saved');
      setLoading(false);
    }, 500);
  };

  const handleSaveTaxRate = (values) => {
    if (taxModal.editing) {
      setTaxRates(taxRates.map(t =>
        t.id === taxModal.editing.id ? { ...t, ...values } : t
      ));
      toast.success('Tax rate updated');
    } else {
      setTaxRates([...taxRates, { id: Date.now(), ...values }]);
      toast.success('Tax rate added');
    }
    setTaxModal({ visible: false, editing: null });
    taxForm.resetFields();
  };

  const deleteTaxRate = (id) => {
    Modal.confirm({
      title: 'Delete Tax Rate',
      content: 'Are you sure you want to delete this tax rate?',
      okText: 'Delete',
      okType: 'danger',
      onOk: () => {
        setTaxRates(taxRates.filter(t => t.id !== id));
        toast.success('Tax rate deleted');
      },
    });
  };

  const togglePaymentMethod = (id) => {
    setPaymentMethods(paymentMethods.map(p =>
      p.id === id ? { ...p, enabled: !p.enabled } : p
    ));
    toast.success('Payment method updated');
  };

  const GeneralSettings = () => (
    <Form
      form={generalForm}
      layout="vertical"
      initialValues={settings}
      onFinish={handleSaveGeneral}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item
            name="storeName"
            label="Store Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="Your store name" />
          </Form.Item>

          <Form.Item name="tagline" label="Tagline">
            <Input placeholder="Store tagline" />
          </Form.Item>

          <Form.Item
            name="email"
            label="Contact Email"
            rules={[{ required: true, type: 'email' }]}
          >
            <Input prefix={<MailOutlined />} placeholder="contact@example.com" />
          </Form.Item>

          <Form.Item
            name="phone"
            label="Phone Number"
            rules={[{ required: true }]}
          >
            <Input placeholder="+91 98765 43210" />
          </Form.Item>
        </div>

        <div>
          <Form.Item name="logo" label="Store Logo">
            <Upload
              name="logo"
              listType="picture-card"
              maxCount={1}
              beforeUpload={() => false}
            >
              <div>
                <UploadOutlined />
                <div className="mt-2">Upload Logo</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            name="address"
            label="Business Address"
            rules={[{ required: true }]}
          >
            <TextArea rows={3} placeholder="Full address" />
          </Form.Item>

          <Form.Item name="gstin" label="GSTIN">
            <Input placeholder="GST Number" />
          </Form.Item>
        </div>
      </div>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
          Save General Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const BusinessSettings = () => (
    <Form
      form={businessForm}
      layout="vertical"
      initialValues={settings}
      onFinish={handleSaveBusiness}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item name="currency" label="Currency">
            <Select
              options={[
                { value: 'INR', label: 'Indian Rupee (INR)' },
                { value: 'USD', label: 'US Dollar (USD)' },
              ]}
            />
          </Form.Item>

          <Form.Item name="currencySymbol" label="Currency Symbol">
            <Input placeholder="₹" style={{ width: 100 }} />
          </Form.Item>

          <Form.Item name="taxRate" label="Default Tax Rate (%)">
            <InputNumber min={0} max={100} style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="lowStockThreshold" label="Low Stock Alert Threshold">
            <InputNumber min={1} style={{ width: 150 }} />
          </Form.Item>
        </div>

        <div>
          <Form.Item name="orderPrefix" label="Order Number Prefix">
            <Input placeholder="SO" style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="invoicePrefix" label="Invoice Number Prefix">
            <Input placeholder="INV" style={{ width: 150 }} />
          </Form.Item>

          <Form.Item name="poPrefix" label="Purchase Order Prefix">
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
          {
            title: 'Rate',
            dataIndex: 'rate',
            key: 'rate',
            render: (rate) => `${rate}%`,
          },
          {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            render: (type) => <Tag>{type.toUpperCase()}</Tag>,
          },
          {
            title: 'Default',
            dataIndex: 'isDefault',
            key: 'isDefault',
            render: (isDefault) => isDefault ? <Tag color="blue">DEFAULT</Tag> : null,
          },
          {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => {
                    taxForm.setFieldsValue(record);
                    setTaxModal({ visible: true, editing: record });
                  }}
                />
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() => deleteTaxRate(record.id)}
                />
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
            title: 'Enabled',
            dataIndex: 'enabled',
            key: 'enabled',
            render: (enabled, record) => (
              <Switch
                checked={enabled}
                onChange={() => togglePaymentMethod(record.id)}
              />
            ),
          },
        ]}
      />

      <Form.Item className="mt-6">
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
          Save Business Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const EmailSettings = () => (
    <Form
      form={emailForm}
      layout="vertical"
      initialValues={settings}
      onFinish={handleSaveEmail}
    >
      <div className="bg-yellow-50 p-4 rounded-lg mb-6">
        <p className="text-yellow-700 text-sm">
          Configure your SMTP settings to enable email notifications. For Gmail, use smtp.gmail.com and port 587.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item name="smtpHost" label="SMTP Host">
            <Input placeholder="smtp.gmail.com" />
          </Form.Item>

          <Form.Item name="smtpPort" label="SMTP Port">
            <InputNumber placeholder="587" style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item name="smtpUser" label="SMTP Username">
            <Input placeholder="your@email.com" />
          </Form.Item>

          <Form.Item name="smtpPass" label="SMTP Password">
            <Input.Password placeholder="Your password or app password" />
          </Form.Item>
        </div>

        <div>
          <Form.Item name="emailFromName" label="From Name">
            <Input placeholder="Sahaa Traders" />
          </Form.Item>

          <Form.Item name="emailFromAddress" label="From Email Address">
            <Input placeholder="noreply@sahaatraders.com" />
          </Form.Item>

          <Form.Item label="Test Email">
            <Space>
              <Input placeholder="test@example.com" style={{ width: 200 }} />
              <Button>Send Test</Button>
            </Space>
          </Form.Item>
        </div>
      </div>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
          Save Email Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const NotificationSettings = () => (
    <Form
      form={notificationForm}
      layout="vertical"
      initialValues={settings}
      onFinish={handleSaveNotifications}
    >
      <h3 className="text-lg font-medium mb-4">Admin Notifications</h3>
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">New Order Notification</div>
            <div className="text-sm text-gray-500">Receive email when a new order is placed</div>
          </div>
          <Form.Item name="emailOnNewOrder" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Low Stock Alert</div>
            <div className="text-sm text-gray-500">Receive email when stock falls below threshold</div>
          </div>
          <Form.Item name="emailOnLowStock" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">New Enquiry Notification</div>
            <div className="text-sm text-gray-500">Receive email when a new enquiry is submitted</div>
          </div>
          <Form.Item name="emailOnEnquiry" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>
      </div>

      <h3 className="text-lg font-medium mb-4">Customer Notifications</h3>
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <div className="font-medium">Order Confirmation</div>
            <div className="text-sm text-gray-500">Send confirmation email when order is placed</div>
          </div>
          <Form.Item name="notifyCustomerOrderStatus" valuePropName="checked" className="mb-0">
            <Switch />
          </Form.Item>
        </div>
      </div>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
          Save Notification Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const ShippingSettings = () => (
    <Form
      form={shippingForm}
      layout="vertical"
      initialValues={settings}
      onFinish={handleSaveShipping}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Form.Item
            name="freeShippingThreshold"
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

          <Form.Item
            name="defaultShippingCharge"
            label="Standard Shipping Charge (₹)"
          >
            <InputNumber
              min={0}
              prefix="₹"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="expressShippingCharge"
            label="Express Shipping Charge (₹)"
          >
            <InputNumber
              min={0}
              prefix="₹"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </div>
      </div>

      <Form.Item>
        <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>
          Save Shipping Settings
        </Button>
      </Form.Item>
    </Form>
  );

  const tabItems = [
    {
      key: 'general',
      label: (
        <span>
          <ShopOutlined />
          General
        </span>
      ),
      children: <GeneralSettings />,
    },
    {
      key: 'business',
      label: (
        <span>
          <DollarOutlined />
          Business
        </span>
      ),
      children: <BusinessSettings />,
    },
    {
      key: 'email',
      label: (
        <span>
          <MailOutlined />
          Email
        </span>
      ),
      children: <EmailSettings />,
    },
    {
      key: 'notifications',
      label: (
        <span>
          <BellOutlined />
          Notifications
        </span>
      ),
      children: <NotificationSettings />,
    },
    {
      key: 'shipping',
      label: (
        <span>
          <TruckOutlined />
          Shipping
        </span>
      ),
      children: <ShippingSettings />,
    },
  ];

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
          <Form.Item
            name="name"
            label="Name"
            rules={[{ required: true }]}
          >
            <Input placeholder="GST 18%" />
          </Form.Item>

          <Form.Item
            name="rate"
            label="Rate (%)"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="type"
            label="Type"
            rules={[{ required: true }]}
          >
            <Select
              options={[
                { value: 'inclusive', label: 'Inclusive' },
                { value: 'exclusive', label: 'Exclusive' },
              ]}
            />
          </Form.Item>

          <Form.Item name="isDefault" valuePropName="checked">
            <Switch /> Set as default
          </Form.Item>

          <Form.Item className="mb-0">
            <Space className="w-full justify-end">
              <Button onClick={() => setTaxModal({ visible: false, editing: null })}>
                Cancel
              </Button>
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
