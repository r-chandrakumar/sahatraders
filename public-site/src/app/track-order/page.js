'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, Input, Button, Steps, Spin, Empty, Divider, Tag } from 'antd';
import {
  SearchOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CarOutlined,
  HomeOutlined,
  ShoppingOutlined,
} from '@ant-design/icons';
import api from '@/lib/api';

export default function TrackOrderPage() {
  const searchParams = useSearchParams();
  const initialOrder = searchParams.get('order') || '';

  const [orderNumber, setOrderNumber] = useState(initialOrder);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleTrack = async () => {
    if (!orderNumber.trim()) return;

    setLoading(true);
    setSearched(true);

    try {
      const response = await api.get(`/customer/track/${orderNumber.trim()}`);
      setOrder(response.data);
    } catch (error) {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const getStatusStep = (status) => {
    switch (status) {
      case 'pending': return 0;
      case 'confirmed': return 1;
      case 'processing': return 2;
      case 'shipped': return 3;
      case 'delivered': return 4;
      case 'cancelled': return -1;
      default: return 0;
    }
  };

  const statusColors = {
    pending: 'orange',
    confirmed: 'blue',
    processing: 'cyan',
    shipped: 'purple',
    delivered: 'green',
    cancelled: 'red',
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Track Your Order</h1>
          <p className="text-gray-500">Enter your order number to track its status</p>
        </div>

        {/* Search Box */}
        <Card className="mb-8">
          <div className="flex gap-4">
            <Input
              placeholder="Enter Order Number (e.g., SO-202512-0089)"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              onPressEnter={handleTrack}
              size="large"
              prefix={<SearchOutlined className="text-gray-400" />}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleTrack}
              loading={loading}
            >
              Track
            </Button>
          </div>
        </Card>

        {/* Results */}
        {loading && (
          <div className="text-center py-12">
            <Spin size="large" />
          </div>
        )}

        {!loading && searched && !order && (
          <Empty
            description={
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-700 mb-2">Order Not Found</h3>
                <p className="text-gray-500">
                  Please check the order number and try again.
                </p>
              </div>
            }
          />
        )}

        {!loading && order && (
          <div className="space-y-6">
            {/* Order Status */}
            <Card>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold">{order.order_number}</h2>
                  <p className="text-gray-500 text-sm">
                    Ordered on {new Date(order.created_at).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
                <Tag color={statusColors[order.status]} className="text-sm">
                  {order.status.toUpperCase()}
                </Tag>
              </div>

              {order.status !== 'cancelled' ? (
                <Steps
                  current={getStatusStep(order.status)}
                  items={[
                    {
                      title: 'Order Placed',
                      icon: <CheckCircleOutlined />,
                    },
                    {
                      title: 'Confirmed',
                      icon: <ClockCircleOutlined />,
                    },
                    {
                      title: 'Processing',
                      icon: <ShoppingOutlined />,
                    },
                    {
                      title: 'Shipped',
                      icon: <CarOutlined />,
                    },
                    {
                      title: 'Delivered',
                      icon: <HomeOutlined />,
                    },
                  ]}
                />
              ) : (
                <div className="bg-red-50 p-4 rounded-lg text-center">
                  <p className="text-red-600 font-medium">This order has been cancelled</p>
                </div>
              )}
            </Card>

            {/* Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <Card title="Order Timeline">
                <div className="space-y-4">
                  {order.timeline.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className={`w-3 h-3 rounded-full mt-1.5 ${
                        index === order.timeline.length - 1 ? 'bg-primary' : 'bg-gray-300'
                      }`} />
                      <div className="flex-1">
                        <p className="font-medium">{event.label}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(event.date).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Order Items */}
            <Card title="Order Items">
              <div className="space-y-3">
                {order.items?.map((item, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <p className="font-medium">{item.product_name}</p>
                      <p className="text-sm text-gray-500">{item.variant_name} × {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Shipping Info */}
            <Card title="Shipping Details">
              <div className="flex gap-2">
                <HomeOutlined className="text-gray-400 mt-1" />
                <div>
                  <p className="font-medium">{order.customer_name}</p>
                  <p className="text-gray-600 text-sm">{order.shipping_address}</p>
                </div>
              </div>
            </Card>

            {/* Payment Status */}
            <Card>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-gray-500">Order Total</p>
                  <p className="text-2xl font-bold text-primary">₹{order.total_amount?.toLocaleString()}</p>
                </div>
                <Tag color={order.payment_status === 'paid' ? 'green' : 'orange'}>
                  {order.payment_status === 'paid' ? 'PAID' : 'PAYMENT PENDING'}
                </Tag>
              </div>
            </Card>
          </div>
        )}

        {/* Help Section */}
        <Card className="mt-8 bg-gray-50">
          <div className="text-center">
            <h3 className="font-semibold mb-2">Need Help?</h3>
            <p className="text-gray-500 text-sm mb-4">
              If you have any questions about your order, please contact us.
            </p>
            <div className="flex justify-center gap-4">
              <a href="tel:+919876543210" className="text-primary">
                📞 +91 98765 43210
              </a>
              <a href="mailto:support@sahaatraders.com" className="text-primary">
                ✉️ support@sahaatraders.com
              </a>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
