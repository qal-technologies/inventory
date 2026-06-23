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
  const [limitCount] = useState(20);
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  const [allProducts, setAllProducts] = useState<any[]>([]);

  const {
    data: productsPage,
    isLoading,
    isFetching,
  } = useProducts(branch?.branchId || 'calabar', limitCount, lastId);

  useMemo(() => {
    if (productsPage) {
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newProducts = productsPage.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newProducts];
      });
    }
  }, [productsPage]);

  // Reset when branch changes
  useMemo(() => {
    setAllProducts([]);
    setLastId(undefined);
  }, [branch?.branchId]);

  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const inStock = allProducts.filter((p) => p.stock > 0);
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

      {/* QUOTA OPTIMIZATION: Simple append pagination */}
      {productsPage && productsPage.length >= limitCount && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 20,
            marginBottom: 80,
          }}>
          <button
            className='btn-primary'
            onClick={() => setLastId(allProducts[allProducts.length - 1]?.id)}
            disabled={isFetching}
            style={{
              width: 'auto',
              padding: '0 24px',
              opacity: isFetching ? 0.7 : 1,
            }}>
            {isFetching ? 'Loading...' : 'Load More Products'}
          </button>
        </div>
      )}
    </motion.div>
  );
}
