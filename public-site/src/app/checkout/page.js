'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Card,
  Button,
  Form,
  Input,
  Radio,
  Divider,
  Steps,
  Spin,
  Empty,
  message,
} from 'antd';
import {
  UserOutlined,
  HomeOutlined,
  CreditCardOutlined,
  CheckCircleOutlined,
  ArrowLeftOutlined,
} from '@ant-design/icons';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import toast from 'react-hot-toast';

const { TextArea } = Input;

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, coupon, getCartSummary, clearCart } = useCart();
  const { customer, isAuthenticated } = useAuth();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState('cod');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }

    loadSummary();

    // Pre-fill form with customer data
    if (customer) {
      form.setFieldsValue({
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        shipping_address: customer.address,
      });
    }
  }, [isAuthenticated, customer]);

  const loadSummary = async () => {
    const data = await getCartSummary();
    if (data) {
      setSummary(data);
    }
  };

  const loadRazorpay = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async (orderData) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Failed to load payment gateway');
      return;
    }

    const options = {
      key: orderData.razorpay.key,
      amount: orderData.razorpay.amount,
      currency: orderData.razorpay.currency,
      name: 'Saha Traders',
      description: `Order ${orderData.order_number}`,
      order_id: orderData.razorpay.order_id,
      handler: async (response) => {
        try {
          await api.post('/checkout/verify-payment', {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          await clearCart();
          router.push(`/order-confirmation/${orderData.order_number}`);
        } catch (error) {
          toast.error('Payment verification failed');
        }
      },
      prefill: {
        name: form.getFieldValue('customer_name'),
        email: form.getFieldValue('customer_email'),
        contact: form.getFieldValue('customer_phone'),
      },
      theme: {
        color: '#ed751a',
      },
    };

    const paymentObject = new window.Razorpay(options);
    paymentObject.open();
  };

  const handleSubmit = async (values) => {
    setLoading(true);

    try {
      const response = await api.post('/checkout/create-order', {
        ...values,
        payment_method: paymentMethod,
      });

      if (paymentMethod === 'online' && response.data.razorpay) {
        await handlePayment(response.data);
      } else {
        await clearCart();
        router.push(`/order-confirmation/${response.data.order_number}`);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Failed to place order';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (cart.items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-12">
        <Empty
          description={
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
              <Link href="/products">
                <Button type="primary">Continue Shopping</Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/cart">
          <Button icon={<ArrowLeftOutlined />}>Back to Cart</Button>
        </Link>
        <h1 className="text-2xl font-bold">Checkout</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            {/* Contact Information */}
            <Card title="Contact Information" className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Form.Item
                  name="customer_name"
                  label="Full Name"
                  rules={[{ required: true, message: 'Please enter your name' }]}
                >
                  <Input prefix={<UserOutlined />} placeholder="Full Name" />
                </Form.Item>

                <Form.Item
                  name="customer_phone"
                  label="Phone Number"
                  rules={[{ required: true, message: 'Please enter your phone' }]}
                >
                  <Input placeholder="Phone Number" />
                </Form.Item>

                <Form.Item
                  name="customer_email"
                  label="Email (Optional)"
                  className="md:col-span-2"
                >
                  <Input placeholder="Email Address" />
                </Form.Item>
              </div>
            </Card>

            {/* Shipping Address */}
            <Card title="Shipping Address" className="mb-6">
              <Form.Item
                name="shipping_address"
                label="Complete Address"
                rules={[{ required: true, message: 'Please enter shipping address' }]}
              >
                <TextArea
                  rows={3}
                  placeholder="House/Flat No., Street, Area, City, State - Pincode"
                />
              </Form.Item>

              <Form.Item name="notes" label="Order Notes (Optional)">
                <TextArea rows={2} placeholder="Any special instructions for delivery..." />
              </Form.Item>
            </Card>

            {/* Payment Method */}
            <Card title="Payment Method" className="mb-6">
              <Radio.Group
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full"
              >
                <div className="space-y-3">
                  <Radio value="cod" className="w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        💵
                      </div>
                      <div>
                        <p className="font-medium">Cash on Delivery</p>
                        <p className="text-sm text-gray-500">Pay when you receive</p>
                      </div>
                    </div>
                  </Radio>

                  <Radio value="online" className="w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <CreditCardOutlined />
                      </div>
                      <div>
                        <p className="font-medium">Pay Online</p>
                        <p className="text-sm text-gray-500">Cards, UPI, Net Banking</p>
                      </div>
                    </div>
                  </Radio>

                  <Radio value="bank_transfer" className="w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        🏦
                      </div>
                      <div>
                        <p className="font-medium">Bank Transfer</p>
                        <p className="text-sm text-gray-500">Direct bank transfer</p>
                      </div>
                    </div>
                  </Radio>
                </div>
              </Radio.Group>
            </Card>

            <Button
              type="primary"
              size="large"
              htmlType="submit"
              block
              loading={loading}
            >
              {paymentMethod === 'online' ? 'Pay Now' : 'Place Order'}
            </Button>
          </Form>
        </div>

        {/* Order Summary */}
        <div>
          <Card title="Order Summary" className="sticky top-4">
            {/* Items */}
            <div className="space-y-3 mb-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {item.product_name} × {item.quantity}
                  </span>
                  <span>₹{item.item_total.toLocaleString()}</span>
                </div>
              ))}
            </div>

            <Divider className="my-3" />

            {/* Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{summary?.subtotal?.toLocaleString() || cart.subtotal.toLocaleString()}</span>
              </div>

              {summary?.tax > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Tax (GST)</span>
                  <span>₹{summary.tax.toLocaleString()}</span>
                </div>
              )}

              {summary?.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{summary.discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>
                  {summary?.shipping === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `₹${summary?.shipping || 50}`
                  )}
                </span>
              </div>

              <Divider className="my-3" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">
                  ₹{summary?.total?.toLocaleString() || cart.subtotal.toLocaleString()}
                </span>
              </div>
            </div>

            {coupon && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg">
                <p className="text-green-600 text-sm">
                  Coupon <strong>{coupon.code}</strong> applied
                </p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
