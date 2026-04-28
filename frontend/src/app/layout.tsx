import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { PwaInit } from '@/components/PwaInit';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Elemental Pro - Help Desk',
  description: 'Sistema de Gestión de Tickets Técnicos - Elemental Pro',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'EP Help Desk',
  },
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#2563eb',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <PwaInit />
      </body>
    </html>
  );
}
