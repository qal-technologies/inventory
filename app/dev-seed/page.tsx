'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { motion } from 'framer-motion';
import { UserPlus, Eye, EyeOff, ShieldCheck, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function DevSeedPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    admin: true,
  });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      return toast.error('Fill in all fields');
    }
    if (form.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    setLoading(true);
    try {
      // 1. Create account via seed-admin API
      const res = await fetch('/api/auth/seed-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to write admin record in Firestore');
      }

      toast.success(`${form.admin ? 'Admin' : 'Staff'} account created! 🚀`);
      router.push('/login');
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Seeding failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='auth-container'>
      <motion.div
        className='auth-card'
        style={{ maxWidth: 440 }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {/* Warning Banner */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(245,158,11,0.12)', border: '1px solid var(--warning)',
          borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 24,
          fontSize: '0.8125rem', color: 'var(--warning)', fontWeight: 600,
        }}>
          <AlertTriangle size={16} />
          Dev-only tool — remove before going fully public
        </div>

        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--pink-300), var(--pink-500))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, boxShadow: 'var(--shadow-pink)',
            }}
          >
            <ShieldCheck size={28} color="#fff" />
          </motion.div>
          <h1 style={{ fontSize: '1.35rem', marginBottom: 4 }}>Create Account</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Seed an admin or staff user into the system
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className='form-group'>
            <label className='form-label'>Full Name</label>
            <input
              className='input-base'
              placeholder='e.g. Jane Doe'
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div className='form-group'>
            <label className='form-label'>Email</label>
            <input
              type='email'
              className='input-base'
              placeholder='user@example.com'
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              autoComplete='email'
            />
          </div>

          <div className='form-group'>
            <label className='form-label'>Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'}
                className='input-base'
                placeholder='Min 6 characters'
                style={{ paddingRight: 44 }}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type='button'
                onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 14, top: '50%',
                  transform: 'translateY(-45%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Role selector */}
          <div style={{ display: 'flex', gap: 10 }}>
            {(['admin', 'staff'] as const).map((role) => (
              <button
                key={role}
                type='button'
                className={`btn btn-sm ${form.admin === (role === 'admin') ? 'btn-primary' : 'btn-secondary'}`}
                style={{ flex: 1, textTransform: 'capitalize' }}
                onClick={() => setForm({ ...form, admin: role === 'admin' })}
              >
                {role}
              </button>
            ))}
          </div>

          <motion.button
            type='submit'
            className='btn btn-primary'
            style={{ width: '100%', marginTop: 10 }}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <span className='spinner' /> : <><UserPlus size={18} /> Create Account</>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
