'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import { Card, Select, Pagination, Spin, Empty, Tag, Breadcrumb, Button } from 'antd';
import { HomeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { getCategoryBySlug, getProducts } from '@/lib/api';
import { getImageUrl, getPriceRange, isInStock } from '@/lib/utils';
import { useCart } from '@/context/CartContext';

const { Option } = Select;

const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';
const PLACEHOLDER_CATEGORY_IMAGE = '/images/placeholder-category.svg';

export default function CategoryPage({ params }) {
  const { slug } = params;
  const { addToCart } = useCart();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 12, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch category details
        const categoryRes = await getCategoryBySlug(slug);
        setCategory(categoryRes.data);

        // Fetch products for this category
        if (categoryRes.data) {
          const productsRes = await getProducts({
            category: categoryRes.data.id,
          });
          setProducts(productsRes.data || []);
          setPagination(prev => ({ ...prev, total: productsRes.data?.length || 0 }));
        }
      } catch (error) {
        console.error('Failed to fetch category data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [slug]);

  const sortedProducts = [...products].sort((a, b) => {
    switch (sortBy) {
      case 'price_low': return getPriceRange(a.variants).min - getPriceRange(b.variants).min;
      case 'price_high': return getPriceRange(b.variants).min - getPriceRange(a.variants).min;
      case 'name': return a.name.localeCompare(b.name);
      default: return 0;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!category) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Empty description="Category not found" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-custom py-4">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Home</> },
              { href: '/categories', title: 'Categories' },
              { title: category.name }
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-gradient text-white py-12">
        <div className="container-custom text-center">
          <div className="w-24 h-24 mx-auto mb-4 relative rounded-full overflow-hidden bg-white">
            <SafeImage
              src={getImageUrl(category.images?.[0]?.url || category.image_url, PLACEHOLDER_CATEGORY_IMAGE)}
              fallback={PLACEHOLDER_CATEGORY_IMAGE}
              alt={category.name}
              fill
              className={category.images?.[0]?.url || category.image_url ? "object-cover" : "object-contain p-4"}
            />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">{category.name}</h1>
          <p className="text-white/90 max-w-2xl mx-auto">
            {category.description || 'Quality products in this category'}
          </p>
        </div>
      </div>

      {/* Category Images Gallery */}
      {category.images?.length > 1 && (
        <div className="container-custom py-6">
          <div className="flex gap-4 overflow-x-auto pb-2">
            {category.images.map((img, idx) => (
              <div key={img.id || idx} className="flex-shrink-0 w-40 h-40 relative rounded-lg overflow-hidden bg-gray-100">
                <SafeImage
                  src={getImageUrl(img.url, PLACEHOLDER_CATEGORY_IMAGE)}
                  fallback={PLACEHOLDER_CATEGORY_IMAGE}
                  alt={`${category.name} ${idx + 1}`}
                  fill
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Products */}
      <div className="container-custom py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div>
            <p className="text-gray-600">{products.length} products found</p>
          </div>
          <Select
            className="w-48"
            value={sortBy}
            onChange={setSortBy}
          >
            <Option value="newest">Newest First</Option>
            <Option value="price_low">Price: Low to High</Option>
            <Option value="price_high">Price: High to Low</Option>
            <Option value="name">Name A-Z</Option>
          </Select>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <Empty description="No products found in this category" />
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {sortedProducts
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
                        <Tag color="orange" className="mb-2">{category.name}</Tag>
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
            {products.length > pagination.pageSize && (
              <div className="flex justify-center mt-10">
                <Pagination
                  current={pagination.current}
                  pageSize={pagination.pageSize}
                  total={products.length}
                  onChange={(page) => setPagination(prev => ({ ...prev, current: page }))}
                  showSizeChanger={false}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
