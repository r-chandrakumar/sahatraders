'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Spin, Empty, Divider, Tag } from 'antd';
import {
  CheckCircleOutlined,
  HomeOutlined,
  PhoneOutlined,
  MailOutlined,
  ShoppingOutlined,
  EnvironmentOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';
import { getImageUrl } from '@/lib/utils';

export default function OrderConfirmationPage() {
  const params = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrder();
  }, [params.orderNumber]);

  const fetchOrder = async () => {
    try {
      const response = await api.get(`/checkout/confirmation/${params.orderNumber}`);
      setOrder(response.data);
    } catch (error) {
      console.error('Fetch order error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Empty description="Order not found" />
      </div>
    );
  }

  const paymentMethodLabel = {
    cod: 'Cash on Delivery',
    online: 'Online Payment',
    bank_transfer: 'Bank Transfer',
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Success Header */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 text-white">
        <div className="max-w-3xl mx-auto px-4 py-10 text-center">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleOutlined className="text-3xl text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Order Placed Successfully!</h1>
          <p className="text-white/80 text-sm md:text-base">
            Your order <span className="font-semibold text-white">{order.order_number}</span> has been confirmed
          </p>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 -mt-6">
        {/* Order Info Card */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
          <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Order Number</p>
              <p className="text-lg font-bold text-gray-900">{order.order_number}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Order Date</p>
              <p className="text-sm text-gray-700">
                {new Date(order.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Tag color={order.payment_status === 'paid' ? 'green' : 'orange'}>
              {order.payment_status === 'paid' ? 'PAID' : 'PAYMENT PENDING'}
            </Tag>
            <Tag color="blue">
              {paymentMethodLabel[order.payment_method] || order.payment_method}
            </Tag>
            <Tag color="cyan">
              {order.status?.toUpperCase()}
            </Tag>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm border p-5 mb-4">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            <ShoppingOutlined className="mr-2" />Items ({order.items?.length || 0})
          </h3>
          <div className="divide-y">
            {order.items?.map((item, index) => (
              <div key={index} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <img
                    src={getImageUrl(item.image)}
                    alt={item.product_name}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.src = '/images/placeholder-product.svg'; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{item.product_name}</p>
                  <p className="text-xs text-gray-500">{item.variant_name} &times; {item.quantity}</p>
                </div>
                <p className="font-semibold text-sm text-gray-900 flex-shrink-0">
                  ₹{(item.quantity * item.unit_price).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Price Summary */}
          <div className="mt-4 pt-4 border-t space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>₹{order.subtotal?.toLocaleString()}</span>
            </div>
            {order.tax_amount > 0 && (
              <div className="flex justify-between text-gray-500">
                <span>Tax</span>
                <span>₹{order.tax_amount?.toLocaleString()}</span>
              </div>
            )}
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-₹{order.discount_amount.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-gray-500">
              <span>Shipping</span>
              <span>{order.shipping_amount === 0 ? 'FREE' : `₹${order.shipping_amount}`}</span>
            </div>
            <Divider className="!my-2" />
            <div className="flex justify-between text-lg font-bold text-gray-900">
              <span>Total</span>
              <span className="text-primary-600">₹{order.total_amount?.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Info */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              <EnvironmentOutlined className="mr-2" />Shipping Address
            </h3>
            <p className="font-medium text-gray-900 text-sm">{order.customer_name}</p>
            <p className="text-sm text-gray-600 mt-1">{order.shipping_address}</p>
            {order.customer_phone && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <PhoneOutlined /> {order.customer_phone}
              </p>
            )}
            {order.customer_email && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <MailOutlined /> {order.customer_email}
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-5">
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              Payment
            </h3>
            <p className="font-medium text-gray-900 text-sm">
              {paymentMethodLabel[order.payment_method] || order.payment_method}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Status: {order.payment_status === 'paid' ? 'Paid' : 'Pending'}
            </p>
          </div>
        </div>

        {/* Bank Transfer Details */}
        {order.payment_method === 'bank_transfer' && order.payment_status !== 'paid' && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
            <h3 className="text-sm font-semibold text-blue-800 mb-3">Bank Transfer Details</h3>
            <div className="space-y-1.5 text-sm text-blue-900">
              <p><span className="text-blue-600">Bank:</span> State Bank of India</p>
              <p><span className="text-blue-600">Account Name:</span> Saha Traders</p>
              <p><span className="text-blue-600">Account Number:</span> 1234567890</p>
              <p><span className="text-blue-600">IFSC Code:</span> SBIN0001234</p>
              <p><span className="text-blue-600">Amount:</span> ₹{order.total_amount?.toLocaleString()}</p>
            </div>
            <p className="text-xs text-blue-600 mt-3">
              Use <strong>{order.order_number}</strong> as payment reference.
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pb-8">
          <Link href={`/track-order?order=${order.order_number}`} className="flex-1">
            <button className="w-full bg-primary-600 hover:bg-primary-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
              Track Order
            </button>
          </Link>
          <Link href="/products" className="flex-1">
            <button className="w-full bg-white hover:bg-gray-50 text-gray-700 font-medium py-3 px-6 rounded-lg border transition-colors">
              Continue Shopping
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
