'use client';

import { useState, useEffect } from 'react';
import { Table, Card, Input, Select, DatePicker, Tag, Space, Button, message } from 'antd';
import { SearchOutlined, FilterOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '@/lib/api';

const { RangePicker } = DatePicker;

const actionColors = {
  create: 'green',
  update: 'blue',
  delete: 'red',
  login: 'purple',
  logout: 'default',
};

const entityLabels = {
  product: 'Product',
  sales_order: 'Sales Order',
  purchase_order: 'Purchase Order',
  inventory: 'Inventory',
  user: 'User',
  payment: 'Payment',
  settings: 'Settings',
  auth: 'Authentication',
  invoice: 'Invoice',
  category: 'Category',
  supplier: 'Supplier',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    action: '',
    entity_type: '',
    dateRange: null,
  });

  // Fetch audit logs from API
  const fetchLogs = async (page = 1, pageSize = 20) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: pageSize,
      };

      // Add filters to params
      if (filters.action) {
        params.action = filters.action;
      }
      if (filters.entity_type) {
        params.entity_type = filters.entity_type;
      }

      const response = await api.get('/admin/audit-logs', { params });

      setLogs(response.data.data || []);
      setPagination({
        current: response.data.pagination?.page || page,
        pageSize: response.data.pagination?.limit || pageSize,
        total: response.data.pagination?.total || 0,
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      message.error('Failed to fetch audit logs');
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs on mount and when filters change
  useEffect(() => {
    fetchLogs(1, pagination.pageSize);
  }, [filters.action, filters.entity_type]);

  // Handle pagination change
  const handleTableChange = (paginationConfig) => {
    fetchLogs(paginationConfig.current, paginationConfig.pageSize);
  };

  // Handle filter reset
  const handleReset = () => {
    setFilters({ search: '', action: '', entity_type: '', dateRange: null });
  };

  const columns = [
    {
      title: 'Date & Time',
      dataIndex: 'created_at',
      key: 'datetime',
      width: 180,
      render: (date) => dayjs(date).format('DD MMM YYYY, hh:mm A'),
    },
    {
      title: 'User',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div>
          <div className="font-medium">{record.user_name}</div>
          <div className="text-xs text-gray-500">{record.user_email}</div>
        </div>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 100,
      render: (action) => (
        <Tag color={actionColors[action]}>{action.toUpperCase()}</Tag>
      ),
    },
    {
      title: 'Entity',
      dataIndex: 'entity_type',
      key: 'entity',
      width: 130,
      render: (type) => (
        <Tag>{entityLabels[type] || type}</Tag>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: 'IP Address',
      dataIndex: 'ip_address',
      key: 'ip',
      width: 130,
    },
  ];

  // Client-side filtering for search and date range
  const filteredLogs = logs.filter(log => {
    if (filters.search) {
      const search = filters.search.toLowerCase();
      if (!log.user_name.toLowerCase().includes(search) &&
          !log.description.toLowerCase().includes(search) &&
          !log.user_email.toLowerCase().includes(search)) {
        return false;
      }
    }
    if (filters.dateRange) {
      const logDate = dayjs(log.created_at);
      if (logDate.isBefore(filters.dateRange[0], 'day') ||
          logDate.isAfter(filters.dateRange[1], 'day')) {
        return false;
      }
    }
    return true;
  });

  return (
    <div>
      <div className="page-header mb-6">
        <h1 className="page-title">Audit Logs</h1>
        <p className="page-subtitle">Track all system activities and changes</p>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-wrap gap-4">
          <Input
            placeholder="Search logs..."
            prefix={<SearchOutlined className="text-gray-400" />}
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="w-64"
            allowClear
          />

          <Select
            placeholder="Action"
            value={filters.action || undefined}
            onChange={(value) => setFilters({ ...filters, action: value })}
            className="w-32"
            allowClear
            options={[
              { value: 'create', label: 'Create' },
              { value: 'update', label: 'Update' },
              { value: 'delete', label: 'Delete' },
              { value: 'login', label: 'Login' },
            ]}
          />

          <Select
            placeholder="Entity Type"
            value={filters.entity_type || undefined}
            onChange={(value) => setFilters({ ...filters, entity_type: value })}
            className="w-40"
            allowClear
            options={Object.entries(entityLabels).map(([value, label]) => ({
              value,
              label,
            }))}
          />

          <RangePicker
            value={filters.dateRange}
            onChange={(dates) => setFilters({ ...filters, dateRange: dates })}
          />

          <Button
            icon={<ReloadOutlined />}
            onClick={handleReset}
          >
            Reset
          </Button>
          <Button
            type="primary"
            onClick={() => fetchLogs(1, pagination.pageSize)}
            loading={loading}
          >
            Refresh
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { action: 'create', label: 'Creates', color: 'green' },
          { action: 'update', label: 'Updates', color: 'blue' },
          { action: 'delete', label: 'Deletes', color: 'red' },
          { action: 'login', label: 'Logins', color: 'purple' },
        ].map(item => {
          const count = filteredLogs.filter(l => l.action === item.action).length;
          return (
            <Card
              key={item.action}
              size="small"
              className={`cursor-pointer ${filters.action === item.action ? 'border-blue-500 bg-blue-50' : ''}`}
              onClick={() => setFilters({
                ...filters,
                action: filters.action === item.action ? '' : item.action
              })}
            >
              <div className="text-center">
                <Tag color={item.color}>{item.label}</Tag>
                <div className="text-2xl font-bold mt-1">{count}</div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Logs Table */}
      <Card>
        <Table
          dataSource={filteredLogs}
          columns={columns}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `${total} log entries`,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
          }}
        />
      </Card>
    </div>
  );
}
