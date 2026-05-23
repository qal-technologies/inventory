'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase/client';
import { useSessionStore } from '@/store/sessionStore';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/error-handler';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useSessionStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Fill in all fields');
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login failed');
      }
      const data = await res.json();
      setUser({ uid: cred.user.uid, role: data.role, name: data.name, email });

      if (data.role === 'admin') {
        router.push('/admin/home');
      } else {
        router.push('/staff/select-branch');
      }
      toast.success(`Welcome, ${data.name}!`);
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <motion.div
        className="auth-card"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
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
            <Sparkles size={28} color="#fff" />
          </motion.div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: 4 }}>Skincare Bestie</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sign in to your portal</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" className="input-base" placeholder="you@example.com"
              value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPw ? 'text' : 'password'} className="input-base"
                placeholder="••••••••" style={{ paddingRight: 44 }}
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button" onClick={() => setShowPw(!showPw)}
                style={{
                  position: 'absolute', right: 16, top: '50%',
                  transform: 'translateY(-45%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                }}
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <motion.button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: 20, alignSelf:'center' }}
            disabled={loading || (!email && !password)}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <span className="spinner" /> : <><LogIn size={18} /> Sign In</>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
