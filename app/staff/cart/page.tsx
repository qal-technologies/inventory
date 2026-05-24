'use client';
import { useState } from 'react';
import { useCartStore } from '@/store/cartStore';
import { useSessionStore } from '@/store/sessionStore';
import CartItem from '@/components/shared/CartItem';
import CheckoutModal from '@/components/shared/CheckoutModal';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { createSale } from '@/lib/services/sales';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/error-handler';
import { useBranches } from '@/lib/hooks/useBranches';

export default function StaffCartPage() {
  const {
    items,
    discount,
    discountType,
    setDiscount,
    setDiscountType,
    subtotal,
    discountAmount,
    total,
    clearCart,
    hasStockIssues,
  } = useCartStore();
  const branch = useSessionStore((s) => s.branch);
  const { data: branches } = useBranches();
  const queryClient = useQueryClient();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paymentInfo, setPaymentInfo] = useState({ account: '', bank: '', name: '' });
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const stockIssues = hasStockIssues();

  const handleProceed = async () => {
    if (!items.length) return toast.error('Cart is empty');
    if (!branch?.branchId) return toast.error('No branch selected');
    if (stockIssues) return toast.error('Some items exceed available stock. Please adjust quantities.');

    // Fetch payment info for branch
    if (branches) {
      const branchDoc = branches.find((b) => b.id === branch.branchId);
      if (branchDoc) {
        setPaymentInfo({
          account: branchDoc.paymentAccount || '',
          bank: branchDoc.paymentBank || '',
          name: branchDoc.paymentAccountName || '',
        });
      }
    }
    setCheckoutOpen(true);
  };

  const handleConfirmSale = async () => {
    if (!branch) return;
    setLoading(true);
    try {
      await createSale({
        items: items.map((i) => ({ productId: i.product.id, qty: i.qty })),
        discount,
        discountType,
        branchId: branch.branchId,
        branchName: branch.branchName,
      });
      clearCart();
      setCheckoutOpen(false);
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['staff-notifications'] });
      toast.success('Sale completed! 🎉');
    } catch (err: unknown) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      style={{ padding: '16px 16px 0' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}>
      <h2 style={{ marginBottom: 14 }}>Your Cart</h2>

      {items.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
          <ShoppingBag size={48} color='var(--pink-200)' style={{ marginBottom: 12 }} />
          <p>Your cart is empty</p>
          <p style={{ fontSize: '0.8125rem', marginTop: 4 }}>Add products from the home page</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-around', gap: 15, width: '100%' }}>
          {/* Cart items */}
          <div style={{ background: 'rgba(255,255,255,0.75)', borderRadius: 'var(--radius-xl)', padding: '5px 5px 0px', border: '1px solid var(--border)', maxWidth: '800px', flex: 1 }}>
            <AnimatePresence mode='popLayout'>
              {items.map((item) => (
                <CartItem key={item.product.id} item={item} />
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div style={{ background: 'rgba(255,255,255,0.9)', borderRadius: 'var(--radius-xl)', padding: '10px 20px', border: '1px solid var(--border)', marginTop: 16, maxWidth: '450px', flex: 1 }}>

            {/* Stock warning banner */}
            {stockIssues && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px',
                  background: 'rgba(245, 158, 11, 0.1)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--warning)', marginBottom: 12, fontSize: '0.8125rem',
                  color: 'var(--warning)', fontWeight: 600,
                }}>
                <AlertTriangle size={15} />
                Some items exceed available stock
              </motion.div>
            )}

            <div className='summary-row'>
              <span style={{ color: 'var(--text-muted)' }}>Subtotal</span>
              <span style={{ fontWeight: 600 }}>{currency}{subtotal().toLocaleString()}</span>
            </div>

            {/* Discount */}
            <div className='summary-row' style={{ flexWrap: 'wrap', gap: 8 }}>
              <span style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>Discount</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type='number'
                  className='input-base'
                  min='0'
                  style={{ width: 80, height: 30, padding: '6px 10px', fontSize: '0.87rem', textAlign: 'center' }}
                  value={discount || ''}
                  onChange={(e) => setDiscount(Number(e.target.value))}
                  placeholder='0'
                />
                <div style={{ display: 'flex', gap: 2 }}>
                  <button
                    className={`btn btn-sm ${discountType === 'flat' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm) 0 0 var(--radius-sm)' }}
                    onClick={() => setDiscountType('flat')}>
                    <DollarSign size={14} />
                  </button>
                  <button
                    className={`btn btn-sm ${discountType === 'percent' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 8px', borderRadius: '0 var(--radius-sm) var(--radius-sm) 0' }}
                    onClick={() => setDiscountType('percent')}>
                    <Percent size={14} />
                  </button>
                </div>
                <span style={{ fontSize: '0.8125rem', color: 'var(--danger)', fontWeight: 600, marginLeft: 8 }}>
                  -{currency}{discountAmount().toLocaleString()}
                </span>
              </div>
            </div>

            <div className='summary-row total'>
              <span>Total</span>
              <span>{currency}{total().toLocaleString()}</span>
            </div>

            <motion.button
              className='btn btn-primary'
              style={{ width: '100%', marginTop: 16, padding: '14px 24px', opacity: stockIssues ? 0.6 : 1 }}
              onClick={handleProceed}
              disabled={stockIssues}
              whileTap={{ scale: stockIssues ? 1 : 0.97 }}>
              {stockIssues ? '⚠️ Fix Stock Issues' : 'Proceed to Checkout'}
            </motion.button>
          </div>
        </div>
      )}

      <CheckoutModal
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onConfirm={handleConfirmSale}
        loading={loading}
        total={total()}
        paymentAccount={paymentInfo.account}
        paymentBank={paymentInfo.bank}
        paymentAccountName={paymentInfo.name}
      />
    </motion.div>
  );
}
