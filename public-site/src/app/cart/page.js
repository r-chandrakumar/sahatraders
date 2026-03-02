'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, Button, InputNumber, Empty, Spin, Input, Tag, Divider } from 'antd';
import {
  DeleteOutlined,
  ShoppingOutlined,
  ArrowLeftOutlined,
  TagOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';
import SafeImage from '@/components/common/SafeImage';
import { getImageUrl } from '@/lib/utils';

export default function CartPage() {
  const {
    cart,
    loading,
    coupon,
    updateQuantity,
    removeItem,
    applyCoupon,
    removeCoupon,
  } = useCart();
  const { isAuthenticated } = useAuth();
  const router = useRouter();
  const [couponCode, setCouponCode] = useState('');
  const [applyingCoupon, setApplyingCoupon] = useState(false);

  const handleQuantityChange = async (itemId, value) => {
    if (value === 0) {
      await removeItem(itemId);
    } else {
      await updateQuantity(itemId, value);
    }
  };

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    await applyCoupon(couponCode);
    setApplyingCoupon(false);
    setCouponCode('');
  };

  const handleCheckout = () => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
    } else {
      router.push('/checkout');
    }
  };

  if (loading) {
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
          image={<ShoppingOutlined style={{ fontSize: 80, color: '#ccc' }} />}
          description={
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-700 mb-2">Your cart is empty</h2>
              <p className="text-gray-500 mb-6">Looks like you haven't added anything to your cart yet.</p>
              <Link href="/products">
                <Button type="primary" size="large">
                  Start Shopping
                </Button>
              </Link>
            </div>
          }
        />
      </div>
    );
  }

  // Calculate totals
  const discount = coupon ? (coupon.discount_type === 'percentage'
    ? Math.min((cart.subtotal * coupon.discount_value) / 100, coupon.max_discount || Infinity)
    : coupon.discount_value) : 0;

  const shipping = cart.subtotal >= 1000 ? 0 : 50;
  const total = cart.subtotal - discount + shipping;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/products">
          <Button icon={<ArrowLeftOutlined />}>Continue Shopping</Button>
        </Link>
        <h1 className="text-2xl font-bold">Shopping Cart ({cart.total_items} items)</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {cart.items.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="flex gap-4">
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  <SafeImage
                    src={getImageUrl(item.image)}
                    alt={item.product_name}
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1">
                  <Link href={`/products/${item.slug}`}>
                    <h3 className="font-semibold text-gray-900 hover:text-primary">
                      {item.product_name}
                    </h3>
                  </Link>
                  <p className="text-gray-500 text-sm">{item.variant_name}</p>
                  <p className="text-primary font-semibold mt-1">₹{(item.sell_price || 0).toLocaleString()}</p>

                  {!item.in_stock && (
                    <Tag color="red" className="mt-1">Out of Stock</Tag>
                  )}
                </div>

                <div className="flex flex-col items-end justify-between">
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => removeItem(item.id)}
                  />

                  <div className="flex items-center gap-2">
                    <InputNumber
                      min={1}
                      max={item.stock_quantity}
                      value={item.quantity}
                      onChange={(value) => handleQuantityChange(item.id, value)}
                      disabled={!item.in_stock}
                    />
                  </div>

                  <p className="font-bold text-lg">
                    ₹{item.item_total.toLocaleString()}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card title="Order Summary">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>₹{cart.subtotal.toLocaleString()}</span>
              </div>

              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>-₹{discount.toLocaleString()}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-500">Shipping</span>
                <span>{shipping === 0 ? <Tag color="green">FREE</Tag> : `₹${shipping}`}</span>
              </div>

              {cart.subtotal < 1000 && (
                <p className="text-sm text-gray-500">
                  Add ₹{(1000 - cart.subtotal).toLocaleString()} more for free shipping
                </p>
              )}

              <Divider className="my-3" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">₹{total.toLocaleString()}</span>
              </div>
            </div>
          </Card>

          {/* Coupon */}
          <Card title="Apply Coupon">
            {coupon ? (
              <div className="flex items-center justify-between bg-green-50 p-3 rounded-lg">
                <div>
                  <Tag color="green">{coupon.code}</Tag>
                  <span className="text-green-600 ml-2">
                    {coupon.discount_type === 'percentage'
                      ? `${coupon.discount_value}% off`
                      : `₹${coupon.discount_value} off`}
                  </span>
                </div>
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  onClick={removeCoupon}
                />
              </div>
            ) : (
              <div className="flex gap-2">
                <Input
                  placeholder="Enter coupon code"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  prefix={<TagOutlined />}
                />
                <Button
                  type="primary"
                  onClick={handleApplyCoupon}
                  loading={applyingCoupon}
                >
                  Apply
                </Button>
              </div>
            )}
          </Card>

          {/* Checkout Button */}
          <Button
            type="primary"
            size="large"
            block
            onClick={handleCheckout}
            disabled={cart.items.some(item => !item.in_stock)}
          >
            Proceed to Checkout
          </Button>

          {!isAuthenticated && (
            <p className="text-center text-sm text-gray-500">
              <Link href="/login?redirect=/cart" className="text-primary">Sign in</Link> for a faster checkout
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
