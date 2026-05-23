'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';

export default function RootPage() {
  const router = useRouter();
  const { user } = useSessionStore();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/admin/home');
    } else {
      router.replace('/staff/home');
    }
  }, [user, router]);

  return (
    <div className="auth-container">
      <div className="spinner spinner-lg" style={{ color: 'var(--accent)' }} />
    </div>
  );
}
