'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CreditCard, Copy, Check, AlertCircle, CheckCircle2 } from 'lucide-react';
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

type ModalStep = 'details' | 'confirm';

export default function CheckoutModal({
  open, onClose, onConfirm, loading, total,
  paymentAccount, paymentBank, paymentAccountName,
}: Props) {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState<ModalStep>('details');
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const handleCopy = () => {
    navigator.clipboard.writeText(paymentAccount);
    setCopied(true);
    toast.success('Account number copied');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep('details'); // always reset step on close
    onClose();
  };

  const handleConfirm = () => {
    setStep('details'); // reset for next time
    onConfirm();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
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
                {step === 'details' ? 'Checkout Details' : 'Confirm Payment'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={handleClose} style={{ padding: 4 }}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <AnimatePresence mode="wait">
                {step === 'details' ? (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
                  >
                    {/* Amount */}
                    <div style={{ textAlign: 'center', padding: '10px 0' }}>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Amount to Pay</p>
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
                          {paymentAccount && (
                            <button onClick={handleCopy} className="btn btn-ghost btn-sm" style={{ padding: 4 }}>
                              {copied ? <Check size={16} color="var(--success)" /> : <Copy size={16} />}
                            </button>
                          )}
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
                        onClick={handleClose}
                        disabled={loading}
                      >
                        Cancel
                      </button>
                      <motion.button
                        className="btn btn-primary"
                        style={{ flex: 1 }}
                        onClick={() => setStep('confirm')}
                        disabled={loading}
                        whileTap={{ scale: 0.97 }}
                      >
                        Payment Received
                      </motion.button>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 24, alignItems: 'center', textAlign: 'center' }}
                  >
                    {/* Confirmation icon */}
                    <div style={{
                      width: 72, height: 72, borderRadius: '50%',
                      background: 'rgba(16, 185, 129, 0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <AlertCircle size={36} color="var(--success)" />
                    </div>

                    <div>
                      <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
                        Confirm Sale?
                      </p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                        Are you sure that payment of{' '}
                        <strong style={{ color: 'var(--accent-deep)' }}>
                          {currency}{total.toLocaleString()}
                        </strong>{' '}
                        has been received from the customer?
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                      <button
                        className="btn btn-secondary"
                        style={{ flex: 1 }}
                        onClick={() => setStep('details')}
                        disabled={loading}
                      >
                        ← Go Back
                      </button>
                      <motion.button
                        className="btn btn-primary"
                        style={{ flex: 1, background: 'var(--success)' }}
                        onClick={handleConfirm}
                        disabled={loading}
                        whileTap={{ scale: 0.97 }}
                      >
                        {loading ? (
                          <span className="spinner" />
                        ) : (
                          <>
                            <CheckCircle2 size={16} style={{ display: 'inline', marginRight: 6 }} />
                            Yes, Confirm Sale
                          </>
                        )}
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
