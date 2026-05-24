'use client';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, Package, UserCircle, Receipt } from 'lucide-react';
import { motion } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

const navItems = [
  { href: '/admin/home', icon: LayoutDashboard, label: 'Home' },
  { href: '/admin/inventory', icon: Package, label: 'Inventory' },
  { href: '/admin/history', icon: Receipt, label: 'Sales' },
  { href: '/admin/profile', icon: UserCircle, label: 'Admin' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, _hasHydrated } = useSessionStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!_hasHydrated) return;

    if (!user) {
      router.replace('/login');
    } else if (user.role !== 'admin') {
      router.replace('/staff/home');
    }
  }, [user, router, _hasHydrated]);

  if (!mounted || !_hasHydrated || !user || user.role !== 'admin') {
    return (
      <div className="auth-container">
        <div className="spinner spinner-lg" style={{ color: 'var(--accent)' }} />
      </div>
    );
  }

  return (
    <div className="admin-shell">
      {/* Sidebar (desktop) */}
      <aside className="admin-sidebar">
        <div style={{ padding: '0 20px 24px' }}>
          <h3 className="gradient-text" style={{ fontSize: '1.125rem' }}>Skincare Bestie</h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admin Panel</p>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={`sidebar-item ${active ? 'active' : ''}`}>
                <Icon size={19} /> {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main content */}
      <main className="admin-main">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
          {children}
        </motion.div>
      </main>

      {/* Bottom tab bar (mobile) */}
      <nav className="tab-bar" style={{ display: 'flex' }}>
        {navItems.slice(0, 5).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={`tab-item ${active ? 'active' : ''}`}>
              <Icon size={20} /> {item.label}
            </Link>
          );
        })}
      </nav>

      <style>{`
        @media (min-width: 768px) {
          .admin-shell > .tab-bar { display: none !important; }
        }
      `}</style>
    </div>
  );
}
