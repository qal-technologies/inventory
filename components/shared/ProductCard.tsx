'use client';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/firebase/converters';
import { useCartStore } from '@/store/cartStore';
import { Package } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const items = useCartStore((s) => s.items);
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  // Current qty already in cart for this product
  const cartItem = items.find((i) => i.product.id === product.id);
  const inCartQty = cartItem?.qty ?? 0;
  const isAtMax = inCartQty >= product.stock;

  const handleAdd = () => {
    if (outOfStock) return;
    const result = addItem(product);
    if (!result.success) {
      toast.error(result.message || 'Cannot add more', { icon: '⚠️', id: `stock-${product.id}` });
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 900);
  };

  const stockLabel = () => {
    if (outOfStock) return 'Out of stock';
    if (isAtMax) return `${inCartQty} in cart (max)`;
    if (inCartQty > 0) return `${product.stock - inCartQty} remaining`;
    return `${product.stock} in stock`;
  };

  const stockBadgeClass = outOfStock ? 'badge-danger' : isAtMax ? 'badge-warning' : 'badge-success';

  return (
    <motion.div
      className="product-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4 }}
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="product-img" loading="lazy" />
      ) : (
        <div className="product-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Package size={40} color="var(--pink-300)" />
        </div>
      )}
      <div className="product-info">
        <p style={{ fontSize: '0.87rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.3 }}>
          {product.name}
        </p>
        <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-deep)', marginBottom: 2 }}>
          {currency}{product.sellingPrice.toLocaleString()}
        </p>
        <span className={`badge ${stockBadgeClass}`} style={{ fontSize: '0.7rem' }}>
          {stockLabel()}
        </span>
        <motion.button
          className="btn btn-primary btn-sm"
          style={{ width: '100%', marginTop: 12, borderRadius: 'var(--radius-xl)', opacity: (outOfStock || isAtMax) ? 0.65 : 1 }}
          onClick={handleAdd}
          disabled={outOfStock || isAtMax}
          whileTap={{ scale: outOfStock || isAtMax ? 1 : 0.95 }}
        >
          {added ? 'Added ✓' : outOfStock ? 'Unavailable' : isAtMax ? 'Cart Full' : 'Add to Cart'}
        </motion.button>
      </div>
    </motion.div>
  );
}
