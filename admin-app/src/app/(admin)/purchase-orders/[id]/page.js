'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card, Button, Tag, Table, Descriptions, Space, Modal, Select, Spin, InputNumber, Divider
} from 'antd';
import {
  ArrowLeftOutlined, CheckOutlined, DeleteOutlined, PrinterOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const statusColors = {
  draft: 'default',
  ordered: 'blue',
  partial: 'orange',
  received: 'green',
  cancelled: 'red',
};

const statusFlow = {
  draft: ['ordered', 'cancelled'],
  ordered: ['cancelled'],
  partial: [],
  received: [],
  cancelled: [],
};

export default function PurchaseOrderDetailPage({ params }) {
  const router = useRouter();
  const [po, setPO] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statusChanging, setStatusChanging] = useState(false);
  const [receiveModal, setReceiveModal] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState({});
  const [receiving, setReceiving] = useState(false);

  useEffect(() => {
    fetchPO();
  }, [params.id]);

  const fetchPO = async () => {
    try {
      const response = await api.get(`/admin/purchase-orders/${params.id}`);
      const data = response.data.data;
      setPO(data);
      // Pre-fill receive quantities
      const qtys = {};
      (data.items || []).forEach((item) => {
        const remaining = parseFloat(item.quantity) - parseFloat(item.received_qty || 0);
        qtys[item.id] = remaining > 0 ? remaining : 0;
      });
      setReceiveQtys(qtys);
    } catch (error) {
      console.error('Failed to fetch PO:', error);
      toast.error('Failed to load purchase order');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    const label = newStatus === 'ordered' ? 'mark as Ordered' : newStatus;
    Modal.confirm({
      title: `Change Status to ${newStatus.toUpperCase()}`,
      content: `Are you sure you want to ${label} this purchase order?`,
      okText: 'Confirm',
      okType: newStatus === 'cancelled' ? 'danger' : 'primary',
      onOk: async () => {
        setStatusChanging(true);
        try {
          await api.put(`/admin/purchase-orders/${params.id}/status`, { status: newStatus });
          toast.success(`Status updated to ${newStatus}`);
          fetchPO();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to update status');
        } finally {
          setStatusChanging(false);
        }
      },
    });
  };

  const handleReceive = async () => {
    const itemsToReceive = (po.items || [])
      .map((item) => ({
        item_id: item.id,
        received_qty: receiveQtys[item.id] || 0,
      }))
      .filter((item) => item.received_qty > 0);

    if (itemsToReceive.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    setReceiving(true);
    try {
      await api.put(`/admin/purchase-orders/${params.id}/receive`, { items: itemsToReceive });
      toast.success('Items received and stock updated');
      setReceiveModal(false);
      fetchPO();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to receive items');
    } finally {
      setReceiving(false);
    }
  };

  const handleDelete = () => {
    Modal.confirm({
      title: 'Delete Purchase Order',
      content: 'Are you sure? This can only be done for draft POs.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/purchase-orders/${params.id}`);
          toast.success('Purchase order deleted');
          router.push('/purchase-orders');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete');
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (!po) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl text-gray-600">Purchase order not found</h2>
        <Link href="/purchase-orders">
          <Button type="primary" className="mt-4">Back to Purchase Orders</Button>
        </Link>
      </div>
    );
  }

  const items = po.items || [];
  const canReceive = po.status === 'ordered' || po.status === 'partial';
  const canChangeStatus = (statusFlow[po.status] || []).length > 0;
  const canDelete = po.status === 'draft';

  const itemColumns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.product_name}</div>
          <div className="text-sm text-gray-500">{record.variant_name} ({record.sku})</div>
        </div>
      ),
    },
    {
      title: 'Qty Ordered',
      dataIndex: 'quantity',
      key: 'quantity',
      render: (qty) => parseFloat(qty),
    },
    {
      title: 'Received',
      dataIndex: 'received_qty',
      key: 'received',
      render: (qty, record) => {
        const received = parseFloat(qty || 0);
        const ordered = parseFloat(record.quantity);
        const color = received >= ordered ? 'green' : received > 0 ? 'orange' : 'default';
        return <Tag color={color}>{received} / {ordered}</Tag>;
      },
    },
    {
      title: 'Unit Price',
      dataIndex: 'unit_price',
      key: 'unit_price',
      render: (price) => `₹${parseFloat(price).toLocaleString()}`,
    },
    {
      title: 'Tax %',
      dataIndex: 'tax_percent',
      key: 'tax',
      render: (tax) => `${parseFloat(tax || 0)}%`,
    },
    {
      title: 'Line Total',
      dataIndex: 'total_line',
      key: 'total',
      render: (total) => `₹${parseFloat(total).toLocaleString()}`,
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <Link href="/purchase-orders" className="text-blue-600 hover:text-blue-800 flex items-center gap-2 mb-2">
            <ArrowLeftOutlined /> Back to Purchase Orders
          </Link>
          <h1 className="text-2xl font-bold">{po.po_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Tag color={statusColors[po.status]}>{po.status?.toUpperCase()}</Tag>
            <span className="text-gray-500">Created {dayjs(po.created_at).format('DD MMM YYYY')}</span>
          </div>
        </div>
        <Space wrap>
          {canDelete && (
            <Button danger icon={<DeleteOutlined />} onClick={handleDelete}>
              Delete
            </Button>
          )}
          {canChangeStatus && (statusFlow[po.status] || []).map((nextStatus) => (
            <Button
              key={nextStatus}
              type={nextStatus === 'cancelled' ? 'default' : 'primary'}
              danger={nextStatus === 'cancelled'}
              onClick={() => handleStatusChange(nextStatus)}
              loading={statusChanging}
            >
              {nextStatus === 'ordered' ? 'Mark as Ordered' : nextStatus === 'cancelled' ? 'Cancel PO' : nextStatus.toUpperCase()}
            </Button>
          ))}
          {canReceive && (
            <Button type="primary" icon={<CheckOutlined />} onClick={() => setReceiveModal(true)}>
              Receive Items
            </Button>
          )}
        </Space>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Items */}
          <Card title="Order Items">
            <Table
              dataSource={items}
              columns={itemColumns}
              rowKey="id"
              pagination={false}
              summary={() => (
                <Table.Summary>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} className="text-right font-medium">Subtotal</Table.Summary.Cell>
                    <Table.Summary.Cell>₹{parseFloat(po.subtotal || 0).toLocaleString()}</Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} className="text-right font-medium">Tax</Table.Summary.Cell>
                    <Table.Summary.Cell>₹{parseFloat(po.tax_amount || 0).toLocaleString()}</Table.Summary.Cell>
                  </Table.Summary.Row>
                  <Table.Summary.Row>
                    <Table.Summary.Cell colSpan={5} className="text-right font-bold text-lg">Total</Table.Summary.Cell>
                    <Table.Summary.Cell className="font-bold text-lg">₹{parseFloat(po.total_amount || 0).toLocaleString()}</Table.Summary.Cell>
                  </Table.Summary.Row>
                </Table.Summary>
              )}
            />
          </Card>

          {/* Notes */}
          {po.notes && (
            <Card title="Notes">
              <p className="text-gray-600 whitespace-pre-wrap">{po.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Supplier Info */}
          <Card title="Supplier">
            <div className="space-y-2">
              <div className="font-medium text-lg">{po.supplier_name}</div>
              {po.supplier_email && <div className="text-gray-500">{po.supplier_email}</div>}
              {po.supplier_phone && <div className="text-gray-500">{po.supplier_phone}</div>}
            </div>
          </Card>

          {/* Order Details */}
          <Card title="Order Details">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <Tag color={statusColors[po.status]}>{po.status?.toUpperCase()}</Tag>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span>{dayjs(po.created_at).format('DD MMM YYYY')}</span>
              </div>
              {po.expected_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expected</span>
                  <span>{dayjs(po.expected_date).format('DD MMM YYYY')}</span>
                </div>
              )}
              {po.received_date && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Received</span>
                  <span>{dayjs(po.received_date).format('DD MMM YYYY')}</span>
                </div>
              )}
              <Divider className="my-2" />
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{parseFloat(po.subtotal || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span>₹{parseFloat(po.tax_amount || 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>₹{parseFloat(po.total_amount || 0).toLocaleString()}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Receive Modal */}
      <Modal
        title="Receive Items"
        open={receiveModal}
        onCancel={() => setReceiveModal(false)}
        footer={null}
        width={600}
      >
        <div className="mb-4">
          <div className="text-sm font-medium mb-2">Enter quantities received</div>
          {items.map((item) => {
            const remaining = parseFloat(item.quantity) - parseFloat(item.received_qty || 0);
            return (
              <div key={item.id} className="flex items-center gap-4 p-3 border rounded mb-2">
                <div className="flex-1">
                  <div className="font-medium">{item.product_name} - {item.variant_name}</div>
                  <div className="text-sm text-gray-500">
                    Ordered: {parseFloat(item.quantity)} | Received: {parseFloat(item.received_qty || 0)} | Remaining: {remaining}
                  </div>
                </div>
                <InputNumber
                  min={0}
                  max={remaining}
                  value={receiveQtys[item.id] || 0}
                  onChange={(val) => setReceiveQtys((prev) => ({ ...prev, [item.id]: val || 0 }))}
                  style={{ width: 100 }}
                  disabled={remaining <= 0}
                />
              </div>
            );
          })}
        </div>
        <Button type="primary" block onClick={handleReceive} loading={receiving}>
          Confirm Receipt
        </Button>
      </Modal>
    </div>
  );
}
