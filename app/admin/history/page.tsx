'use client';
import { useSales } from '@/lib/hooks/useSales';
import { motion } from 'framer-motion';
import { Receipt, Filter } from 'lucide-react';
import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {useBranches} from '@/lib/hooks/useBranches';

export default function AdminHistoryPage() {
  const { data: sales, isLoading } = useSales();
  const [branchFilter, setBranchFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const { data: branches } = useBranches();
  const branchNames = useMemo(() => {
    if (!branches) return [];
    return branches?.map((b) => b.name).filter(Boolean);
  }, [branches]);

  // Dynamically extract month options (YYYY-MM) from sales records
  const monthOptions = useMemo(() => {
    if (!sales) return [];
    const set = new Set<string>();
    sales.forEach((s) => {
      if (s.createdAt) {
        set.add(s.createdAt.slice(0, 7));
      }
    });
    const sorted = [...set].sort((a, b) => b.localeCompare(a));
    return sorted.map((ym) => {
      const [year, month] = ym.split('-');
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      const label = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
      return { value: ym, label };
    });
  }, [sales]);

  const filtered = useMemo(() => {
    if (!sales) return [];
    let res = sales;
    if (branchFilter) {
      res = res.filter((s) => s.branchName === branchFilter);
    }
    if (monthFilter) {
      res = res.filter((s) => s.createdAt && s.createdAt.startsWith(monthFilter));
    }
    return res;
  }, [sales, branchFilter, monthFilter]);

  const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);
  const totalProfit = filtered.reduce((sum, s) => sum + s.profit, 0);
  const totalDiscount = filtered.reduce((sum, s) => sum + s.discount, 0);

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
          <Filter
            size={16}
            color='var(--text-muted)'
          />

          <select
            className='input-base'
            style={{ width: 'auto', minWidth: 140, height: 40, padding: '0 10px' }}
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}>
            <option value=''>All Branches</option>
            {branchNames.map((b) => (
              <option
                key={b}
                value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            className='input-base'
            style={{ width: 'auto', minWidth: 140, height: 40, padding: '0 10px' }}
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}>
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
        style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 20, gridAutoFlow: 'column', overflowX: 'scroll', scrollBehavior: 'smooth' }}>
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
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ?
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
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
                  colSpan={5}
                  style={{
                    textAlign: 'center',
                    padding: 40,
                    color: 'var(--text-muted)',
                  }}>
                  No sales found
                </td>
              </tr>
            : filtered.map((sale, i) => (
                <motion.tr
                  key={sale.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.02 }}>
                  <td style={{ fontSize: '0.8125rem', whiteSpace: 'nowrap' }}>
                    {format(new Date(sale.createdAt), 'MMM d')}
                  </td>
                  <td>{format(new Date(sale.createdAt), 'h:mm a')}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-deep)' }}>
                    {sale.branchName || 'General'}
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {sale.items.map((it, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.825rem' }}>
                          <span style={{ color: 'var(--text-primary)' }}>{it.name || 'Product'}</span>
                          <span className="badge badge-pink" style={{ padding: '2px 6px', fontSize: '0.75rem', fontWeight: 700 }}>
                            x{it.qty}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {currency}
                    {sale.total.toLocaleString()}
                  </td>
                </motion.tr>
              ))
            }
          </tbody>
        </table>
      </div>
    </div>
  );
}
