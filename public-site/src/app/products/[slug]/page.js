'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SafeImage from '@/components/common/SafeImage';
import { Card, Button, Tag, Select, InputNumber, Breadcrumb, Tabs, Spin, Empty } from 'antd';
import { HomeOutlined, ShoppingCartOutlined, ShoppingOutlined, CheckCircleOutlined } from '@ant-design/icons';
import toast from 'react-hot-toast';
import { getProductBySlug, getProducts } from '@/lib/api';
import { getImageUrl, getPriceRange, isInStock } from '@/lib/utils';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/context/AuthContext';

const PLACEHOLDER_IMAGE = '/images/placeholder-product.svg';

export default function ProductDetailPage({ params }) {
  const { slug } = params;
  const router = useRouter();
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

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

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }
    setAddingToCart(true);
    await addToCart(selectedVariant.id, quantity);
    setAddingToCart(false);
  };

  const handleBuyNow = async () => {
    if (!isAuthenticated) {
      router.push(`/login?redirect=/products/${slug}`);
      return;
    }
    if (!selectedVariant) {
      toast.error('Please select a variant');
      return;
    }
    setAddingToCart(true);
    const result = await addToCart(selectedVariant.id, quantity);
    setAddingToCart(false);
    if (result.success) {
      router.push('/checkout');
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

  const productImage = product.images?.[0]?.url || product.image;
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
              <SafeImage
                src={getImageUrl(productImage, PLACEHOLDER_IMAGE)}
                fallback={PLACEHOLDER_IMAGE}
                alt={product.name}
                fill
                className="object-contain p-4"
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
                  icon={<ShoppingCartOutlined />}
                  onClick={handleAddToCart}
                  disabled={!inStock}
                  loading={addingToCart}
                  className="h-12 px-8"
                >
                  Add to Cart
                </Button>
                <Button
                  size="large"
                  icon={<ShoppingOutlined />}
                  onClick={handleBuyNow}
                  disabled={!inStock}
                  className="h-12 px-8"
                >
                  Buy Now
                </Button>
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
                const itemImage = item.images?.[0]?.url || item.image;

                return (
                  <Link key={item.id} href={`/products/${item.slug}`}>
                    <Card
                      className="product-card cursor-pointer"
                      cover={
                        <div className="bg-gray-100 h-36 flex items-center justify-center relative">
                          <SafeImage
                            src={getImageUrl(itemImage, PLACEHOLDER_IMAGE)}
                            fallback={PLACEHOLDER_IMAGE}
                            alt={item.name}
                            fill
                            className="object-cover"
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

    </div>
  );
}
