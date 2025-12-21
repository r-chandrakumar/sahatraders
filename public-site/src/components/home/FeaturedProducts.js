'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Button, Tag, Spin } from 'antd';
import { ShoppingOutlined, RightOutlined } from '@ant-design/icons';
import { getProducts } from '@/lib/api';
import { getImageUrl, getPriceRange, isInStock } from '@/lib/utils';

const PLACEHOLDER_IMAGE = 'https://placehold.co/300x300/f3f4f6/9ca3af?text=Product';

const FeaturedProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await getProducts({ limit: 8, is_active: true });
        setProducts(response.data || []);
      } catch (error) {
        console.error('Failed to fetch products:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) {
    return (
      <section className="section-padding">
        <div className="container-custom flex justify-center py-20">
          <Spin size="large" />
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className="section-padding">
      <div className="container-custom">
        {/* Section header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10">
          <div>
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">
              Featured Products
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">
              Our Best Sellers
            </h2>
          </div>
          <Link
            href="/products"
            className="mt-4 md:mt-0 inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
          >
            View All Products
            <RightOutlined className="ml-2" />
          </Link>
        </div>

        {/* Products grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {products.map((product) => {
            const priceRange = getPriceRange(product.variants);
            const inStock = isInStock(product.variants);
            const productImage = product.images?.[0]?.image_url || product.image;

            return (
              <Link key={product.id} href={`/products/${product.slug}`}>
                <Card
                  className="product-card h-full cursor-pointer overflow-hidden"
                  cover={
                    <div className="bg-gray-100 h-48 flex items-center justify-center relative">
                      <Image
                        src={getImageUrl(productImage, PLACEHOLDER_IMAGE)}
                        alt={product.name}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.target.src = PLACEHOLDER_IMAGE;
                        }}
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
                    {inStock && (
                      <span className="badge-in-stock">In Stock</span>
                    )}
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link href="/enquiry">
            <Button type="primary" size="large" icon={<ShoppingOutlined />} className="h-12 px-8">
              Place Bulk Order Enquiry
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default FeaturedProducts;
