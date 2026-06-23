'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useBranches } from '@/lib/hooks/useBranches';
import { useSessionStore } from '@/store/sessionStore';
import { motion } from 'framer-motion';
import { MapPin, Key, ArrowRight, Building2 } from 'lucide-react';
import { toastError } from '@/lib/error-handler';
import toast from 'react-hot-toast';

export default function SelectBranchPage() {
  const router = useRouter();
  const { data: branches, isLoading } = useBranches();
  const setBranch = useSessionStore((s) => s.setBranch);
  const [selectedId, setSelectedId] = useState('');
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return toast.error('Select a branch');
    if (!key) return toast.error('Enter branch key');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/branch-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ branchId: selectedId, key }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Invalid key');
      }
      const data = await res.json();
      setBranch(selectedId, data.branchName);
      router.push('/staff/home');
      toast.success(`Connected to ${data.branchName}`);
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
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
            style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, var(--pink-300), var(--pink-500))',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 16, boxShadow: 'var(--shadow-pink)',
            }}
          >
            <Building2 size={28} color="#fff" />
          </motion.div>
          <h2>Select Your Branch</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
            Choose your branch and enter the access key
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label"><MapPin size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Branch</label>
            {isLoading ? (
              <div className="skeleton" style={{ height: 46 }} />
            ) : (
              <select
                className="input-base"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                  style={{cursor: 'pointer'}}
              >
                <option value="">Select a branch...</option>
                {branches?.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group">
            <label className="form-label"><Key size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 5 }} />Branch Key</label>
            <input
              type="password" className="input-base"
              placeholder="Enter branch access key"
              value={key} onChange={(e) => setKey(e.target.value)}
            />
          </div>

          <motion.button
            type="submit" className="btn btn-primary"
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
            whileTap={{ scale: 0.97 }}
          >
            {loading ? <span className="spinner" /> : <><ArrowRight size={18} /> Continue</>}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
