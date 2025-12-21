'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, Button, Steps, Spin, Empty, Divider, Tag } from 'antd';
import {
  CheckCircleOutlined,
  ShoppingOutlined,
  HomeOutlined,
  PrinterOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';

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
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Empty description="Order not found" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Success Banner */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircleOutlined className="text-4xl text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Order Placed Successfully!</h1>
        <p className="text-gray-500">
          Thank you for your order. We've sent a confirmation to your email.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Order Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-semibold">Order #{order.order_number}</h2>
                <p className="text-gray-500 text-sm">
                  Placed on {new Date(order.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <Tag color={order.payment_status === 'paid' ? 'green' : 'orange'}>
                {order.payment_status === 'paid' ? 'PAID' : 'PAYMENT PENDING'}
              </Tag>
            </div>

            <Steps
              current={0}
              items={[
                { title: 'Order Placed', icon: <CheckCircleOutlined /> },
                { title: 'Processing' },
                { title: 'Shipped' },
                { title: 'Delivered' },
              ]}
            />
          </Card>

          {/* Items */}
          <Card title="Order Items">
            <div className="space-y-4">
              {order.items?.map((item, index) => (
                <div key={index} className="flex gap-4 pb-4 border-b last:border-0">
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <ShoppingOutlined />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium">{item.product_name}</h4>
                    <p className="text-sm text-gray-500">{item.variant_name}</p>
                    <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{(item.quantity * item.unit_price).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment Info */}
          {order.payment_method === 'bank_transfer' && order.payment_status !== 'paid' && (
            <Card title="Bank Transfer Details">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600 mb-3">
                  Please transfer the amount to the following bank account:
                </p>
                <div className="space-y-2 text-sm">
                  <p><strong>Bank:</strong> State Bank of India</p>
                  <p><strong>Account Name:</strong> Saha Traders</p>
                  <p><strong>Account Number:</strong> 1234567890</p>
                  <p><strong>IFSC Code:</strong> SBIN0001234</p>
                  <p><strong>Amount:</strong> ₹{order.total_amount.toLocaleString()}</p>
                </div>
                <p className="text-sm text-gray-500 mt-3">
                  Please use order number <strong>{order.order_number}</strong> as payment reference.
                </p>
              </div>
            </Card>
          )}
        </div>

        {/* Summary Sidebar */}
        <div className="space-y-6">
          <Card title="Order Summary">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{order.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tax</span>
                <span>₹{order.tax_amount?.toLocaleString()}</span>
              </div>
              {order.discount_amount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{order.discount_amount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>{order.shipping_charge === 0 ? 'FREE' : `₹${order.shipping_charge}`}</span>
              </div>
              <Divider className="my-2" />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">₹{order.total_amount?.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          <Card title="Shipping Address">
            <div className="flex gap-2">
              <HomeOutlined className="text-gray-400 mt-1" />
              <div>
                <p className="font-medium">{order.customer_name}</p>
                <p className="text-gray-600 text-sm">{order.shipping_address}</p>
                <p className="text-gray-600 text-sm">{order.customer_phone}</p>
              </div>
            </div>
          </Card>

          <Card title="Payment Method">
            <p className="capitalize">
              {order.payment_method === 'cod' ? 'Cash on Delivery' :
               order.payment_method === 'online' ? 'Online Payment' :
               order.payment_method === 'bank_transfer' ? 'Bank Transfer' :
               order.payment_method}
            </p>
          </Card>

          <div className="space-y-3">
            <Link href={`/track-order?order=${order.order_number}`}>
              <Button type="primary" block size="large">
                Track Order
              </Button>
            </Link>

            <Link href="/products">
              <Button block size="large">
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
