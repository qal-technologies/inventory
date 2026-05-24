'use client';
import { useState, useMemo } from 'react';
import { useSales } from '@/lib/hooks/useSales';
import { useQuery } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
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

export default function AdminHomePage() {
  const { data: sales, isLoading: salesLoading } = useSales();
  const [branchFilter, setBranchFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  // Fetch all products to check stock alerts
  const { data: products, isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ['admin-products'],
    queryFn: fetchAllProducts,
  });

  // Extract unique branches from sales or products
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
        'January',
        'February',
        'March',
        'April',
        'May',
        'June',
        'July',
        'August',
        'September',
        'October',
        'November',
        'December',
      ];
      const label = `${monthNames[parseInt(month, 10) - 1]} ${year}`;
      return { value: ym, label };
    });
  }, [sales]);

  // Filter sales and products by branch and month
  const filteredSales = useMemo(() => {
    if (!sales) return [];
    let res = sales;
    if (branchFilter) {
      res = res.filter((s) => s.branchName === branchFilter);
    }
    if (monthFilter) {
      res = res.filter(
        (s) => s.createdAt && s.createdAt.startsWith(monthFilter),
      );
    }
    return res;
  }, [sales, branchFilter, monthFilter]);

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!branchFilter) return products;
    // Map branchName to branchId or simply check
    return products.filter((p) => p.branchId === branchFilter.toLowerCase());
  }, [products, branchFilter]);

  // Compute stats
  const today = new Date().toDateString();
  const todaySales = filteredSales.filter(
    (s) => new Date(s.createdAt).toDateString() === today,
  );

  const todayRevenue = todaySales.reduce((s, x) => s + x.total, 0);
  const todayProfit = todaySales.reduce((s, x) => s + x.profit, 0);
  const totalRevenue = filteredSales.reduce((s, x) => s + x.total, 0);
  const totalProfit = filteredSales.reduce((s, x) => s + x.profit, 0);
  const totalDiscount = filteredSales.reduce((s, x) => s + x.discount, 0);

  // Fast/Best selling product rank
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
        ranks[id].qty += item.qty;
        ranks[id].revenue += item.sellingPrice * item.qty;
      });
    });
    return Object.values(ranks)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredSales]);

  // Restock alerts
  const restockAlerts = useMemo(() => {
    if (!filteredProducts) return [];
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
    const branch = branches?.find((b) => b.id === id);
    return branch?.name || id;
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

        {/* Branch Filter dropdown and Bell notification link */}
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
              flexWrap: 'wrap',
              width: '100%',
            }}>
            <Filter
              size={16}
              color='var(--text-muted)'
            />
            <select
              className='input-base'
              style={{
                width: 'auto',
                minWidth: 170,
                height: 40,
                padding: '0 10px',
              }}
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
              style={{
                width: 'auto',
                minWidth: 160,
                height: 40,
                padding: '0 10px',
              }}
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
      </div>

      {/* Stats Cards */}
      <div
        className='stats-grid'
        style={{ marginBottom: 24 }}>
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
          {/* Best Sellers Rankings */}
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
            : bestSellers.length === 0 ?
              <p
                style={{
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: 40,
                }}>
                No data yet
              </p>
            : <div
                style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {bestSellers.map((item, index) => (
                  <div
                    key={item.name}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyItems: 'center',
                      justifyContent: 'space-between',
                    }}>
                    <div
                      style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
                      style={{ display: 'flex', gap: 16, fontSize: '0.85rem' }}>
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

          {/* Low Stock Alerts */}
          {restockAlerts.length > 0 && (
            <div
              className='glass'
              style={{ padding: 20 }}>
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
          {/* Recent sales */}
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
            : recentSales.length === 0 ?
              <p
                style={{
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                  padding: 24,
                }}>
                No sales yet
              </p>
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
                        {sale.total.toLocaleString()}
                      </p>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--success)',
                        }}>
                        +{currency}
                        {sale.profit.toLocaleString()}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            }
          </div>

          {/* Quick stats / Business Summary */}
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
              <span style={{ fontWeight: 700 }}>
                {filteredSales.length ?
                  (
                    filteredSales.reduce((s, x) => s + x.profitMargin, 0) /
                    filteredSales.length
                  ).toFixed(1)
                : 0}
                %
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
