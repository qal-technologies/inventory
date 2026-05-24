import type { Metadata } from 'next';
import './globals.css';
import Providers from './providers';

export const metadata: Metadata = {
  title: 'Skincare Bestie — Inventory & Sales',
  description: 'Multi-branch inventory, sales, and profit tracking platform for Skincare Bestie',
  creator: 'Paschal Ngaoka',
  classification: 'Sales',
  icons:'/favicon.png'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
