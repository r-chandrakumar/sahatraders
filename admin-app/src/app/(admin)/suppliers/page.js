'use client';

import { useState, useEffect } from 'react';
import { Table, Button, Input, Card, Tag, Modal, Form, Space, Drawer, Spin, Tabs, Statistic, Row, Col, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, EyeOutlined, PhoneOutlined, MailOutlined, ShoppingCartOutlined, DollarOutlined, CalendarOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { TextArea } = Input;

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [viewingSupplier, setViewingSupplier] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [form] = Form.useForm();

  // Fetch suppliers on mount
  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/suppliers');
      setSuppliers(response.data.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      toast.error('Failed to load suppliers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values) => {
    try {
      setLoading(true);
      if (editingSupplier) {
        // Update existing supplier
        await api.put(`/suppliers/${editingSupplier.id}`, values);
        toast.success('Supplier updated');
      } else {
        // Create new supplier
        await api.post('/admin/suppliers', values);
        toast.success('Supplier created');
      }
      // Refresh the suppliers list
      await fetchSuppliers();
      setDrawerVisible(false);
      setEditingSupplier(null);
      form.resetFields();
    } catch (error) {
      console.error('Error saving supplier:', error);
      toast.error(editingSupplier ? 'Failed to update supplier' : 'Failed to create supplier');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Supplier',
      content: 'Are you sure you want to delete this supplier?',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          setLoading(true);
          await api.delete(`/suppliers/${id}`);
          toast.success('Supplier deleted');
          // Refresh the suppliers list
          await fetchSuppliers();
        } catch (error) {
          console.error('Error deleting supplier:', error);
          toast.error('Failed to delete supplier');
        } finally {
          setLoading(false);
        }
      },
    });
  };

  const openEditDrawer = (supplier) => {
    setEditingSupplier(supplier);
    form.setFieldsValue(supplier);
    setDrawerVisible(true);
  };

  const fetchSupplierDetails = async (id) => {
    setViewLoading(true);
    setViewingSupplier({ id }); // Set initial state to show modal
    try {
      const response = await api.get(`/admin/suppliers/${id}`);
      setViewingSupplier(response.data.data);
    } catch (error) {
      console.error('Error fetching supplier details:', error);
      toast.error('Failed to load supplier details');
      setViewingSupplier(null);
    } finally {
      setViewLoading(false);
    }
  };

  const columns = [
    {
      title: 'Supplier',
      key: 'supplier',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.name}</div>
          <div className="text-sm text-gray-500">{record.contact_person}</div>
        </div>
      ),
    },
    {
      title: 'Contact',
      key: 'contact',
      render: (_, record) => (
        <div className="text-sm">
          <div className="flex items-center gap-1">
            <PhoneOutlined className="text-gray-400" /> {record.phone}
          </div>
          <div className="flex items-center gap-1">
            <MailOutlined className="text-gray-400" /> {record.email}
          </div>
        </div>
      ),
    },
    {
      title: 'Location',
      key: 'location',
      render: (_, record) => `${record.city}, ${record.state}`,
    },
    {
      title: 'GST',
      dataIndex: 'gst_number',
      key: 'gst',
      render: (gst) => <code className="text-xs">{gst}</code>,
    },
    {
      title: 'Terms',
      dataIndex: 'payment_terms',
      key: 'terms',
      render: (terms) => <Tag>{terms}</Tag>,
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
      width: 140,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EyeOutlined />}
            onClick={() => fetchSupplierDetails(record.id)}
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            onClick={() => openEditDrawer(record)}
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

  const filteredSuppliers = suppliers.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.contact_person.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="page-subtitle">Manage your product suppliers</p>
        </div>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingSupplier(null);
            form.resetFields();
            setDrawerVisible(true);
          }}
        >
          Add Supplier
        </Button>
      </div>

      <Card className="mb-6">
        <Input
          placeholder="Search suppliers..."
          prefix={<SearchOutlined className="text-gray-400" />}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
          allowClear
        />
      </Card>

      <Card>
        <Table
          dataSource={filteredSuppliers}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} suppliers`,
          }}
        />
      </Card>

      {/* Supplier Form Drawer */}
      <Drawer
        title={editingSupplier ? 'Edit Supplier' : 'Add Supplier'}
        open={drawerVisible}
        onClose={() => {
          setDrawerVisible(false);
          setEditingSupplier(null);
          form.resetFields();
        }}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            name="name"
            label="Company Name"
            rules={[{ required: true, message: 'Please enter company name' }]}
          >
            <Input placeholder="Enter company name" />
          </Form.Item>

          <Form.Item
            name="contact_person"
            label="Contact Person"
            rules={[{ required: true, message: 'Please enter contact person' }]}
          >
            <Input placeholder="Enter contact person name" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
              <Input placeholder="Phone number" />
            </Form.Item>
            <Form.Item name="email" label="Email">
              <Input placeholder="Email address" />
            </Form.Item>
          </div>

          <Form.Item name="address" label="Address">
            <TextArea rows={2} placeholder="Street address" />
          </Form.Item>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item name="city" label="City">
              <Input placeholder="City" />
            </Form.Item>
            <Form.Item name="state" label="State">
              <Input placeholder="State" />
            </Form.Item>
            <Form.Item name="pincode" label="Pincode">
              <Input placeholder="Pincode" />
            </Form.Item>
          </div>

          <Form.Item name="gst_number" label="GST Number">
            <Input placeholder="e.g., 08AABCU9603R1ZM" />
          </Form.Item>

          <Form.Item name="payment_terms" label="Payment Terms">
            <Input placeholder="e.g., Net 30" />
          </Form.Item>

          <Form.Item name="notes" label="Notes">
            <TextArea rows={3} placeholder="Additional notes" />
          </Form.Item>

          <Form.Item>
            <Space className="w-full justify-end">
              <Button onClick={() => setDrawerVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit">
                {editingSupplier ? 'Update' : 'Create'}
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Drawer>

      {/* View Supplier Modal */}
      <Modal
        title="Supplier Details"
        open={!!viewingSupplier}
        onCancel={() => setViewingSupplier(null)}
        footer={[
          <Button key="close" onClick={() => setViewingSupplier(null)}>Close</Button>,
          <Button key="edit" type="primary" onClick={() => {
            openEditDrawer(viewingSupplier);
            setViewingSupplier(null);
          }}>Edit</Button>,
        ]}
        width={900}
      >
        {viewLoading ? (
          <div className="flex justify-center py-12">
            <Spin size="large" />
          </div>
        ) : viewingSupplier && viewingSupplier.name ? (
          <Tabs
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: 'Basic Info',
                children: (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-500 text-sm">Company Name</div>
                        <div className="font-medium text-lg">{viewingSupplier.name}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Contact Person</div>
                        <div className="font-medium">{viewingSupplier.contact_person}</div>
                      </div>
                    </div>
                    <Divider className="my-3" />
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-500 text-sm flex items-center gap-1">
                          <PhoneOutlined /> Phone
                        </div>
                        <div>{viewingSupplier.phone}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm flex items-center gap-1">
                          <MailOutlined /> Email
                        </div>
                        <div>{viewingSupplier.email || '-'}</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-sm">Address</div>
                      <div>
                        {viewingSupplier.address && <div>{viewingSupplier.address}</div>}
                        <div>{viewingSupplier.city}, {viewingSupplier.state} {viewingSupplier.pincode}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-gray-500 text-sm">GST Number</div>
                        <div><code className="bg-gray-100 px-2 py-1 rounded">{viewingSupplier.gst_number || '-'}</code></div>
                      </div>
                      <div>
                        <div className="text-gray-500 text-sm">Payment Terms</div>
                        <div><Tag>{viewingSupplier.payment_terms || 'Not set'}</Tag></div>
                      </div>
                    </div>
                    {viewingSupplier.notes && (
                      <div>
                        <div className="text-gray-500 text-sm">Notes</div>
                        <div className="bg-gray-50 p-3 rounded">{viewingSupplier.notes}</div>
                      </div>
                    )}
                  </div>
                ),
              },
              {
                key: 'summary',
                label: 'Purchase Summary',
                children: viewingSupplier.po_summary ? (
                  <div className="space-y-6">
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Total Orders"
                            value={parseInt(viewingSupplier.po_summary.total_orders) || 0}
                            prefix={<ShoppingCartOutlined />}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Completed"
                            value={parseInt(viewingSupplier.po_summary.completed_orders) || 0}
                            valueStyle={{ color: '#22c55e' }}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Pending"
                            value={parseInt(viewingSupplier.po_summary.pending_orders) || 0}
                            valueStyle={{ color: '#f59e0b' }}
                          />
                        </Card>
                      </Col>
                      <Col span={6}>
                        <Card size="small">
                          <Statistic
                            title="Total Value"
                            value={parseFloat(viewingSupplier.po_summary.total_value) || 0}
                            prefix="₹"
                            valueStyle={{ color: '#3b82f6' }}
                          />
                        </Card>
                      </Col>
                    </Row>

                    {viewingSupplier.po_summary.last_order_date && (
                      <div className="text-sm text-gray-500">
                        <CalendarOutlined className="mr-1" />
                        Last order: {dayjs(viewingSupplier.po_summary.last_order_date).format('DD MMM YYYY')}
                      </div>
                    )}

                    {viewingSupplier.recent_orders && viewingSupplier.recent_orders.length > 0 && (
                      <>
                        <Divider>Recent Purchase Orders</Divider>
                        <Table
                          dataSource={viewingSupplier.recent_orders}
                          rowKey="id"
                          pagination={false}
                          size="small"
                          columns={[
                            {
                              title: 'PO Number',
                              dataIndex: 'po_number',
                              key: 'po_number',
                              render: (po) => <span className="font-mono">{po}</span>,
                            },
                            {
                              title: 'Date',
                              dataIndex: 'created_at',
                              key: 'date',
                              render: (date) => dayjs(date).format('DD MMM YYYY'),
                            },
                            {
                              title: 'Amount',
                              dataIndex: 'total_amount',
                              key: 'amount',
                              render: (amt) => `₹${parseFloat(amt || 0).toLocaleString()}`,
                            },
                            {
                              title: 'Status',
                              dataIndex: 'status',
                              key: 'status',
                              render: (status) => {
                                const colors = {
                                  pending: 'orange',
                                  ordered: 'blue',
                                  received: 'green',
                                  cancelled: 'red',
                                };
                                return <Tag color={colors[status]}>{status?.toUpperCase()}</Tag>;
                              },
                            },
                          ]}
                        />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">No purchase orders yet</div>
                ),
              },
              {
                key: 'products',
                label: 'Purchased Products',
                children: viewingSupplier.purchased_products && viewingSupplier.purchased_products.length > 0 ? (
                  <Table
                    dataSource={viewingSupplier.purchased_products}
                    rowKey={(record) => `${record.product_id}-${record.variant_id}`}
                    pagination={{ pageSize: 10 }}
                    size="small"
                    columns={[
                      {
                        title: 'Product',
                        key: 'product',
                        render: (_, record) => (
                          <div>
                            <div className="font-medium">{record.product_name}</div>
                            <div className="text-xs text-gray-500">{record.variant_name}</div>
                          </div>
                        ),
                      },
                      {
                        title: 'SKU',
                        dataIndex: 'variant_sku',
                        key: 'sku',
                        render: (sku) => <code className="text-xs">{sku}</code>,
                      },
                      {
                        title: 'Total Qty',
                        dataIndex: 'total_qty_purchased',
                        key: 'qty',
                        render: (qty) => parseInt(qty || 0).toLocaleString(),
                      },
                      {
                        title: 'Avg Price',
                        dataIndex: 'avg_unit_price',
                        key: 'avg_price',
                        render: (price) => `₹${parseFloat(price || 0).toFixed(2)}`,
                      },
                      {
                        title: 'Total Value',
                        dataIndex: 'total_value',
                        key: 'value',
                        render: (val) => `₹${parseFloat(val || 0).toLocaleString()}`,
                      },
                      {
                        title: 'Orders',
                        dataIndex: 'order_count',
                        key: 'orders',
                      },
                      {
                        title: 'Last Purchased',
                        dataIndex: 'last_purchased',
                        key: 'last',
                        render: (date) => date ? dayjs(date).format('DD MMM YY') : '-',
                      },
                    ]}
                  />
                ) : (
                  <div className="text-center py-8 text-gray-500">No products purchased from this supplier yet</div>
                ),
              },
            ]}
          />
        ) : null}
      </Modal>
    </div>
  );
}
