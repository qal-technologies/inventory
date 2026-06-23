'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSessionStore } from '@/store/sessionStore';
import { useProducts } from '@/lib/hooks/useProducts';
import { useProductSearch } from '@/lib/hooks/useProductSearch';
import ProductCard from '@/components/shared/ProductCard';
import type { Product } from '@/lib/firebase/converters';
import SkeletonCard from '@/components/shared/SkeletonCard';
import { motion } from 'framer-motion';
import { Search, AlertCircle, MapPin } from 'lucide-react';
import Link from 'next/link';

export default function StaffHomePage() {
  const { branchId, branchName } = useSessionStore();
  const [limitCount] = useState(100);
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Fetch initial/paginated products
  const {
    data: productsPage,
    isLoading,
    isFetching,
  } = useProducts(branchId || undefined, limitCount, lastId);

  // Server-side search (only when search is active)
  const { data: searchResults, isLoading: isSearching } = useProductSearch(
    branchId || undefined,
    search,
    search.trim().length > 0,
  );

  // Accumulate products from pagination
  useEffect(() => {
    if (productsPage) {
      setAllProducts((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newProducts = productsPage.filter((p) => !existingIds.has(p.id));
        if (newProducts.length === 0) return prev;
        return [...prev, ...newProducts];
      });
    }
  }, [productsPage]);

  // Reset when branch changes
  useEffect(() => {
    setAllProducts([]);
    setLastId(undefined);
    setSearch('');
  }, [branchId]);

  // Filter for display (use search results if searching, otherwise all products)
  const filtered = useMemo(() => {
    // If search is active, use server-side search results
    if (search.trim().length > 0) {
      return searchResults?.filter((p) => p.stock > 0) || []; 
    }

    // Otherwise use loaded products
    const stockedProducts = allProducts.filter((p) => p.stock > 0);
    return stockedProducts; 
  }, [allProducts, searchResults, search]);

  // Handle load more
  const handleLoadMore = useCallback(() => {
    if (!isLoadingMore && allProducts.length > 0) {
      setIsLoadingMore(true);
      setLastId(allProducts[allProducts.length - 1]?.id);
    }
  }, [allProducts, isLoadingMore]);

  // Update loading state when fetching completes
  useEffect(() => {
    if (!isFetching) {
      setIsLoadingMore(false);
    }
  }, [isFetching]);

  const isLoading_search = search.trim().length > 0 && isSearching;
  const showSkeleton = (isLoading || isLoading_search) && filtered.length === 0;

  return (
    <motion.div
      style={{ padding: '0px 10px 0', position: 'relative' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}>
      {/* Search Bar */}
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
          placeholder='Search products by name, category, or description...'
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            // Don't reset pagination when searching
          }}
          disabled={isLoading_search}
          aria-label='Search products'
        />
        {isLoading_search && (
          <div
            style={{
              marginLeft: '8px',
              fontSize: '0.8rem',
              color: 'var(--text-muted)',
            }}>
            Searching...
          </div>
        )}
      </div>

      {/* Loading Skeleton */}
      {showSkeleton ?
        <div className='products-grid'>
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard
              key={i}
              index={i}
            />
          ))}
        </div>
      : !branchId && !branchName ?
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
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
          }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              backgroundColor: 'rgba(255, 193, 7, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            <MapPin
              size={40}
              color='var(--warning)'
            />
          </div>
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: 8 }}>
              No Branch Selected
            </h3>
            <p>Please select a branch to view products and start selling.</p>
          </div>
          <Link href='/staff/select-branch'>
            <button
              className='btn-primary'
              style={{
                width: 'auto',
                padding: '10px',
                paddingInline: '20px',
                border: 'none',
                borderRadius: '18px',
              }}>
              Select Branch
            </button>
          </Link>
        </motion.div>
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
          }}>
          <p style={{ fontSize: '2rem', marginBottom: 8 }}>🛍️</p>
          <p>
            {search ?
              `No products match "${search}"`
            : 'No products found at this branch'}
          </p>
          {search && allProducts.length > 0 && (
            <p
              style={{
                fontSize: '0.85rem',
                marginTop: 8,
                color: 'var(--text-light)',
              }}>
              Try searching for different keywords
            </p>
          )}
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

      {/* Load More Button - Only show when not searching */}
      {!search.trim() && productsPage && productsPage.length >= limitCount && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 20,
            marginBottom: 80,
          }}>
          <button
            className='btn-primary'
            onClick={handleLoadMore}
            disabled={isLoadingMore || isFetching}
            style={{
              width: 'auto',
              padding: '10px',
              paddingInline: '20px',
              border: 'none',
              borderRadius: '18px',
              opacity: isLoadingMore || isFetching ? 0.6 : 1,
              cursor: isLoadingMore || isFetching ? 'not-allowed' : 'pointer',
            }}
            aria-busy={isLoadingMore}>
            {isLoadingMore ? 'Loading...' : 'Load More Products'}
          </button>
        </div>
      )}

      {/* No real-time data error state */}
      {!isLoading && !isFetching && allProducts.length === 0 && !search && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            marginTop: 24,
            padding: '16px',
            borderRadius: '8px',
            backgroundColor: 'rgba(255, 193, 7, 0.1)',
            border: '1px solid rgba(255, 193, 7, 0.3)',
            color: 'var(--text-light)',
            fontSize: '0.9rem',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
          }}>
          <AlertCircle
            size={20}
            style={{ marginTop: '2px', flexShrink: 0 }}
          />
          <div>
            <strong>No products found</strong>
            <p style={{ marginTop: '4px', opacity: 0.8 }}>
              This branch has no products in inventory yet or they might be out
              of stock. Contact your administrator to add products or update
              stock.
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
