'use client';
import { useMemo } from 'react';
import { useSales } from '@/lib/hooks/useSales';
import { useQuery } from '@tanstack/react-query';
import { fetchSaleMonths } from '@/lib/services/sales';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Package,
  Award,
  Filter,
} from 'lucide-react';
import type { Product } from '@/lib/firebase/converters';
import { fetchAllProducts } from '@/lib/services/products';
import { useBranches } from '@/lib/hooks/useBranches';
import { useSessionStore } from '@/store/sessionStore';
import { getYearMonth, formatMonthLabel, toDate } from '@/lib/utils/dateUtils';

export default function AdminHomePage() {
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  // Single source of truth — no local mirror state
  const { branchId, month, setBranch, setMonth } = useSessionStore();

  const { data: salesResult, isLoading: salesLoading } = useSales(branchId || undefined, 20, undefined, month || undefined);

  // Fetch products (limited) for summary stats
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['admin-products', 20],
    queryFn: () => fetchAllProducts(20),
    staleTime: 600_000,
  });

  // Fetch branches
  const { data: branches } = useBranches();

  // Fetch available months with sales
  const { data: availableMonths } = useQuery({
    queryKey: ['sale-months', branchId],
    queryFn: () => fetchSaleMonths(branchId || undefined),
  });

  const monthOptions = useMemo(() => {
    return (availableMonths || []).map((ym) => ({
      value: ym,
      label: formatMonthLabel(ym),
    }));
  }, [availableMonths]);

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    return salesResult?.sales || [];
  }, [salesResult?.sales]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!branchId) return products;
    return products.filter((p) => p.branchId === branchId);
  }, [products, branchId]);

  // ── Compute stats ─────────────────────────────────────────────────────────────
  const today = new Date().toDateString();

  const todaySales = filteredSales.filter((s) => {
    const d = toDate(s.createdAt);
    return d ? d.toDateString() === today : false;
  });

  const todayRevenue = todaySales.reduce((s, x) => s + (x.total || 0), 0);
  const todayProfit = todaySales.reduce((s, x) => s + (x.profit || 0), 0);

  const { totalRevenue, totalProfit, totalDiscount, count: totalSalesCount } = useMemo(() => {
    return salesResult?.stats || { totalRevenue: 0, totalProfit: 0, totalDiscount: 0, count: 0 };
  }, [salesResult?.stats]);

  const avgProfitMargin =
    filteredSales.length > 0 ?
      (
        filteredSales.reduce((s, x) => s + (x.profitMargin || 0), 0) /
        filteredSales.length
      ).toFixed(1)
    : '0';

  // Best selling products
  const bestSellers = useMemo(() => {
    const ranks: Record<
      string,
      { name: string; qty: number; revenue: number }
    > = {};
    filteredSales.forEach((sale) => {
      sale.items.forEach((item) => {
        const id = item.productId || item.name;
        if (!ranks[id]) {
          ranks[id] = { name: item.name, qty: 0, revenue: 0 };
        }
        ranks[id].qty += item.qty || 0;
        ranks[id].revenue += (item.sellingPrice || 0) * (item.qty || 0);
      });
    });
    return Object.values(ranks)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales]);

  // QUOTA OPTIMIZATION: Restock alerts removed from dashboard to prevent full product scans on every load.

  const stats = [
    {
      label: "Today's Revenue",
      value: `${currency}${todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'var(--accent-deep)',
    },
    {
      label: "Today's Profit",
      value: `${currency}${todayProfit.toLocaleString()}`,
      icon: TrendingUp,
      color: 'var(--success)',
    },
    {
      label: 'Total Sales',
      value: totalSalesCount.toString(),
      icon: ShoppingBag,
      color: 'var(--info)',
    },
    {
      label: 'Total Profit',
      value: `${currency}${totalProfit.toLocaleString()}`,
      icon: TrendingUp,
      color: '#8B5CF6',
    },
  ];


  // QUOTA OPTIMIZATION: Notification fetching removed from layout/header to prevent polling on mount.

  const recentSales = filteredSales.slice(0, 5);
  const isLoading = salesLoading || productsLoading;

  const getBranchName = (id?: string) => {
    if (!id) return 'General';
    const b = branches?.find((b) => b.id === id);
    return b?.name || id;
  };

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
        <div>
          <h1 style={{ marginBottom: 4 }}>Dashboard</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Overview of your business performance
          </p>
        </div>

        {/* Filter Toolbar (Bell icon removed for quota optimization) */}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflowX: 'auto',
            scrollBehavior: 'smooth',
          }}>
          {/* Branch filter — value is always the exact store value, "" means All */}
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

          {/* Month filter — value is always the "YYYY-MM" store value, "" means All */}
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

      {/* Stats Cards */}
      <div
        className='stats-grid'
        style={{
          marginBottom: 24,
          overflowX: 'auto',
          scrollBehavior: 'smooth',
        }}>
        {stats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              className='stat-card'
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}>
              <div style={{ gap: 10, alignItems: 'center', display: 'flex' }}>
                <Icon
                  size={20}
                  color={s.color}
                />
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {s.label}
                </p>
              </div>
              <p
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 800,
                  marginTop: 6,
                  color: 'var(--text-primary)',
                }}>
                {isLoading ?
                  <span
                    className='skeleton'
                    style={{ width: 80, height: 25, display: 'inline-block' }}
                  />
                : s.value}
              </p>
            </motion.div>
          );
        })}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 20,
          marginBottom: 40,
        }}>
        {/* Row 1: Best Sellers & Stock Alerts */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}
          className='form-grid-2'>
          {/* Best Sellers */}

          {!isLoading && bestSellers.length > 0 && (
            <div
              className='glass'
              style={{ padding: 20 }}>
              <h3
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <Award
                  size={18}
                  color='var(--warning)'
                />{' '}
                Best Selling Products
              </h3>
              {isLoading ?
                <div
                  className='skeleton'
                  style={{ height: 180 }}
                />
              : <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {bestSellers.map((item, index) => (
                    <div
                      key={item.name}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                        }}>
                        <span
                          style={{
                            fontWeight: 800,
                            color: 'var(--accent-deep)',
                            width: 20,
                          }}>
                          #{index + 1}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                          {item.name}
                        </span>
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: 16,
                          fontSize: '0.85rem',
                        }}>
                        <span style={{ color: 'var(--text-muted)' }}>
                          {item.qty} sold
                        </span>
                        <span style={{ fontWeight: 700 }}>
                          {currency}
                          {item.revenue.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* QUOTA OPTIMIZATION: Low Stock Alerts section completely removed as agreed */}
        </div>

        {/* Row 2: Recent Sales & Business Summary */}
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}
          className='form-grid-2'>
          {/* Recent Sales */}
          {!isLoading && recentSales.length > 0 && (
            <div
              className='glass'
              style={{ padding: 20 }}>
              <h3
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}>
                <ShoppingBag
                  size={18}
                  color='var(--accent-deep)'
                />{' '}
                Recent Sales
              </h3>
              {isLoading ?
                <div
                  style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className='skeleton'
                      style={{ height: 48 }}
                    />
                  ))}
                </div>
              : <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {recentSales.map((sale, i) => (
                    <motion.div
                      key={sale.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 0',
                        borderBottom:
                          i < recentSales.length - 1 ?
                            '1px solid var(--border)'
                          : 'none',
                      }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {sale.items.map((it) => it.name).join(', ')}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                          }}>
                          {sale.branchName} ·{' '}
                          {sale.items.reduce((sum, it) => sum + it.qty, 0)}{' '}
                          item(s)
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p
                          style={{
                            fontWeight: 700,
                            color: 'var(--accent-deep)',
                          }}>
                          {currency}
                          {(sale.total || 0).toLocaleString()}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--success)',
                          }}>
                          +{currency}
                          {(sale.profit || 0).toLocaleString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              }
            </div>
          )}

          {/* Business Summary */}
          <div
            className='glass'
            style={{ padding: 20 }}>
            <h3
              style={{
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
              <Package
                size={18}
                color='var(--accent-deep)'
              />{' '}
              Business Summary
            </h3>
            <div className='summary-row'>
              <span style={{ color: 'var(--text-muted)' }}>Total Revenue</span>
              <span style={{ fontWeight: 700 }}>
                {currency}
                {totalRevenue.toLocaleString()}
              </span>
            </div>
            <div className='summary-row'>
              <span style={{ color: 'var(--text-muted)' }}>Total Profit</span>
              <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                {currency}
                {totalProfit.toLocaleString()}
              </span>
            </div>
            <div className='summary-row'>
              <span style={{ color: 'var(--text-muted)' }}>
                Total Discount Given
              </span>
              <span style={{ fontWeight: 700, color: 'var(--danger)' }}>
                {currency}
                {totalDiscount.toLocaleString()}
              </span>
            </div>
            <div className='summary-row'>
              <span style={{ color: 'var(--text-muted)' }}>
                Avg Profit Margin
              </span>
              <span style={{ fontWeight: 700 }}>{avgProfitMargin}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
