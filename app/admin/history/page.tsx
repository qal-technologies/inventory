'use client';
import { useSales } from '@/lib/hooks/useSales';
import { useQuery } from '@tanstack/react-query';
import { fetchSaleMonths } from '@/lib/services/sales';
import { motion } from 'framer-motion';
import { Receipt, RefreshCw, Search } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useBranches } from '@/lib/hooks/useBranches';
import { useSessionStore } from '@/store/sessionStore';
import { getYearMonth, formatMonthLabel, toDate } from '@/lib/utils/dateUtils';
import type { Sale, SaleItem } from '@/lib/firebase/converters';

export default function AdminHistoryPage() {
  const {
    branchId,
    setBranch,
    month,
    setMonth
  } = useSessionStore();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [limitCount] = useState(30);
  const [fullCollection, setFullCollection] = useState<Sale[]>([]);

  // Handle search debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500); // 500ms debounce

    return () => clearTimeout(timer);
  }, [search]);

  // Pass branch constraint to get accurate limits per branch
  const {
    data: salesResult,
    isLoading,
    isFetching,
    refetch,
  } = useSales(undefined, 5000, undefined, undefined, true); // Always fetch all for Admin

  const isActuallyLoading = isLoading || (isFetching && fullCollection.length === 0);

  useEffect(() => {
    if (salesResult?.sales) {
      setFullCollection(salesResult.sales);
    }
  }, [salesResult?.sales]);

  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const { data: branches } = useBranches();

  // Fetch available months with sales
  const { data: availableMonths } = useQuery({
    queryKey: ['sale-months'],
    queryFn: () => fetchSaleMonths(undefined),
  });

  const monthOptions = useMemo(() => {
    return (availableMonths || []).map((ym) => ({
      value: ym,
      label: formatMonthLabel(ym),
    }));
  }, [availableMonths]);

  const filteredSales = useMemo(() => {
    let list = fullCollection;

    // Robust branch filter
    if (branchId) {
      list = list.filter(s => String(s.branchId).trim() === String(branchId).trim());
    }

    // Robust month filter
    if (month) {
      list = list.filter(s => {
        const d = toDate(s.createdAt);
        if (!d) return false;
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return ym === month;
      });
    }

    // Search filter
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      list = list.filter(s =>
        s.branchName?.toLowerCase().includes(q) ||
        s.items.some(it => it.name?.toLowerCase().includes(q)) ||
        s.id.toLowerCase().includes(q)
      );
    }

    return list;
  }, [fullCollection, branchId, month, debouncedSearch]);

  const stats = useMemo(() => {
    return filteredSales.reduce((acc, s) => {
      acc.totalRevenue += s.total || 0;
      acc.totalProfit += s.profit || 0;
      acc.totalDiscount += s.discount || 0;
      return acc;
    }, { totalRevenue: 0, totalProfit: 0, totalDiscount: 0 });
  }, [filteredSales]);

  const { totalRevenue, totalProfit, totalDiscount } = stats;

  const displaySales = useMemo(() => {
    // Show top 30 from the current filtered full collection
    return filteredSales.slice(0, 30);
  }, [filteredSales]);

  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          flexWrap: 'wrap',
          gap: 12,
        }}>
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Receipt
            size={24}
            color='var(--accent-deep)'
          />{' '}
          Sales History
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            className='search-wrap'
            style={{ flex: 1, minWidth: 260, maxWidth: 350, margin: 0 }}>
            <Search
              size={18}
              color='var(--text-light)'
            />
            <input
              placeholder='Search history...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <button
            className="btn btn-ghost"
            onClick={() => {
              const { salesCache } = require('@/lib/cache/salesCache');
              salesCache.invalidate();
              refetch();
            }}
            disabled={isFetching}
            title="Refresh cache"
          >
            <RefreshCw size={18} className={isFetching ? 'spin' : ''} />
          </button>
          {/* Branch filter */}
          <select
            className='input-base'
            style={{
              width: 'auto',
              minWidth: 150,
              height: 40,
              padding: '0 10px',
            }}
            value={branchId || ''}
            onChange={(e) => {
              const bId = e.target.value;
              const bName = branches?.find((b) => b.id === bId)?.name || null;
              setBranch(bId || null, bName);
            }}>
            <option value=''>All Branches</option>
            {branches?.map((b) => (
              <option
                key={b.id}
                value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Month filter */}
          <select
            className='input-base'
            style={{
              width: 'auto',
              minWidth: 160,
              height: 40,
              padding: '0 10px',
            }}
            value={month || ''}
            onChange={(e) => setMonth(e.target.value || null)}>
            <option value=''>All Months</option>
            {monthOptions.map((m) => (
              <option
                key={m.value}
                value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div
        className='stats-grid'
        style={{
          gridTemplateColumns: 'repeat(3, 1fr)',
          marginBottom: 20,
          overflowX: 'auto',
          scrollBehavior: 'smooth',
        }}>
        <div className='stat-card'>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total Revenue
          </p>
          <p style={{ fontSize: '1.5rem', fontWeight: 800, marginInline: 5 }}>
            {currency}
            {totalRevenue.toLocaleString()}
          </p>
        </div>
        <div className='stat-card'>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total Profit
          </p>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--success)',
              marginInline: 5,
            }}>
            {currency}
            {totalProfit.toLocaleString()}
          </p>
        </div>
        <div className='stat-card'>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Discounts Given
          </p>
          <p
            style={{
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--danger)',
              marginInline: 5,
            }}>
            {currency}
            {totalDiscount.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Sales table */}
      <div
        className='glass'
        style={{ padding: 0, overflow: 'auto' }}>
        <table className='inv-table'>
          <thead>
            <tr>
              <th>Date</th>
              <th>Time</th>
              <th>Branch</th>
              <th>Item(s) & Qty</th>
              <th>Total</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            {isActuallyLoading ?
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <td key={j}>
                      <div
                        className='skeleton'
                        style={{ height: 16, width: '80%' }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            : !isActuallyLoading && filteredSales.length === 0 ?
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--text-muted)',
                  }}>
                  {branchId || month ?
                    'No sales found for the selected filters'
                  : 'No sales yet'}
                </td>
              </tr>
            : displaySales.map((sale, i) => {
                const d = toDate(sale.createdAt);
                return (
                  <motion.tr
                    key={sale.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}>
                    <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                      {d ? format(d, 'MMM d, yyyy') : '—'}
                    </td>
                    <td>{d ? format(d, 'h:mm a') : '—'}</td>
                    <td
                      style={{ fontWeight: 600, color: 'var(--accent-deep)' }}>
                      {sale.branchName || 'General'}
                    </td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 4,
                        }}>
                        {sale.items.map((it: SaleItem, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                              fontSize: '0.825rem',
                            }}>
                            <span>{it.name || 'Product'}</span>
                            <span
                              className='badge badge-pink'
                              style={{
                                padding: '2px 6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                              }}>
                              x{it.qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>
                      {currency}
                      {(sale.total || 0).toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--success)' }}>
                      +{currency}
                      {(sale.profit || 0).toLocaleString()}
                    </td>
                  </motion.tr>
                );
              })
            }
          </tbody>
        </table>
      </div>

      {/* QUOTA OPTIMIZATION: Simple append pagination commented out as requested */}
      {/* {salesResult?.hasMore && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 20,
            marginBottom: 40,
          }}>
          <button
            className='btn-primary'
            onClick={() => setLastId(filteredSales[filteredSales.length - 1]?.id)}
            disabled={isFetching}
            style={{
              width: 'auto',
              padding: '10px',
              paddingInline: '20px',
              border:'none',
              borderRadius: '12px',
              opacity: isFetching ? 0.7 : 1,
            }}>
            {isFetching ? 'Loading...' : 'Load More Sales'}
          </button>
        </div>
      )} */}
    </div>
  );
}
