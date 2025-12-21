'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Breadcrumb, Spin } from 'antd';
import { HomeOutlined, RightOutlined } from '@ant-design/icons';
import { getCategories } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

const PLACEHOLDER_IMAGE = 'https://placehold.co/200x200/f3f4f6/9ca3af?text=Category';

const categoryGradients = [
  'bg-gradient-to-br from-orange-100 to-red-100',
  'bg-gradient-to-br from-yellow-100 to-amber-100',
  'bg-gradient-to-br from-amber-100 to-orange-100',
  'bg-gradient-to-br from-red-100 to-pink-100',
  'bg-gradient-to-br from-rose-100 to-red-100',
  'bg-gradient-to-br from-stone-100 to-amber-100',
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories({ is_active: true });
        setCategories(response.data || []);
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
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
              { title: 'Categories' }
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-gradient text-white py-12">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-4">Product Categories</h1>
          <p className="text-white/90 max-w-2xl mx-auto">
            Browse our wide selection of quality products organized by category
          </p>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="container-custom py-12">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categories.map((category, index) => (
            <Link key={category.slug} href={`/categories/${category.slug}`}>
              <Card
                className="category-card h-full cursor-pointer overflow-hidden hover:shadow-xl transition-all duration-300"
                bodyStyle={{ padding: 0 }}
              >
                <div className={`${categoryGradients[index % categoryGradients.length]} h-48 flex items-center justify-center relative`}>
                  {(category.image_url || category.image) ? (
                    <Image
                      src={getImageUrl(category.image_url || category.image, PLACEHOLDER_IMAGE)}
                      alt={category.name}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        e.target.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                  ) : (
                    <Image
                      src={PLACEHOLDER_IMAGE}
                      alt={category.name}
                      fill
                      className="object-contain p-8"
                    />
                  )}
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{category.name}</h3>
                  <p className="text-gray-600 mb-4 line-clamp-2">
                    {category.description || 'Quality products in this category'}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-primary-600 font-semibold">{category.product_count || 0}+ Products</span>
                    <span className="text-primary-600">
                      <RightOutlined />
                    </span>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
