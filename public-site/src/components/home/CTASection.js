'use client';

import Link from 'next/link';
import { Button } from 'antd';
import { PhoneOutlined, MessageOutlined } from '@ant-design/icons';

const CTASection = () => {
  return (
    <section className="py-16 bg-secondary-900 text-white">
      <div className="container-custom">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
          <div className="text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Place Your Order?
            </h2>
            <p className="text-gray-300 text-lg max-w-xl">
              Contact us for bulk orders, custom requirements, or any questions.
              Our team is here to help you find the best products at the best prices.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 justify-center lg:justify-end">
            <Link href="/enquiry">
              <Button
                size="large"
                icon={<MessageOutlined />}
                className="bg-primary-500 border-primary-500 hover:bg-primary-600 hover:border-primary-600 text-white h-12 px-8"
              >
                Send Enquiry
              </Button>
            </Link>
            <a href="tel:+919876543210">
              <Button
                size="large"
                icon={<PhoneOutlined />}
                ghost
                className="h-12 px-8 border-2"
              >
                Call Now
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
