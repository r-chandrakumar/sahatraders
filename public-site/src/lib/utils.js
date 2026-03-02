// Get image URL with fallback to placeholder
export const getImageUrl = (imagePath, placeholder = '/images/placeholder-product.svg') => {
  if (!imagePath) return placeholder;

  // If it's already a full URL
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }

  // If it's an API uploaded image
  const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'https://api.sahatraders.in/api').replace(/\/api$/, '');
  if (imagePath.startsWith('/uploads/')) {
    return `${API_URL}${imagePath}`;
  }

  return imagePath || placeholder;
};

// Get category icon based on name
export const getCategoryIcon = (categoryName) => {
  const icons = {
    'spices': '/images/icons/spices.png',
    'oils': '/images/icons/oils.png',
    'grains': '/images/icons/grains.png',
    'pulses': '/images/icons/pulses.png',
    'dry fruits': '/images/icons/dry-fruits.png',
    'masala': '/images/icons/masala.png',
    'flours': '/images/icons/flours.png',
  };

  const name = categoryName?.toLowerCase() || '';
  for (const [key, icon] of Object.entries(icons)) {
    if (name.includes(key)) return icon;
  }

  return '/images/icons/default-category.png';
};

// Format price range from variants
export const getPriceRange = (variants) => {
  if (!variants || variants.length === 0) return { min: 0, max: 0 };

  const prices = variants.map(v => v.sell_price || v.price || 0);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
};

// Check if product is in stock
export const isInStock = (variants) => {
  if (!variants || variants.length === 0) return true; // Assume in stock if no variants (for products without stock tracking)
  return variants.some(v => v.stock_qty > 0);
};
