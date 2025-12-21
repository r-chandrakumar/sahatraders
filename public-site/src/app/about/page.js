'use client';

import { Card, Breadcrumb } from 'antd';
import { HomeOutlined, SafetyCertificateOutlined, TeamOutlined, TrophyOutlined, HeartOutlined } from '@ant-design/icons';

export default function AboutPage() {
  const stats = [
    { number: '15+', label: 'Years of Experience' },
    { number: '500+', label: 'Products' },
    { number: '10,000+', label: 'Happy Customers' },
    { number: '50+', label: 'Cities Served' },
  ];

  const values = [
    {
      icon: <SafetyCertificateOutlined className="text-4xl text-primary-500" />,
      title: 'Quality First',
      description: 'We never compromise on quality. Every product goes through strict quality checks before reaching you.'
    },
    {
      icon: <HeartOutlined className="text-4xl text-primary-500" />,
      title: 'Customer Focus',
      description: 'Your satisfaction is our priority. We go the extra mile to ensure you get the best service.'
    },
    {
      icon: <TeamOutlined className="text-4xl text-primary-500" />,
      title: 'Trusted Network',
      description: 'We work with trusted farmers and suppliers to bring you authentic products directly from the source.'
    },
    {
      icon: <TrophyOutlined className="text-4xl text-primary-500" />,
      title: 'Excellence',
      description: 'We strive for excellence in everything we do, from sourcing to delivery.'
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-custom py-4">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Home</> },
              { title: 'About Us' }
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <div className="hero-gradient text-white py-16">
        <div className="container-custom text-center">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">About Saha Traders</h1>
          <p className="text-white/90 max-w-2xl mx-auto text-lg">
            Your trusted partner for premium quality spices, oils, grains, and grocery items since establishment.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="container-custom -mt-8">
        <Card className="shadow-xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, index) => (
              <div key={index} className="text-center py-4">
                <div className="text-3xl md:text-4xl font-bold text-primary-600 mb-2">{stat.number}</div>
                <div className="text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Story */}
      <div className="container-custom py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Our Story</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-6">
              Building Trust, One Product at a Time
            </h2>
            <div className="space-y-4 text-gray-600">
              <p>
                Saha Traders started with a simple mission: to provide high-quality grocery products
                at fair prices. What began as a small trading business has grown into a trusted name
                in the spices and grocery industry.
              </p>
              <p>
                We understand that the quality of ingredients directly impacts the taste and health
                of your meals. That is why we source our products directly from farmers and trusted
                suppliers, ensuring that only the best reaches your kitchen.
              </p>
              <p>
                Our commitment to quality, combined with our dedication to customer service, has
                helped us build lasting relationships with thousands of happy customers across India.
              </p>
            </div>
          </div>
          <div className="bg-gray-200 rounded-2xl h-[400px] flex items-center justify-center">
            <span className="text-9xl">🏪</span>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="bg-white py-16">
        <div className="container-custom">
          <div className="text-center mb-12">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Our Values</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2">What We Stand For</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <div className="mb-4">{value.icon}</div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{value.title}</h3>
                <p className="text-gray-600 text-sm">{value.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Products We Deal In */}
      <div className="container-custom py-16">
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Our Products</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">What We Offer</h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We deal in a wide range of products to meet all your grocery needs
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { name: 'Spices', icon: '🌿', description: 'Cumin, Pepper, Turmeric & more' },
            { name: 'Oils', icon: '🫒', description: 'Groundnut, Mustard, Coconut' },
            { name: 'Grains & Pulses', icon: '🌾', description: 'Rice, Dal, Wheat & more' },
            { name: 'Dry Fruits', icon: '🥜', description: 'Almonds, Cashews, Raisins' },
          ].map((item, index) => (
            <Card key={index} className="text-center hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-4">{item.icon}</div>
              <h3 className="font-semibold text-lg text-gray-900 mb-2">{item.name}</h3>
              <p className="text-gray-600 text-sm">{item.description}</p>
            </Card>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-secondary-900 text-white py-16">
        <div className="container-custom text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Experience Quality?</h2>
          <p className="text-gray-300 mb-8 max-w-xl mx-auto">
            Join thousands of satisfied customers who trust Saha Traders for their grocery needs.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <a href="/products">
              <button className="bg-primary-500 hover:bg-primary-600 text-white px-8 py-3 rounded-lg font-semibold transition-colors">
                Browse Products
              </button>
            </a>
            <a href="/contact">
              <button className="border-2 border-white text-white hover:bg-white hover:text-gray-900 px-8 py-3 rounded-lg font-semibold transition-colors">
                Contact Us
              </button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
