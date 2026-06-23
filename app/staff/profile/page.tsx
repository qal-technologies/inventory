'use client';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { useCartStore } from '@/store/cartStore';
import { useSales } from '@/lib/hooks/useSales';
import { motion } from 'framer-motion';
import {
  User,
  MapPin,
  LogOut,
  ShoppingBag,
  TrendingUp,
  Calendar,
  RefreshCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';

export default function StaffProfilePage() {
  const router = useRouter();
  const { user, branchId, branchName, clearSession } = useSessionStore();
  const clearCart = useCartStore((s) => s.clearCart);
  const { data: sales } = useSales(branchId || undefined);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const today = new Date().toDateString();
  const todaySales =
    sales?.sales?.filter((s: any) => new Date(s.createdAt).toDateString() === today) || [];
  const todayRevenue = todaySales.reduce((sum: any, s: any) => sum + s.total, 0);
  const allBranchSales = sales?.stats?.count ?? 0;

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch('/api/auth/logout', { method: 'POST' });
      clearSession();
      clearCart();
      router.push('/login');
      toast.success('Logged out');
    } catch {
      toast.error('Logout failed');
    }
  };

  return (
    <motion.div
      style={{ padding: '16px 16px 80px' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}>
      <h2 style={{ marginBottom: 20 }}>My Profile</h2>

      {/* User info card */}
      <div
        className='glass'
        style={{ padding: 24, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            marginBottom: 16,
          }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 'var(--radius-full)',
              background:
                'linear-gradient(135deg, var(--pink-300), var(--pink-500))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <User
              size={24}
              color='#fff'
            />
          </div>
          <div>
            <p style={{ fontWeight: 700, fontSize: '1.0625rem' }}>
              {user?.name || 'Staff'}
            </p>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {user?.email}
            </p>
          </div>
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
          }}>
          <MapPin size={16} />
          <span>{branchName || 'No branch selected'}</span>
          <span
            className='badge badge-pink'
            style={{ marginLeft: 'auto' }}>
            {user?.role}
          </span>
        </div>

        <button
          className='btn btn-ghost'
          style={{
            marginTop: 16,
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            color: 'var(--accent-deep)',
            border: '1px solid var(--accent-deep)',
          }}
          onClick={() => router.push('/staff/select-branch')}
        >
          <RefreshCcw size={16} />
          {branchId ? 'Change Branch' : 'Select Branch'}
        </button>
      </div>

      {/* Logout */}
      <motion.button
        className='btn btn-danger'
        style={{
          width: '100%',
          maxWidth: 300,
          justifySelf: 'center',
          display: 'flex',
        }}
        onClick={handleLogout}
        whileTap={{ scale: 0.97 }}>
        <LogOut size={18} /> Sign Out
      </motion.button>
    </motion.div>
  );
}
