'use client';
import { useState, useMemo, useEffect } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useQuery } from '@tanstack/react-query';
import { fetchAllBranchProducts } from '@/lib/services/products';
import ProductCard from '@/components/shared/ProductCard';
import type { Product } from '@/lib/firebase/converters';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';

export default function StaffHomePage() {
  const branch = useSessionStore((s) => s.branch);
  const [search, setSearch] = useState('');

  const {
    data: allProducts = [],
    isLoading,
  } = useQuery({
    queryKey: ['products', branch?.branchId],
    queryFn: () => fetchAllBranchProducts(branch?.branchId || ''),
    enabled: !!branch?.branchId,
    staleTime: 300_000, // 5 minutes
  });

  const filtered = useMemo(() => {
    const inStock = allProducts.filter((p: Product) => p.stock > 0);
    if (!search.trim()) return inStock;
    const q = search.toLowerCase();
    return inStock.filter(
      (p: Product) =>
        p.name.toLowerCase().includes(q) ||
        p?.category?.toLowerCase().includes(q) ||
        p?.description?.toLowerCase().includes(q),
    );
  }, [allProducts, search]);

  return (
    <motion.div
      style={{ padding: '0px 10px 0', position: 'relative' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      {/* Search */}
      <div
        className='search-wrap'
        style={{
          marginBottom: 16,
          position: 'sticky',
          top: 10,
          zIndex: 999,
        }}>
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
      {isLoading && allProducts.length === 0 ?
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
