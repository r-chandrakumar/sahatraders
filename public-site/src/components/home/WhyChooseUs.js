'use client';

import { Card } from 'antd';
import {
  SafetyCertificateOutlined,
  TruckOutlined,
  CustomerServiceOutlined,
  DollarOutlined
} from '@ant-design/icons';

const features = [
  {
    icon: <SafetyCertificateOutlined className="text-4xl text-primary-500" />,
    title: 'Premium Quality',
    description: 'We source only the finest quality products from trusted suppliers across India.'
  },
  {
    icon: <TruckOutlined className="text-4xl text-primary-500" />,
    title: 'Fast Delivery',
    description: 'Quick and reliable delivery to your doorstep. Pan-India shipping available.'
  },
  {
    icon: <DollarOutlined className="text-4xl text-primary-500" />,
    title: 'Best Prices',
    description: 'Competitive wholesale and retail prices. Get the best value for your money.'
  },
  {
    icon: <CustomerServiceOutlined className="text-4xl text-primary-500" />,
    title: 'Dedicated Support',
    description: 'Our team is always ready to help you with any questions or concerns.'
  }
];

const WhyChooseUs = () => {
  return (
    <section className="section-padding bg-gradient-to-br from-primary-50 to-secondary-100">
      <div className="container-custom">
        {/* Section header */}
        <div className="text-center mb-12">
          <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">
            Why Choose Us
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mt-2 mb-4">
            The Saha Traders Advantage
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            We are committed to providing you with the best products and services
          </p>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="text-center border-0 shadow-md hover:shadow-lg transition-shadow"
              bodyStyle={{ padding: '32px 24px' }}
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-600 text-sm">
                {feature.description}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyChooseUs;
