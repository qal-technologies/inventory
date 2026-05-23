'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  total: number;
  paymentAccount: string;
  paymentBank: string;
  paymentAccountName: string;
}

export default function CheckoutModal({
  open, onClose, onConfirm, loading, total,
  paymentAccount, paymentBank, paymentAccountName,
}: Props) {
  const [copied, setCopied] = useState(false);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentAccount);
    setCopied(true);
    toast.success('Account number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-panel"
            onClick={(e) => e.stopPropagation()}
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
          >
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CreditCard size={20} color="var(--accent-deep)" />
                Checkout Details
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Amount */}
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)'}}>Amount to Pay</p>
                <p style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent-deep)' }}>
                  {currency}{total.toLocaleString()}
                </p>
              </div>

              {/* Payment Details Card */}
              <div style={{
                background: 'var(--pink-50)', borderRadius: 'var(--radius-lg)',
                padding: 20, display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Account Number</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <p style={{ fontWeight: 700, fontSize: '1.125rem', letterSpacing: '0.05em' }}>
                      {paymentAccount || '—'}
                    </p>
                    <button onClick={handleCopy} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                      {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Bank Name</p>
                  <p style={{ fontWeight: 600 }}>{paymentBank || 'Not set'}</p>
                </div>
                <div>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 2 }}>Account Name</p>
                  <p style={{ fontWeight: 600 }}>{paymentAccountName || 'Not set'}</p>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, paddingTop: 8 }}>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1 }}
                  onClick={onClose}
                  disabled={loading}
                >
                  Cancel
                </button>
                <motion.button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={onConfirm}
                  disabled={loading}
                  whileTap={{ scale: 0.97 }}
                >
                  {loading ? <span className="spinner" /> : 'Payment Received'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
