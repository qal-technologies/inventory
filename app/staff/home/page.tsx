'use client';
import { useState, useMemo } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useProducts } from '@/lib/hooks/useProducts';
import ProductCard from '@/components/shared/ProductCard';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function StaffHomePage() {
  const branch = useSessionStore((s) => s.branch);
  const { data: products, isLoading } = useProducts(
    branch?.branchId || 'calabar',
  );
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!products) return [];
    const inStock = products.filter((p) => p.stock > 0);
    if (!search.trim()) return inStock;
    const q = search.toLowerCase();
    return inStock.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p?.category?.toLowerCase().includes(q) ||
        p?.description?.toLowerCase().includes(q),
    );
  }, [products, search]);

  return (
    <motion.div
      style={{ padding: '0px 10px 0', overflowY: 'hidden' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      {/* Search */}
      <div
        className='search-wrap'
        style={{ marginBottom: 16 }}>
        <Search
          size={18}
          color='var(--text-light)'
        />
        <input
          placeholder='Search products...'
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Products grid */}
      {isLoading ?
        <div className='products-grid'>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard
              key={i}
              index={i}
            />
          ))}
        </div>
      : filtered.length === 0 ?
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'var(--text-muted)',
            fontSize: '0.95rem',
            userSelect: 'none',
            width: '100%',
            height: '50%',
            display: 'grid',
            placeContent: 'center',
            justifyContent: 'center',
          }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🛍️</p>
          <p>
            {search ?
              'No products match your search'
            : 'No products in this branch yet'}
          </p>
        </motion.div>
      : <div className='products-grid'>
          {filtered.map((product, i) => (
            <ProductCard
              key={product.id}
              product={product}
              index={i}
            />
          ))}
        </div>
      }
    </motion.div>
  );
}
