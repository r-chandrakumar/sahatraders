import { Inter } from 'next/font/google';
import { ConfigProvider } from 'antd';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Sahaa Traders Admin',
  description: 'Admin dashboard for Sahaa Traders e-commerce',
};

const theme = {
  token: {
    colorPrimary: '#2563eb',
    borderRadius: 6,
    fontFamily: 'Inter, system-ui, sans-serif',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <body className={`${inter.className} h-full`} suppressHydrationWarning>
        <ConfigProvider theme={theme}>
          <AuthProvider>
            {children}
            <Toaster position="top-right" />
          </AuthProvider>
        </ConfigProvider>
      </body>
    </html>
  );
}
