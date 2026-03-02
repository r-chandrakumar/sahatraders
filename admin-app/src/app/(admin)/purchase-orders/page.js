'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Button, Input, Select, Tag, Card, Space, Modal, InputNumber, Dropdown } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EyeOutlined,
  CheckOutlined,
  DownloadOutlined,
  MoreOutlined,
  SendOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
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

export default function PurchaseOrdersPage() {
  const [pos, setPOs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ search: '', status: '' });
  const [receiveModal, setReceiveModal] = useState({ visible: false, po: null, loading: false });
  const [receiveQtys, setReceiveQtys] = useState({});
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });

  // Fetch purchase orders on mount
  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/purchase-orders');
      setPOs(response.data.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Failed to fetch purchase orders:', error);
      toast.error('Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const openReceiveModal = async (record) => {
    setReceiveModal({ visible: true, po: null, loading: true });
    try {
      const response = await api.get(`/admin/purchase-orders/${record.id}`);
      const poData = response.data.data;
      // Pre-fill remaining quantities
      const qtys = {};
      (poData.items || []).forEach((item) => {
        const remaining = parseFloat(item.quantity) - parseFloat(item.received_qty || 0);
        qtys[item.id] = remaining > 0 ? remaining : 0;
      });
      setReceiveQtys(qtys);
      setReceiveModal({ visible: true, po: poData, loading: false });
    } catch (error) {
      console.error('Failed to fetch PO details:', error);
      toast.error('Failed to load purchase order details');
      setReceiveModal({ visible: false, po: null, loading: false });
    }
  };

  const handleReceive = async () => {
    const po = receiveModal.po;
    if (!po || !po.items) return;

    // Collect quantities from receiveQtys state
    const itemsToReceive = po.items
      .map((item) => ({
        item_id: item.id,
        received_qty: receiveQtys[item.id] || 0,
      }))
      .filter((item) => item.received_qty > 0);

    if (itemsToReceive.length === 0) {
      toast.error('Please enter quantity for at least one item');
      return;
    }

    try {
      setReceiveModal((prev) => ({ ...prev, loading: true }));
      await api.put(`/admin/purchase-orders/${po.id}/receive`, { items: itemsToReceive });

      toast.success('Items received and stock updated');
      setReceiveModal({ visible: false, po: null, loading: false });
      setReceiveQtys({});

      await fetchPurchaseOrders();
    } catch (error) {
      console.error('Failed to receive items:', error);
      toast.error(error.response?.data?.message || 'Failed to receive items');
      setReceiveModal((prev) => ({ ...prev, loading: false }));
    }
  };

  const handleStatusChange = (record, newStatus) => {
    Modal.confirm({
      title: `Change Status to ${newStatus.toUpperCase()}`,
      content: `Are you sure you want to ${newStatus === 'ordered' ? 'mark as Ordered' : newStatus} this PO?`,
      okText: 'Confirm',
      okType: newStatus === 'cancelled' ? 'danger' : 'primary',
      onOk: async () => {
        try {
          await api.put(`/admin/purchase-orders/${record.id}/status`, { status: newStatus });
          toast.success(`Status updated to ${newStatus}`);
          fetchPurchaseOrders();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to update status');
        }
      },
    });
  };

  const handleDelete = (record) => {
    Modal.confirm({
      title: 'Delete Purchase Order',
      content: 'Are you sure? Only draft POs can be deleted.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/admin/purchase-orders/${record.id}`);
          toast.success('Purchase order deleted');
          fetchPurchaseOrders();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete');
        }
      },
    });
  };

  const getActionMenuItems = (record) => {
    const items = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: <Link href={`/purchase-orders/${record.id}`}>View Details</Link>,
      },
    ];

    if (record.status === 'draft') {
      items.push(
        { type: 'divider' },
        {
          key: 'order',
          icon: <SendOutlined />,
          label: 'Mark as Ordered',
          onClick: () => handleStatusChange(record, 'ordered'),
        },
        {
          key: 'cancel',
          icon: <CloseCircleOutlined />,
          label: 'Cancel',
          danger: true,
          onClick: () => handleStatusChange(record, 'cancelled'),
        },
        {
          key: 'delete',
          icon: <DeleteOutlined />,
          label: 'Delete',
          danger: true,
          onClick: () => handleDelete(record),
        },
      );
    }

    if (record.status === 'ordered' || record.status === 'partial') {
      items.push(
        { type: 'divider' },
        {
          key: 'receive',
          icon: <CheckOutlined />,
          label: 'Receive Items',
          onClick: () => openReceiveModal(record),
        },
      );
    }

    if (record.status === 'ordered') {
      items.push({
        key: 'cancel',
        icon: <CloseCircleOutlined />,
        label: 'Cancel',
        danger: true,
        onClick: () => handleStatusChange(record, 'cancelled'),
      });
    }

    return items;
  };

  const columns = [
    {
      title: 'PO Number',
      key: 'po',
      render: (_, record) => (
        <div>
          <Link href={`/purchase-orders/${record.id}`} className="font-medium text-blue-600 hover:text-blue-800">
            {record.po_number}
          </Link>
          <div className="text-sm text-gray-500">{dayjs(record.created_at).format('DD MMM YYYY')}</div>
        </div>
      ),
    },
    {
      title: 'Supplier',
      dataIndex: 'supplier_name',
      key: 'supplier',
    },
    {
      title: 'Amount',
      dataIndex: 'total_amount',
      key: 'amount',
      render: (amount) => `₹${amount.toLocaleString()}`,
    },
    {
      title: 'Expected',
      dataIndex: 'expected_date',
      key: 'expected',
      render: (date) => date ? dayjs(date).format('DD MMM YYYY') : '-',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={statusColors[status]}>{status.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      render: (_, record) => (
        <Dropdown
          menu={{ items: getActionMenuItems(record) }}
          trigger={['click']}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  const filteredPOs = pos.filter(po => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!po.po_number.toLowerCase().includes(search) &&
          !po.supplier_name.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filters.status && po.status !== filters.status) return false;
    return true;
  });

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Purchase Orders</h1>
          <p className="page-subtitle">Manage supplier purchase orders</p>
        </div>
        <Link href="/purchase-orders/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Create PO
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { status: 'draft', label: 'Draft' },
          { status: 'ordered', label: 'Ordered' },
          { status: 'partial', label: 'Partial' },
          { status: 'received', label: 'Received' },
        ].map(item => {
          const count = pos.filter(p => p.status === item.status).length;
          return (
            <Card
              key={item.status}
              size="small"
              className={`cursor-pointer ${filters.status === item.status ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setFilters({ ...filters, status: filters.status === item.status ? '' : item.status })}
            >
              <div className="text-center">
                <Tag color={statusColors[item.status]}>{item.label}</Tag>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder="Search POs..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="sm:w-64"
            allowClear
          />
          <Select
            placeholder="Status"
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value })}
            className="sm:w-40"
            allowClear
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'ordered', label: 'Ordered' },
              { value: 'partial', label: 'Partial' },
              { value: 'received', label: 'Received' },
            ]}
          />
        </div>
      </Card>

      <Card>
        <Table
          dataSource={filteredPOs}
          columns={columns}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showTotal: (total) => `${total} purchase orders`,
          }}
        />
      </Card>

      {/* Receive Modal */}
      <Modal
        title="Receive Items"
        open={receiveModal.visible}
        onCancel={() => { setReceiveModal({ visible: false, po: null, loading: false }); setReceiveQtys({}); }}
        footer={null}
        width={600}
      >
        {receiveModal.loading && (
          <div className="text-center py-8">Loading purchase order details...</div>
        )}
        {receiveModal.po && (
          <>
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="font-medium">{receiveModal.po.po_number}</div>
              <div className="text-sm text-gray-500">{receiveModal.po.supplier_name}</div>
            </div>

            {receiveModal.po.items && receiveModal.po.items.length > 0 ? (
              <>
                <div className="mb-4">
                  <div className="text-sm font-medium mb-2">Items to Receive</div>
                  {receiveModal.po.items.map((item) => {
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

                <Button type="primary" block onClick={handleReceive} loading={receiveModal.loading}>
                  Confirm Receipt
                </Button>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">No items found for this purchase order</div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
