'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import { Card, Spin } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { getCategories } from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

const PLACEHOLDER_IMAGE = '/images/placeholder-category.svg';

const categoryColors = [
  { bg: 'bg-orange-50', border: 'border-orange-200' },
  { bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { bg: 'bg-amber-50', border: 'border-amber-200' },
  { bg: 'bg-red-50', border: 'border-red-200' },
  { bg: 'bg-green-50', border: 'border-green-200' },
  { bg: 'bg-blue-50', border: 'border-blue-200' },
];

const CategorySection = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await getCategories({ limit: 8, is_active: true });
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
      <section className="section-padding bg-gray-50">
        <div className="container-custom flex justify-center py-20">
          <Spin size="large" />
        </div>
      </section>
    );
  }

  if (categories.length === 0) {
    return null;
  }

  return (
    <section className="section-padding bg-gray-50">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">
            Our Categories
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            Shop by Category
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our wide range of quality products across different categories
          </p>
        </div>

        {/* Category grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.slice(0, 8).map((category, index) => {
            const colorIndex = index % categoryColors.length;
            const colors = categoryColors[colorIndex];

            return (
              <Link key={category.id} href={`/categories/${category.slug}`}>
                <Card
                  className={`category-card h-full border-2 ${colors.border} ${colors.bg} cursor-pointer`}
                  bodyStyle={{ padding: '24px' }}
                >
                  <div className="text-center">
                    <div className="w-20 h-20 mx-auto mb-4 relative rounded-full overflow-hidden bg-white">
                      <SafeImage
                        src={getImageUrl(category.images?.[0]?.url || category.image_url, PLACEHOLDER_IMAGE)}
                        fallback={PLACEHOLDER_IMAGE}
                        alt={category.name}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">
                      {category.name}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {category.description || 'Quality products in this category'}
                    </p>
                    <div className="flex items-center justify-center text-primary-600 font-medium">
                      <span>{category.product_count || 0}+ Products</span>
                      <RightOutlined className="ml-2 text-xs" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>

        {/* View all link */}
        <div className="text-center mt-10">
          <Link
            href="/categories"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 font-semibold"
          >
            View All Categories
            <RightOutlined className="ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CategorySection;
