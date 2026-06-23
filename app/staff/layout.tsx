'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Home, Bell, ShoppingCart, UserCircle, Search } from 'lucide-react';
import { useCartStore } from '@/store/cartStore';
import { useSessionStore } from '@/store/sessionStore';
import { motion } from 'framer-motion';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const tabs = [
  { href: '/staff/home', icon: Home, label: 'Home' },
  { href: '/staff/cart', icon: ShoppingCart, label: 'Cart' },
  /* QUOTA OPTIMIZATION: Notifications removed entirely for staff */
  { href: '/staff/profile', icon: UserCircle, label: 'Profile' },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const count = items.reduce((sum, i) => sum + i.qty, 0);
  const { user, branch, _hasHydrated } = useSessionStore();
  const [mounted, setMounted] = useState(false);

  const isLogin = pathname.includes('/login');
  const isSelectBranch = pathname.includes('/select-branch');
  const hideBar = isLogin || isSelectBranch;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!_hasHydrated) return;

    if (!isLogin) {
      if (!user) {
        router.replace('/login');
      } else if (!isSelectBranch && !branch) {
        router.replace('/staff/select-branch');
      }
    }
  }, [user, branch, isLogin, isSelectBranch, router, _hasHydrated]);

  if (!mounted || !_hasHydrated) {
    return (
      <div className='auth-container'>
        <div
          className='spinner spinner-lg'
          style={{ color: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (!isLogin && !user) {
    return (
      <div className='auth-container'>
        <div
          className='spinner spinner-lg'
          style={{ color: 'var(--accent)' }}
        />
      </div>
    );
  }

  if (!isLogin && !isSelectBranch && !branch) {
    return (
      <div className='auth-container'>
        <div
          className='spinner spinner-lg'
          style={{ color: 'var(--accent)' }}
        />
      </div>
    );
  }

  return (
    <div className='page-wrapper'>
      {/* Top bar */}
      {!hideBar && (
        <motion.div
          className='top-bar'
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}>
          <div>
            <h4
              style={{ fontSize: '1.2rem', lineHeight: 1 }}
              className='gradient-text'>
              Skincare Bestie
            </h4>
            <p style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              {branch?.branchName ?
                branch.branchName.charAt(0).toUpperCase() +
                branch.branchName.slice(1) +
                ' branch'
              : 'No branch'}
            </p>
          </div>
        </motion.div>
      )}

      <div
        style={{
          width: '100%',
        }}>
        {children}
      </div>

      {/* Bottom Tab Bar */}
      {!hideBar && (
        <nav className='tab-bar' style={{maxWidth:'400px'}}>
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`tab-item ${active ? 'active' : ''}`}>
                <Icon size={22} />
                {tab.label}
                {tab.label === 'Cart' && count > 0 && (
                  <span className='tab-badge'>{count}</span>
                )}
              </Link>
            );
          })}
        </nav>
      )}
    </div>
  );
}
