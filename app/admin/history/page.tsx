'use client';
import { useSales } from '@/lib/hooks/useSales';
import { useQuery } from '@tanstack/react-query';
import { fetchSaleMonths } from '@/lib/services/sales';
import { motion } from 'framer-motion';
import { Receipt, RefreshCw } from 'lucide-react';
import { useMemo, useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useBranches } from '@/lib/hooks/useBranches';
import { useSessionStore } from '@/store/sessionStore';
import { formatMonthLabel, toDate } from '@/lib/utils/dateUtils';
import type { Sale, SaleItem } from '@/lib/firebase/converters';

export default function AdminHistoryPage() {
  const {
    branchId,
    setBranch,
    month,
    setMonth
  } = useSessionStore();

  const [salesList, setSalesList] = useState<Sale[]>([]);
  const [currentLastId, setCurrentLastId] = useState<string | undefined>(undefined);

  // Reset list when filters change
  useEffect(() => {
    setSalesList([]);
    setCurrentLastId(undefined);
  }, [branchId, month]);

  // Pass branchId and month constraints directly to useSales, and disable useFullCache
  const {
    data: salesResult,
    isLoading,
    isFetching,
    refetch,
  } = useSales(branchId || undefined, 30, currentLastId, month || undefined, false);

  const isActuallyLoading = isLoading || (isFetching && salesList.length === 0);

  // Update salesList when salesResult changes
  useEffect(() => {
    if (salesResult?.sales) {
      if (!currentLastId) {
        setSalesList(salesResult.sales);
      } else {
        setSalesList((prev) => {
          const existingIds = new Set(prev.map((s: Sale) => s.id));
          const filteredNew = salesResult.sales.filter((s: Sale) => !existingIds.has(s.id));
          return [...prev, ...filteredNew];
        });
      }
    }
  }, [salesResult?.sales, currentLastId]);

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

  // Use pre-computed server-side stats directly from the query result
  const totalRevenue = salesResult?.stats?.totalRevenue || 0;
  const totalProfit = salesResult?.stats?.totalProfit || 0;
  const totalDiscount = salesResult?.stats?.totalDiscount || 0;

  const displaySales = salesList;

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
          <button
            className="btn btn-ghost"
            onClick={async () => {
              setSalesList([]);
              setCurrentLastId(undefined);
              const { salesCache } = require('@/lib/cache/salesCache');
              salesCache.invalidate();

              // Trigger a recalculation of stats document for current active filters
              const params = new URLSearchParams();
              if (branchId) params.set('branchId', branchId);
              if (month) params.set('month', month);
              params.set('limit', '1');
              params.set('refresh', 'true');
              try {
                await fetch(`/api/sales?${params.toString()}`);
              } catch (e) {
                console.error(e);
              }

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
            : !isActuallyLoading && salesList.length === 0 ?
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

      {salesResult?.hasMore && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 28,
            marginBottom: 48,
          }}>
          <button
            onClick={() => {
              if (salesList.length > 0) {
                const lastItem = salesList[salesList.length - 1];
                setCurrentLastId(lastItem.id);
              }
            }}
            disabled={isFetching}
            style={{
              width: 'auto',
              minWidth: 160,
              padding: '12px 28px',
              border: 'none',
              borderRadius: '24px',
              backgroundColor: 'var(--accent-deep)',
              color: '#ffffff',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(217, 111, 135, 0.3)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isFetching ? 0.75 : 1,
            }}>
            {isFetching ? (
              <>
                <RefreshCw size={16} className="spin" />
                <span>Loading...</span>
              </>
            ) : (
              'Load More Sales'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
