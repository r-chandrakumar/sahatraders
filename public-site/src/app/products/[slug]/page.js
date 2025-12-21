'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, Button, Tag, Select, InputNumber, Breadcrumb, Tabs, Modal, Form, Input, Spin, Empty } from 'antd';
import { HomeOutlined, ShoppingOutlined, PhoneOutlined, CheckCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { getProductBySlug, getProducts, submitEnquiry } from '@/lib/api';
import { getImageUrl, getPriceRange, isInStock } from '@/lib/utils';

const { TextArea } = Input;

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x400/f3f4f6/9ca3af?text=Product';

export default function ProductDetailPage({ params }) {
  const { slug } = params;
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const response = await getProductBySlug(slug);
        const productData = response.data;
        setProduct(productData);

        if (productData?.variants?.length > 0) {
          setSelectedVariant(productData.variants[0]);
        }

        // Fetch related products from same category
        if (productData?.category_id) {
          const relatedRes = await getProducts({
            category_id: productData.category_id,
            limit: 4,
            is_active: true
          });
          const related = (relatedRes.data || []).filter(p => p.id !== productData.id).slice(0, 4);
          setRelatedProducts(related);
        }
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [slug]);

  const handleEnquirySubmit = async (values) => {
    try {
      setSubmitting(true);
      await submitEnquiry({
        ...values,
        product_id: product.id,
        product_name: product.name,
        variant_name: selectedVariant?.variant_name || selectedVariant?.name || '',
        quantity: quantity
      });
      toast.success('Enquiry submitted successfully! We will contact you soon.');
      setEnquiryModalOpen(false);
      form.resetFields();
    } catch (error) {
      console.error('Failed to submit enquiry:', error);
      toast.error('Failed to submit enquiry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Empty description="Product not found" />
      </div>
    );
  }

  const productImage = product.images?.[0]?.image_url || product.image;
  const inStock = selectedVariant ? (selectedVariant.stock_qty > 0 || selectedVariant.is_active !== false) : isInStock(product.variants);
  const discount = selectedVariant?.mrp && selectedVariant?.sell_price
    ? Math.round(((selectedVariant.mrp - selectedVariant.sell_price) / selectedVariant.mrp) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="container-custom py-4">
          <Breadcrumb
            items={[
              { href: '/', title: <><HomeOutlined /> Home</> },
              { href: '/products', title: 'Products' },
              { href: `/categories/${product.category_slug}`, title: product.category_name || 'Category' },
              { title: product.name }
            ]}
          />
        </div>
      </div>

      <div className="container-custom py-8">
        {/* Product Details */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="grid lg:grid-cols-2 gap-8 p-6 lg:p-8">
            {/* Product Image */}
            <div className="bg-gray-100 rounded-xl h-[400px] flex items-center justify-center relative">
              <Image
                src={getImageUrl(productImage, PLACEHOLDER_IMAGE)}
                alt={product.name}
                fill
                className="object-contain p-4"
                onError={(e) => {
                  e.target.src = PLACEHOLDER_IMAGE;
                }}
              />
            </div>

            {/* Product Info */}
            <div>
              <div className="mb-4">
                <Tag color="orange">{product.category_name || 'General'}</Tag>
                {discount > 0 && <Tag color="red">{discount}% OFF</Tag>}
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name}</h1>
              <p className="text-gray-500 mb-4">SKU: {selectedVariant?.sku || product.sku || 'N/A'}</p>

              {/* Price */}
              <div className="mb-6">
                <span className="text-3xl font-bold text-primary-600">
                  ₹{selectedVariant?.sell_price || selectedVariant?.price || 0}
                </span>
                {selectedVariant?.mrp && selectedVariant.mrp > selectedVariant.sell_price && (
                  <span className="text-xl text-gray-400 line-through ml-3">
                    ₹{selectedVariant.mrp}
                  </span>
                )}
                <p className="text-sm text-gray-500 mt-1">Inclusive of all taxes</p>
              </div>

              {/* Availability */}
              <div className="mb-6">
                {inStock ? (
                  <span className="inline-flex items-center text-green-600 font-medium">
                    <CheckCircleOutlined className="mr-2" /> In Stock
                    {selectedVariant?.stock_qty > 0 && ` (${selectedVariant.stock_qty} available)`}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">Out of Stock</span>
                )}
              </div>

              {/* Variant Selection */}
              {product.variants?.length > 0 && (
                <div className="mb-6">
                  <label className="form-label">Select Pack Size</label>
                  <div className="flex flex-wrap gap-2">
                    {product.variants.map((variant) => {
                      const variantInStock = variant.stock_qty > 0 || variant.is_active !== false;
                      return (
                        <Button
                          key={variant.id}
                          type={selectedVariant?.id === variant.id ? 'primary' : 'default'}
                          onClick={() => setSelectedVariant(variant)}
                          disabled={!variantInStock}
                        >
                          {variant.variant_name || variant.name} - ₹{variant.sell_price || variant.price}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div className="mb-6">
                <label className="form-label">Quantity</label>
                <InputNumber
                  min={1}
                  max={selectedVariant?.stock_qty || 99}
                  value={quantity}
                  onChange={setQuantity}
                  size="large"
                  className="w-32"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-4">
                <Button
                  type="primary"
                  size="large"
                  icon={<ShoppingOutlined />}
                  onClick={() => setEnquiryModalOpen(true)}
                  disabled={!inStock}
                  className="h-12 px-8"
                >
                  Enquire Now
                </Button>
                <a href="tel:+919876543210">
                  <Button size="large" icon={<PhoneOutlined />} className="h-12 px-8">
                    Call to Order
                  </Button>
                </a>
              </div>

              {/* Short description */}
              <p className="text-gray-600 mt-6">{product.description}</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-t">
            <Tabs
              defaultActiveKey="features"
              className="px-6 lg:px-8"
              items={[
                {
                  key: 'features',
                  label: 'Features',
                  children: (
                    <div className="py-6">
                      {product.features ? (
                        <ul className="space-y-2">
                          {(typeof product.features === 'string'
                            ? product.features.split('\n').filter(f => f.trim())
                            : product.features
                          ).map((feature, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <CheckCircleOutlined className="text-green-500 mt-1" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-500">No features listed for this product.</p>
                      )}
                    </div>
                  )
                },
                {
                  key: 'specifications',
                  label: 'Specifications',
                  children: (
                    <div className="py-6">
                      {product.specifications ? (
                        <table className="w-full max-w-lg">
                          <tbody>
                            {Object.entries(
                              typeof product.specifications === 'string'
                                ? JSON.parse(product.specifications)
                                : product.specifications
                            ).map(([key, value]) => (
                              <tr key={key} className="border-b">
                                <td className="py-3 font-medium text-gray-900 w-1/3">{key}</td>
                                <td className="py-3 text-gray-600">{value}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <p className="text-gray-500">No specifications available for this product.</p>
                      )}
                    </div>
                  )
                }
              ]}
            />
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Related Products</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((item) => {
                const itemPriceRange = getPriceRange(item.variants);
                const itemImage = item.images?.[0]?.image_url || item.image;

                return (
                  <Link key={item.id} href={`/products/${item.slug}`}>
                    <Card
                      className="product-card cursor-pointer"
                      cover={
                        <div className="bg-gray-100 h-36 flex items-center justify-center relative">
                          <Image
                            src={getImageUrl(itemImage, PLACEHOLDER_IMAGE)}
                            alt={item.name}
                            fill
                            className="object-cover"
                            onError={(e) => {
                              e.target.src = PLACEHOLDER_IMAGE;
                            }}
                          />
                        </div>
                      }
                      bodyStyle={{ padding: '12px' }}
                    >
                      <Tag color="orange" className="mb-2 text-xs">{item.category_name || 'General'}</Tag>
                      <h3 className="font-medium text-gray-900 line-clamp-1">{item.name}</h3>
                      <span className="text-primary-600 font-bold">₹{itemPriceRange.min}</span>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      <Modal
        title="Product Enquiry"
        open={enquiryModalOpen}
        onCancel={() => setEnquiryModalOpen(false)}
        footer={null}
        width={500}
      >
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 relative">
              <Image
                src={getImageUrl(productImage, PLACEHOLDER_IMAGE)}
                alt={product.name}
                fill
                className="object-cover rounded"
                onError={(e) => {
                  e.target.src = PLACEHOLDER_IMAGE;
                }}
              />
            </div>
            <div>
              <h4 className="font-semibold">{product.name}</h4>
              <p className="text-gray-500">{selectedVariant?.variant_name || selectedVariant?.name || 'Standard'} × {quantity}</p>
              <p className="text-primary-600 font-bold">
                ₹{(selectedVariant?.sell_price || selectedVariant?.price || 0) * quantity}
              </p>
            </div>
          </div>
        </div>

        <Form form={form} layout="vertical" onFinish={handleEnquirySubmit}>
          <Form.Item name="name" label="Your Name" rules={[{ required: true, message: 'Please enter your name' }]}>
            <Input placeholder="Enter your name" />
          </Form.Item>
          <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Please enter your phone number' }]}>
            <Input placeholder="Enter your phone number" />
          </Form.Item>
          <Form.Item name="email" label="Email (Optional)">
            <Input placeholder="Enter your email" />
          </Form.Item>
          <Form.Item name="message" label="Message (Optional)">
            <TextArea rows={3} placeholder="Any specific requirements?" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={submitting}>
              Submit Enquiry
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
