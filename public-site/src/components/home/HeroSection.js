'use client';

import Link from 'next/link';
import { Button, Input } from 'antd';
import { SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';

const HeroSection = () => {
  return (
    <section className="hero-gradient text-white">
      <div className="container-custom py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <div className="text-center lg:text-left">
            <span className="inline-block bg-white/20 px-4 py-1 rounded-full text-sm mb-6">
              Premium Quality Products
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              Fresh Spices &<br />
              Quality Grocery
            </h1>
            <p className="text-lg md:text-xl text-white/90 mb-8 max-w-xl mx-auto lg:mx-0">
              Discover our wide range of premium spices, cooking oils, grains, and dry fruits.
              Quality you can trust, prices you will love.
            </p>

            {/* Search bar */}
            <div className="max-w-md mx-auto lg:mx-0 mb-8">
              <Input.Search
                placeholder="Search for products..."
                size="large"
                enterButton={<SearchOutlined />}
                className="hero-search"
                onSearch={(value) => {
                  if (value) {
                    window.location.href = `/products?q=${encodeURIComponent(value)}`;
                  }
                }}
              />
            </div>

            {/* CTA buttons */}
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <Link href="/products">
                <Button size="large" className="bg-white text-primary-600 border-0 hover:bg-gray-100 h-12 px-8 font-semibold">
                  Browse Products
                </Button>
              </Link>
              <Link href="/enquiry">
                <Button size="large" ghost className="h-12 px-8 font-semibold border-2">
                  Place Order Enquiry <ArrowRightOutlined />
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero image/illustration */}
          <div className="hidden lg:block">
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-6 transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-3xl">🌿</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Fresh Spices</h3>
                    <p className="text-white/70 text-sm">Premium quality spices for authentic flavors</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-6 transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-3xl">🥜</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Dry Fruits</h3>
                    <p className="text-white/70 text-sm">Healthy and nutritious dry fruits</p>
                  </div>
                </div>
                <div className="space-y-4 mt-8">
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-6 transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-3xl">🫒</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Pure Oils</h3>
                    <p className="text-white/70 text-sm">Cold-pressed cooking oils</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur rounded-2xl p-6 transform hover:scale-105 transition-transform">
                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mb-4">
                      <span className="text-3xl">🌾</span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">Grains</h3>
                    <p className="text-white/70 text-sm">Wholesome grains and pulses</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 pt-12 border-t border-white/20">
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2">500+</div>
            <div className="text-white/70">Products</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2">10K+</div>
            <div className="text-white/70">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2">50+</div>
            <div className="text-white/70">Cities Served</div>
          </div>
          <div className="text-center">
            <div className="text-3xl md:text-4xl font-bold mb-2">15+</div>
            <div className="text-white/70">Years Experience</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
