'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import { useSearchParams } from 'next/navigation';
import { Card, Select, Input, Slider, Checkbox, Pagination, Spin, Empty, Tag, Breadcrumb, Button } from 'antd';
import { SearchOutlined, FilterOutlined, HomeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { getProducts, getCategories } from '@/lib/api';
import { getImageUrl, getPriceRange, isInStock } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

const { Option } = Select;

const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const { addToCart } = useCart();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: searchParams.get('q') || '',
    category: searchParams.get('category') || '',
    priceRange: [0, 5000],
    inStock: false,
    sort: 'newest'
  });
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 12,
    total: 0
  });

  // Fetch products and categories from API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [productsRes, categoriesRes] = await Promise.all([
          getProducts({ is_active: true }),
          getCategories({ is_active: true })
        ]);

        const productsData = productsRes.data || [];
        setAllProducts(productsData);
        setProducts(productsData);
        setCategories(categoriesRes.data || []);
        setPagination(prev => ({ ...prev, total: productsData.length }));
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter products
  useEffect(() => {
    if (allProducts.length === 0) return;

    let filtered = [...allProducts];

    if (filters.search) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.category) {
      filtered = filtered.filter(p => p.category_slug === filters.category);
    }

    if (filters.inStock) {
      filtered = filtered.filter(p => isInStock(p.variants));
    }

    filtered = filtered.filter(p => {
      const priceRange = getPriceRange(p.variants);
      return priceRange.min >= filters.priceRange[0] && priceRange.min <= filters.priceRange[1];
    });

    // Sort
    switch (filters.sort) {
      case 'price_low':
        filtered.sort((a, b) => getPriceRange(a.variants).min - getPriceRange(b.variants).min);
        break;
      case 'price_high':
        filtered.sort((a, b) => getPriceRange(b.variants).min - getPriceRange(a.variants).min);
        break;
      case 'name':
        filtered.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    setProducts(filtered);
    setPagination(prev => ({ ...prev, total: filtered.length, current: 1 }));
  }, [filters, allProducts]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-custom py-4">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Home</> },
              { title: 'Products' }
            ]}
          />
        </div>
      </div>

      <div className="container-custom py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-64 flex-shrink-0">
            <Card className="sticky top-24">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <FilterOutlined /> Filters
              </h3>

              {/* Search */}
              <div className="mb-6">
                <label className="form-label">Search</label>
                <Input
                  placeholder="Search products..."
                  prefix={<SearchOutlined className="text-gray-400" />}
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  allowClear
                />
              </div>

              {/* Category */}
              <div className="mb-6">
                <label className="form-label">Category</label>
                <Select
                  placeholder="All Categories"
                  className="w-full"
                  value={filters.category || undefined}
                  onChange={(value) => setFilters(prev => ({ ...prev, category: value || '' }))}
                  allowClear
                >
                  {categories.map(cat => (
                    <Option key={cat.slug} value={cat.slug}>{cat.name}</Option>
                  ))}
                </Select>
              </div>

              {/* Price Range */}
              <div className="mb-6">
                <label className="form-label">Price Range (₹)</label>
                <Slider
                  range
                  min={0}
                  max={5000}
                  value={filters.priceRange}
                  onChange={(value) => setFilters(prev => ({ ...prev, priceRange: value }))}
                  marks={{ 0: '₹0', 2500: '₹2500', 5000: '₹5000' }}
                />
              </div>

              {/* In Stock */}
              <div className="mb-6">
                <Checkbox
                  checked={filters.inStock}
                  onChange={(e) => setFilters(prev => ({ ...prev, inStock: e.target.checked }))}
                >
                  In Stock Only
                </Checkbox>
              </div>

              {/* Sort (mobile) */}
              <div className="lg:hidden mb-4">
                <label className="form-label">Sort By</label>
                <Select
                  className="w-full"
                  value={filters.sort}
                  onChange={(value) => setFilters(prev => ({ ...prev, sort: value }))}
                >
                  <Option value="newest">Newest First</Option>
                  <Option value="price_low">Price: Low to High</Option>
                  <Option value="price_high">Price: High to Low</Option>
                  <Option value="name">Name A-Z</Option>
                </Select>
              </div>
            </Card>
          </aside>

          {/* Products Grid */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">All Products</h1>
                <p className="text-gray-600">{pagination.total} products found</p>
              </div>
              <div className="hidden lg:block">
                <Select
                  className="w-48"
                  value={filters.sort}
                  onChange={(value) => setFilters(prev => ({ ...prev, sort: value }))}
                >
                  <Option value="newest">Newest First</Option>
                  <Option value="price_low">Price: Low to High</Option>
                  <Option value="price_high">Price: High to Low</Option>
                  <Option value="name">Name A-Z</Option>
                </Select>
              </div>
            </div>

            {/* Products */}
            {loading ? (
              <div className="flex justify-center py-20">
                <Spin size="large" />
              </div>
            ) : products.length === 0 ? (
              <Empty description="No products found" />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products
                    .slice((pagination.current - 1) * pagination.pageSize, pagination.current * pagination.pageSize)
                    .map((product) => {
                      const priceRange = getPriceRange(product.variants);
                      const inStock = isInStock(product.variants);
                      const productImage = product.images?.[0]?.url || product.image;

                      return (
                        <Link key={product.id} href={`/products/${product.slug}`}>
                          <Card
                            className="product-card h-full cursor-pointer overflow-hidden"
                            cover={
                              <div className="bg-gray-100 h-48 flex items-center justify-center relative">
                                <SafeImage
                                  src={getImageUrl(productImage, PLACEHOLDER_IMAGE)}
                                  fallback={PLACEHOLDER_IMAGE}
                                  alt={product.name}
                                  fill
                                  className="object-cover"
                                />
                                {!inStock && (
                                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <span className="text-white font-semibold">Out of Stock</span>
                                  </div>
                                )}
                              </div>
                            }
                            bodyStyle={{ padding: '16px' }}
                          >
                            <Tag color="orange" className="mb-2">{product.category_name || 'General'}</Tag>
                            <h3 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                              {product.name}
                            </h3>
                            <div className="flex items-center justify-between">
                              <div>
                                <span className="text-primary-600 font-bold text-lg">
                                  ₹{priceRange.min}
                                </span>
                                {priceRange.min !== priceRange.max && priceRange.max > 0 && (
                                  <span className="text-gray-500 text-sm ml-1">
                                    - ₹{priceRange.max}
                                  </span>
                                )}
                              </div>
                              {inStock && product.variants?.[0] && (
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<ShoppingCartOutlined />}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    addToCart(product.variants[0].id, 1);
                                  }}
                                >
                                  Add
                                </Button>
                              )}
                            </div>
                          </Card>
                        </Link>
                      );
                    })}
                </div>

                {/* Pagination */}
                <div className="flex justify-center mt-10">
                  <Pagination
                    current={pagination.current}
                    pageSize={pagination.pageSize}
                    total={pagination.total}
                    onChange={(page) => setPagination(prev => ({ ...prev, current: page }))}
                    showSizeChanger={false}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
