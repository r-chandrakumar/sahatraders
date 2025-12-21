'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  PhoneOutlined,
  MailOutlined,
  EnvironmentOutlined,
  FacebookOutlined,
  InstagramOutlined,
  TwitterOutlined
} from '@ant-design/icons';

const Footer = () => {
  const [currentYear, setCurrentYear] = useState(2024);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="bg-secondary-900 text-white">
      {/* Main footer */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company info */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/images/logo.png"
                alt="Saha Traders"
                className="h-12 w-auto"
              />
              <div>
                <h3 className="text-lg font-bold text-primary-400">Saha Traders</h3>
                <p className="text-xs text-secondary-400">Premium Spices & Grocery</p>
              </div>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Your trusted partner for quality spices, oils, grains, and more.
              Delivering excellence since establishment.
            </p>
            <div className="flex gap-4">
              <a href="#" className="text-gray-400 hover:text-primary-500 transition-colors">
                <FacebookOutlined className="text-xl" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-500 transition-colors">
                <InstagramOutlined className="text-xl" />
              </a>
              <a href="#" className="text-gray-400 hover:text-primary-500 transition-colors">
                <TwitterOutlined className="text-xl" />
              </a>
            </div>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/products" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Products
                </Link>
              </li>
              <li>
                <Link href="/categories" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Categories
                </Link>
              </li>
              <li>
                <Link href="/about" className="text-gray-400 hover:text-primary-500 transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Categories</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/categories/spices" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Spices
                </Link>
              </li>
              <li>
                <Link href="/categories/oils" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Oils
                </Link>
              </li>
              <li>
                <Link href="/categories/grains-pulses" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Grains & Pulses
                </Link>
              </li>
              <li>
                <Link href="/categories/dry-fruits" className="text-gray-400 hover:text-primary-500 transition-colors">
                  Dry Fruits
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact info */}
          <div>
            <h4 className="text-lg font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <EnvironmentOutlined className="text-primary-500 mt-1" />
                <span className="text-gray-400 text-sm">
                  123 Market Street, City,<br />
                  State - 123456
                </span>
              </li>
              <li className="flex items-center gap-3">
                <PhoneOutlined className="text-primary-500" />
                <a href="tel:+919876543210" className="text-gray-400 hover:text-primary-500 transition-colors text-sm">
                  +91 98765 43210
                </a>
              </li>
              <li className="flex items-center gap-3">
                <MailOutlined className="text-primary-500" />
                <a href="mailto:contact@sahatraders.com" className="text-gray-400 hover:text-primary-500 transition-colors text-sm">
                  contact@sahatraders.com
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-gray-800">
        <div className="container-custom py-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} Saha Traders. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/terms" className="text-gray-400 hover:text-primary-500 transition-colors text-sm">
                Terms & Conditions
              </Link>
              <Link href="/privacy" className="text-gray-400 hover:text-primary-500 transition-colors text-sm">
                Privacy Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
