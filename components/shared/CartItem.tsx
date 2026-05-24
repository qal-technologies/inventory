'use client';
import { motion } from 'framer-motion';
import { useCartStore, type CartItem as CartItemType } from '@/store/cartStore';
import { Minus, Plus, Trash2, Package, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  item: CartItemType;
}

export default function CartItem({ item }: Props) {
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';
  const maxQty = item.product.stock;
  const isAtMax = item.qty >= maxQty;

  const handleIncrease = () => {
    const result = updateQty(item.product.id, item.qty + 1);
    if (!result.success && result.message) {
      toast.error(result.message, { icon: '⚠️', id: `stock-${item.product.id}` });
    }
  };

  const handleDecrease = () => {
    updateQty(item.product.id, item.qty - 1);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20, height: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        display: 'flex',
        gap: 6,
        padding: '6px',
        paddingRight: '10px',
        border: `0.5px solid ${isAtMax ? 'var(--warning)' : 'var(--pink-100)'}`,
        borderRadius: 'var(--radius-lg)',
        marginBottom: '6px',
        backgroundColor: isAtMax ? 'rgba(245, 158, 11, 0.04)' : 'transparent',
        backdropFilter: 'blur(10px)',
        alignItems: 'center',
      }}>
      {/* Image */}
      <div
        style={{
          width: 50,
          height: 50,
          borderRadius: 'var(--radius-md)',
          overflow: 'hidden',
          flexShrink: 0,
          background: 'var(--pink-100)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        {item.product.imageUrl ?
          <img
            src={item.product.imageUrl}
            alt={item.product.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        : <Package
            size={24}
            color='var(--pink-300)'
          />
        }
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '0.85rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
          {item.product.name}
        </p>
        <p
          style={{
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--accent-deep)',
          }}>
          {currency}
          {item.product.sellingPrice.toLocaleString()}
        </p>
        {isAtMax && (
          <p style={{ fontSize: '0.7rem', color: 'var(--warning)', display: 'flex', alignItems: 'center', gap: 3, marginTop: 1 }}>
            <AlertTriangle size={10} /> Max stock reached
          </p>
        )}
      </div>

      {/* Qty Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          marginRight: 6,
        }}>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleDecrease}
          className='btn btn-secondary btn-sm'
          style={{
            padding: '5px',
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-lg)',
          }}>
          <Minus size={14} />
        </motion.button>
        <span
          style={{
            fontWeight: 700,
            fontSize: '0.9rem',
            minWidth: 24,
            textAlign: 'center',
            color: isAtMax ? 'var(--warning)' : 'var(--text-primary)',
          }}>
          {item.qty}
        </span>
        <motion.button
          whileTap={{ scale: 0.85 }}
          onClick={handleIncrease}
          disabled={isAtMax}
          className='btn btn-primary btn-sm'
          style={{
            padding: '5px',
            width: 30,
            height: 30,
            borderRadius: 'var(--radius-lg)',
            opacity: isAtMax ? 0.5 : 1,
          }}>
          <Plus size={14} />
        </motion.button>
      </div>

      {/* Remove */}
      <motion.button
        whileTap={{ scale: 0.85 }}
        onClick={() => removeItem(item.product.id)}
        className='btn btn-ghost btn-sm'
        style={{ padding: 6, color: 'var(--danger)' }}>
        <Trash2 size={16} />
      </motion.button>
    </motion.div>
  );
}
