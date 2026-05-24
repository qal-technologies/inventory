import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Skincare Bestie — Inventory & Sales',
  description: 'Multi-branch inventory, sales, and profit tracking for Skincare Bestie',
  creator: 'Paschal Ngaoka',
  keywords: ['inventory', 'sales', 'skincare', 'pos', 'stock management'],
  classification: 'Business',
  icons: {
    icon: '/images/logo.png',
    apple: '/images/logo.png',
    shortcut: '/images/logo.png',
  },
  openGraph: {
    title: 'Skincare Bestie — Inventory & Sales',
    description: 'Multi-branch inventory, sales, and profit tracking for Skincare Bestie',
    type: 'website',
    images: [{ url: '/images/logo.png', width: 512, height: 512, alt: 'Skincare Bestie' }],
  },
  twitter: {
    card: 'summary',
    title: 'Skincare Bestie — Inventory & Sales',
    description: 'Multi-branch inventory, sales, and profit tracking for Skincare Bestie',
    images: ['/images/logo.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/images/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/images/logo.png" />
        <meta name="theme-color" content="#f472b6" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
