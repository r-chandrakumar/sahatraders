'use client';

import { useState, useEffect } from 'react';
import { Spin } from 'antd';
import Header from './Header';
import Footer from './Footer';

export default function LayoutWrapper({ children }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-full flex items-center justify-center bg-white">
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="min-h-full">
      <Header />
      <main>
        {children}
      </main>
      <Footer />
    </div>
  );
}
