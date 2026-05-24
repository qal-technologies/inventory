'use client';
import { motion } from 'framer-motion';
import type { Product } from '@/lib/firebase/converters';
import { useCartStore } from '@/store/cartStore';
import { ShoppingCart, Package } from 'lucide-react';
import { useState } from 'react';

interface Props {
  product: Product;
  index?: number;
}

export default function ProductCard({ product, index = 0 }: Props) {
  const addItem = useCartStore((s) => s.addItem);
  const [added, setAdded] = useState(false);
  const outOfStock = product.stock <= 0;
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const handleAdd = () => {
    if (outOfStock) return;
    addItem(product);
    setAdded(true);
    setTimeout(() => setAdded(false), 800);
  };

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
        {outOfStock ? (
          <span className="badge badge-danger" style={{ fontSize: '0.7rem' }}>Out of stock</span>
        ) : (
          <span className="badge badge-success" style={{ fontSize: '0.7rem' }}>{product.stock} in stock</span>
        )}
        <motion.button
          className="btn btn-primary btn-sm"
          style={{ width: '100%', marginTop: 12, borderRadius:'var(--radius-xl)' }}
          onClick={handleAdd}
          disabled={outOfStock}
          whileTap={{ scale: 0.95 }}
        >
          {/* <ShoppingCart size={14} /> */}
          {added ? 'Added ✓' : outOfStock ? 'Unavailable' : 'Add to Cart'}
        </motion.button>
      </div>
    </motion.div>
  );
}
