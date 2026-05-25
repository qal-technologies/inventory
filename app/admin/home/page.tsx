'use client';
import { useMemo } from 'react';
import { useSales } from '@/lib/hooks/useSales';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  AlertTriangle,
  Package,
  Award,
  Filter,
  Bell,
} from 'lucide-react';
import type { Product } from '@/lib/firebase/converters';
import { fetchAllProducts } from '@/lib/services/products';
import { useBranches } from '@/lib/hooks/useBranches';
import { useAppStore } from '@/store/appStore';
import { getYearMonth, formatMonthLabel, toDate } from '@/lib/utils/dateUtils';

export default function AdminHomePage() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  // Single source of truth — no local mirror state
  const { branch, month, setBranch, setMonth } = useAppStore();

  // Fetch all products to check stock alerts
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: fetchAllProducts,
  });

  // Fetch branches
  const { data: branches } = useBranches();

  // Branch names for the dropdown (only branches that exist)
  const branchNames = useMemo(() => {
    if (!branches) return [];
    return branches.map((b) => b.name).filter(Boolean);
  }, [branches]);

  // Dynamically extract month options (YYYY-MM) from ALL sales records (not filtered)
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

  // ── Filtering ─────────────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
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

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!branch) return products;
    // Resolve branch name → ID for product filtering
    const branchObj = branches?.find((b) => b.name === branch);
    if (!branchObj) return products; // branch not found yet, show all
    return products.filter((p) => p.branchId === branchObj.id);
  }, [products, branch, branches]);

  // ── Compute stats ─────────────────────────────────────────────────────────────
  const today = new Date().toDateString();

  const todaySales = filteredSales.filter((s) => {
    const d = toDate(s.createdAt);
    return d ? d.toDateString() === today : false;
  });

  const todayRevenue = todaySales.reduce((s, x) => s + (x.total || 0), 0);
  const todayProfit = todaySales.reduce((s, x) => s + (x.profit || 0), 0);
  const totalRevenue = filteredSales.reduce((s, x) => s + (x.total || 0), 0);
  const totalProfit = filteredSales.reduce((s, x) => s + (x.profit || 0), 0);
  const totalDiscount = filteredSales.reduce(
    (s, x) => s + (x.discount || 0),
    0,
  );

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

  // Restock alerts (uses correctly branch-filtered products)
  const restockAlerts = useMemo(() => {
    return filteredProducts.filter((p) => p.stock <= (p.reorder || 5));
  }, [filteredProducts]);

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
      value: filteredSales.length.toString(),
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

  const getBranchName = (id?: string) => {
    if (!id) return 'General';
    const b = branches?.find((b) => b.id === id);
    return b?.name || id;
  };

  // Fetch notifications
  const { data: notifications } = useQuery<any[]>({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
  });
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  const recentSales = filteredSales.slice(0, 5);
  const isLoading = salesLoading || productsLoading;

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

        {/* Filters + Bell */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link
            href='/admin/notifications'
            style={{
              position: 'relative',
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-full)',
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}>
            <Bell
              size={20}
              color='var(--accent-deep)'
            />
            {unreadCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  background: 'var(--danger)',
                  color: '#fff',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                {unreadCount}
              </span>
            )}
          </Link>

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

          {/* Low Stock Alerts */}
          {restockAlerts.length > 0 && (
            <div
              className='glass'
              style={{ padding: 10 }}>
              <h3
                style={{
                  marginBottom: 16,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--danger)',
                }}>
                <AlertTriangle
                  size={18}
                  color='var(--danger)'
                />{' '}
                Low Stock Alerts
              </h3>
              {isLoading ?
                <div
                  className='skeleton'
                  style={{ height: 180 }}
                />
              : <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    maxHeight: 200,
                    overflowY: 'auto',
                  }}>
                  {restockAlerts.map((p) => (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '6px 0',
                        borderBottom: '1px solid var(--border)',
                      }}>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>
                          {p.name}
                        </p>
                        <p
                          style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-muted)',
                          }}>
                          Branch: {getBranchName(p.branchId)}
                        </p>
                      </div>
                      <span
                        className={`badge ${p.stock === 0 ? 'badge-danger' : 'badge-warning'}`}>
                        {p.stock} left (reorder at {p.reorder || 5})
                      </span>
                    </div>
                  ))}
                </div>
              }
            </div>
          )}
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
