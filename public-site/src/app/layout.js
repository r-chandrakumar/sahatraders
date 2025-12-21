import { Inter } from 'next/font/google';
import { ConfigProvider } from 'antd';
import { Toaster } from 'react-hot-toast';
import LayoutWrapper from '@/components/layout/LayoutWrapper';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Saha Traders - Premium Spices & Grocery',
  description: 'Your trusted partner for quality spices, oils, grains and more. Order enquiries welcome.',
};

const theme = {
  token: {
    colorPrimary: '#08cd57',
    colorSuccess: '#08cd57',
    borderRadius: 8,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <ConfigProvider theme={theme}>
          <AuthProvider>
            <CartProvider>
              <LayoutWrapper>
                {children}
              </LayoutWrapper>
              <Toaster position="top-right" />
            </CartProvider>
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
