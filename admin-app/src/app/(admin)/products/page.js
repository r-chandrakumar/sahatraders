'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Table, Button, Input, Select, Tag, Space, Card, Dropdown, Modal, message } from 'antd';
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  MoreOutlined,
  ExportOutlined,
} from '@ant-design/icons';
import toast from 'react-hot-toast';
import api from '@/lib/api';

const { Option } = Select;
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api').replace(/\/api$/, '');

const getFullUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return `${API_BASE}${url}`;
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    status: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [pagination.current, filters]);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.current,
        limit: pagination.pageSize,
        active_only: 'false',
      };

      if (filters.search) params.q = filters.search;
      if (filters.category) params.category = filters.category;

      const response = await api.get('/products', { params });
      const data = response.data;

      setProducts(data.data || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0
      }));
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('Failed to load products');
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

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Delete Product',
      content: 'Are you sure you want to delete this product? This action cannot be undone.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await api.delete(`/products/${id}`);
          toast.success('Product deleted successfully');
          fetchProducts();
        } catch (error) {
          toast.error(error.response?.data?.message || 'Failed to delete product');
        }
      },
    });
  };

  const handleTableChange = (paginationInfo) => {
    setPagination(prev => ({
      ...prev,
      current: paginationInfo.current,
      pageSize: paginationInfo.pageSize,
    }));
  };

  const handleSearch = (value) => {
    setFilters(prev => ({ ...prev, search: value }));
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  const columns = [
    {
      title: 'Product',
      key: 'product',
      render: (_, record) => {
        const firstImg = record.images?.[0];
        const imgUrl = firstImg ? getFullUrl(firstImg.url) : (record.default_image ? getFullUrl(record.default_image) : null);
        return (
        <div className="flex items-center gap-3">
          {imgUrl ? (
            <img
              src={imgUrl}
              alt={record.name}
              className="w-12 h-12 rounded object-cover"
              onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
          ) : null}
          <div
            className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center text-gray-400 text-xs flex-shrink-0"
            style={{ display: imgUrl ? 'none' : 'flex' }}
          >
            No img
          </div>
          <div>
            <Link href={`/products/${record.id}`} className="font-medium text-gray-900 hover:text-blue-600">
              {record.name}
            </Link>
            <div className="text-sm text-gray-500">SKU: {record.sku}</div>
          </div>
        </div>
        );
      },
    },
    {
      title: 'Category',
      dataIndex: 'category_name',
      key: 'category',
      render: (cat) => cat ? <Tag>{cat}</Tag> : <Tag color="default">Uncategorized</Tag>,
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type) => (
        <Tag color={type === 'inhouse' ? 'blue' : 'purple'}>
          {type === 'inhouse' ? 'In-house' : 'Supplier'}
        </Tag>
      ),
    },
    {
      title: 'Price Range',
      key: 'price',
      render: (_, record) => (
        <span>
          ₹{parseFloat(record.min_price || 0).toFixed(0)} - ₹{parseFloat(record.max_price || 0).toFixed(0)}
        </span>
      ),
    },
    {
      title: 'Stock',
      dataIndex: 'total_stock',
      key: 'stock',
      render: (stock) => {
        const stockNum = parseInt(stock) || 0;
        return (
          <span className={stockNum <= 10 ? 'text-red-600 font-medium' : ''}>
            {stockNum}
          </span>
        );
      },
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
      width: 100,
      render: (_, record) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: <Link href={`/products/${record.id}`}>View Details</Link>,
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: <Link href={`/products/${record.id}/edit`}>Edit</Link>,
              },
              { type: 'divider' },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
                onClick: () => handleDelete(record.id),
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

  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-subtitle">Manage your product catalog</p>
        </div>
        <Link href="/products/new">
          <Button type="primary" icon={<PlusOutlined />}>
            Add Product
          </Button>
        </Link>
      </div>

      <Card className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input.Search
            placeholder="Search products..."
            prefix={<SearchOutlined className="text-gray-400" />}
            onSearch={handleSearch}
            className="sm:w-64"
            allowClear
          />
          <Select
            placeholder="Category"
            value={filters.category || undefined}
            onChange={(value) => {
              setFilters({ ...filters, category: value || '' });
              setPagination(prev => ({ ...prev, current: 1 }));
            }}
            className="sm:w-40"
            allowClear
          >
            <Option value="">All Categories</Option>
            {categories.map(cat => (
              <Option key={cat.id} value={cat.id}>{cat.name}</Option>
            ))}
          </Select>
          <Select
            placeholder="Status"
            value={filters.status || undefined}
            onChange={(value) => setFilters({ ...filters, status: value || '' })}
            className="sm:w-32"
            allowClear
          >
            <Option value="active">Active</Option>
            <Option value="inactive">Inactive</Option>
          </Select>
          <Button icon={<ExportOutlined />}>Export</Button>
        </div>
      </Card>

      <Card>
        <Table
          dataSource={products}
          columns={columns}
          rowKey="id"
          loading={loading}
          onChange={handleTableChange}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showTotal: (total) => `${total} products`,
            showSizeChanger: true,
          }}
        />
      </Card>
    </div>
  );
}
