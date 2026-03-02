'use client';

import { useState } from 'react';
import Image from 'next/image';

const DEFAULT_PLACEHOLDER = '/images/placeholder-product.svg';

export default function SafeImage({ src, fallback = DEFAULT_PLACEHOLDER, alt, ...props }) {
  const [imgSrc, setImgSrc] = useState(src || fallback);
  const [hasError, setHasError] = useState(false);

  return (
    <Image
      {...props}
      src={hasError ? fallback : (imgSrc || fallback)}
      alt={alt || ''}
      onError={() => {
        if (!hasError) {
          setHasError(true);
          setImgSrc(fallback);
        }
      }}
      unoptimized={hasError}
    />
  );
}
