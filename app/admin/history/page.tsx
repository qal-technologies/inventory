'use client';
import { useSales } from '@/lib/hooks/useSales';
import { motion } from 'framer-motion';
import { Receipt, Filter } from 'lucide-react';
import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { useBranches } from '@/lib/hooks/useBranches';
import { useAppStore } from '@/store/appStore';
import { getYearMonth, formatMonthLabel, toDate } from '@/lib/utils/dateUtils';

export default function AdminHistoryPage() {
  const { branch, setBranch, month, setMonth } = useAppStore();
  const [limitCount, setLimitCount] = useState(20);

  // Pass branch constraint to get accurate limits per branch
  const {
    data: sales,
    isLoading,
    isFetching,
  } = useSales(branch || undefined, limitCount);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const { data: branches } = useBranches();
  const branchNames = useMemo(() => {
    if (!branches) return [];
    return branches.map((b) => b.name).filter(Boolean);
  }, [branches]);

  // Dynamically extract month options from ALL sangles (not filtered)
  const monthOptions = useMemo(() => {
    if (!sales) return [];
    const set = new Set<string>();
    sales.forEach((s) => {
      const ym = getYearMonth(s.createdAt);
      if (ym) set.add(ym);
    });
    return [...set]
      .sort((a, b) => b.localeCompare(a))
      .map((ym) => ({ value: ym, label: formatMonthLabel(ym) }));
  }, [sales]);

  const filtered = useMemo(() => {
    if (!sales) return [];
    let res = sales;
    if (branch) {
      res = res.filter((s) => s.branchName === branch);
    }
    if (month) {
      res = res.filter((s) => getYearMonth(s.createdAt) === month);
    }
    return res;
  }, [sales, branch, month]);

  const totalRevenue = filtered.reduce((sum, s) => sum + (s.total || 0), 0);
  const totalProfit = filtered.reduce((sum, s) => sum + (s.profit || 0), 0);
  const totalDiscount = filtered.reduce((sum, s) => sum + (s.discount || 0), 0);

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
          {/* Branch filter */}
          <select
            className='input-base'
            style={{
              width: 'auto',
              minWidth: 150,
              height: 40,
              padding: '0 10px',
            }}
            value={branch || ''}
            onChange={(e) => setBranch(e.target.value || null)}>
            <option value=''>All Branches</option>
            {branchNames.map((b) => (
              <option
                key={b}
                value={b}>
                {b}
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
            {isLoading ?
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
            : filtered.length === 0 ?
              <tr>
                <td
                  colSpan={6}
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--text-muted)',
                  }}>
                  {branch || month ?
                    'No sales found for the selected filters'
                  : 'No sales yet'}
                </td>
              </tr>
            : filtered.map((sale, i) => {
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
                        {sale.items.map((it, idx) => (
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
    </div>
  );
}
