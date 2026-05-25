'use client';
import { useState, useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { uploadProductImage } from '@/lib/cloudinary';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Package, Pencil, Trash2, ImageIcon, AlertTriangle, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/error-handler';
import { useBranches } from '@/lib/hooks/useBranches';
import { useProducts } from '@/lib/hooks/useProducts';
import { useAppStore } from '@/store/appStore';

type Tab = 'products' | 'add';

export default function AdminInventoryPage() {
  const [tab, setTab] = useState<Tab>('products');
  const [search, setSearch] = useState('');
  const queryClient = useQueryClient();

  // Single source of truth — read branch filter directly from store
  const { branch, setBranch } = useAppStore();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  const { data: branches } = useBranches();

  const getBranchName = (id?: string) => {
    if (!id) return 'General';
    const b = branches?.find((b) => b.id === id);
    return b?.name || id;
  };

  // Resolve branch name → ID for product filtering
  const branchId = useMemo(() => {
    if (!branch) return undefined;
    const found = branches?.find((b) => b.name === branch);
    return found?.id;
  }, [branch, branches]);

  const { data: products, isLoading } = useProducts(branchId);

  const filtered = useMemo(() => {
    if (!products) return [];
    let list = products;
    // Products are already pre-filtered by branchId from the API hook
    // Just apply the search filter
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p?.category?.toLowerCase().includes(q)
    );
  }, [products, search]);

  const lowStockProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => p.stock <= (p.reorder || 5));
  }, [products]);

  // Delete product
  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
    },
    onSuccess: () => {
      // Invalidate all product-related query keys
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('Product deleted');
    },
    onError: (err) => toastError(err, 'Delete failed'),
  });

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
        <h1>Inventory</h1>
        <div className='tabs'>
          <button
            className={`tab-btn ${tab === 'products' ? 'active' : ''}`}
            onClick={() => setTab('products')}>
            Products
          </button>
          <button
            className={`tab-btn ${tab === 'add' ? 'active' : ''}`}
            onClick={() => setTab('add')}>
            <Plus
              size={14}
              style={{ display: 'inline', verticalAlign: 'middle' }}
            />{' '}
            Add Product
          </button>
        </div>
      </div>

      <AnimatePresence mode='sync'>
        {tab === 'products' ?
          <motion.div
            key='products'
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}>

            {/* Low stock alerts section */}
            {lowStockProducts.length > 0 && (
              <div
                className="glass"
                style={{
                  padding: 12,
                  border: '0.5px solid var(--danger)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  marginBottom: 16,
                  borderRadius: 'var(--radius-lg)'
                }}
              >
                <h4 style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--danger)', margin: 0, marginBottom: 8, fontSize: '0.95rem' }}>
                  <AlertTriangle size={18} /> {lowStockProducts.length} Product(s) require restock alert
                </h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {lowStockProducts.map(p => (
                    <span key={p.id} className="badge badge-danger" style={{ fontSize: '0.75rem' }}>
                      {p.name} ({p.stock} left)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Search and filter toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                marginBottom: 16,
                flexWrap: 'wrap'
              }}
            >
              <div
                className='search-wrap'
                style={{ flex: 1, minWidth: 260, maxWidth: 400, margin: 0 }}>
                <Search
                  size={18}
                  color='var(--text-light)'
                />
                <input
                  placeholder='Search inventory...'
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  className="input-base"
                  style={{ width: 'auto', minWidth: 170, height: 40, padding: '0 10px' }}
                  value={branch || ''}
                  onChange={(e) => setBranch(e.target.value || null)}
                >
                  <option value="">All Branches</option>
                  {branches?.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Products table */}
            <div
              className='glass'
              style={{ padding: 0, overflow: 'auto' }}>
              <table className='inv-table'>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Buy Price</th>
                    <th>Sell Price</th>
                    <th>Margin</th>
                    <th>Stock</th>
                    <th>Branch</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ?
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 7 }).map((_, j) => (
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
                        colSpan={7}
                        style={{
                          textAlign: 'center',
                          padding: 40,
                          color: 'var(--text-muted)',
                        }}>
                        No products found
                      </td>
                    </tr>
                  : filtered.map((p, i) => {
                      const margin =
                        p.sellingPrice > 0 ?
                          (
                            ((p.sellingPrice - p.buyingPrice) /
                              p.sellingPrice) *
                            100
                          ).toFixed(1)
                        : '0';
                      return (
                        <motion.tr
                          key={p.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: i * 0.03 }}>
                          <td>
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                              }}>
                              <div
                                style={{
                                  width: 36,
                                  height: 36,
                                  borderRadius: 'var(--radius-sm)',
                                  overflow: 'hidden',
                                  flexShrink: 0,
                                  background: 'var(--pink-100)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}>
                                {p.imageUrl ?
                                  <img
                                    src={p.imageUrl}
                                    alt=''
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                    }}
                                  />
                                : <Package
                                    size={16}
                                    color='var(--pink-300)'
                                  />
                                }
                              </div>
                              <div>
                                <span
                                  style={{
                                    fontWeight: 600,
                                    color: 'var(--text-primary)',
                                    fontSize: '0.875rem',
                                  }}>
                                  {p.name}
                                </span>
                                <br />
                                <span
                                  style={{
                                    fontSize: '0.75rem',
                                    color: 'var(--text-muted)',
                                  }}>
                                  {p.category}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td>
                            {currency}
                            {p.buyingPrice.toLocaleString()}
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {currency}
                            {p.sellingPrice.toLocaleString()}
                          </td>
                          <td>
                            <span className='badge badge-success'>
                              {margin}%
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                p.stock <= 5 ? 'badge-danger'
                                : p.stock <= 20 ? 'badge-warning'
                                : 'badge-success'
                              }`}>
                              {p.stock}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8125rem' }}>
                            {getBranchName(p.branchId)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                className='btn btn-ghost btn-sm'
                                style={{ padding: 6 }}
                                onClick={() =>
                                  (window.location.href = `/admin/inventory/${p.id}/edit`)
                                }>
                                <Pencil size={14} />
                              </button>
                              <button
                                className='btn btn-ghost btn-sm'
                                style={{ padding: 6, color: 'var(--danger)' }}
                                onClick={() => {
                                  if (confirm('Delete this product?'))
                                    deleteMut.mutate(p.id);
                                }}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })
                  }
                </tbody>
              </table>
            </div>
          </motion.div>
        : <AddProductForm
            key='add'
            onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ['admin-products'] });
              queryClient.invalidateQueries({ queryKey: ['products'] });
              setTab('products');
            }}
          />
        }
      </AnimatePresence>
    </div>
  );
}

// ─── Add Product Form ────────────────────────────────────────────────────────

function AddProductForm({ onSuccess }: { onSuccess: () => void }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'General',
    reorder: '',
    buyingPrice: '',
    sellingPrice: '',
    stock: '',
    branchId: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

  // Fetch branches for dropdown
  const { data: branches } = useBranches();
  const branchNames = useMemo(() => {
    if (!branches) return [];
    return branches?.map((b) => b.name).filter(Boolean);
  }, [branches]);

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !form.name ||
      !form.buyingPrice ||
      !form.sellingPrice ||
      !form.branchId
    ) {
      return toast.error('Fill in all required fields');
    }
    setLoading(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          sellingPrice: Number(form.sellingPrice),
          buyingPrice: Number(form.buyingPrice),
          stock: Number(form.stock) || 0,
          reorder: Number(form.reorder) || 0,
          imageUrl,
        }),
      });
      if (!res.ok) throw new Error('Failed to create product');
      toast.success('Product added! 🎉');
      onSuccess();
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  };

  const profit =
    (Number(form.sellingPrice) || 0) - (Number(form.buyingPrice) || 0);
  const margin =
    Number(form.sellingPrice) > 0 ?
      ((profit / Number(form.sellingPrice)) * 100).toFixed(1)
    : '0';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}>
      <form
        onSubmit={handleSubmit}
        className='glass'
        style={{ padding: 20, maxWidth: 600, marginBottom: 60 }}>
        <h3 style={{ marginBottom: 20 }}>Add New Product</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Image upload */}
          <div className='form-group'>
            <label className='form-label'>Product Image</label>
            <label
              className='dropzone'
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
              }}>
              {imagePreview ?
                <img
                  src={imagePreview}
                  alt='Preview'
                  style={{
                    width: 120,
                    height: 120,
                    objectFit: 'cover',
                    borderRadius: 'var(--radius-md)',
                  }}
                />
              : <ImageIcon
                  size={32}
                  color='var(--pink-300)'
                />
              }
              <span
                style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {imagePreview ? 'Image uploaded' : 'Click to upload image'}
              </span>
              <input
                type='file'
                accept='image/*'
                onChange={handleImage}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div className='form-group'>
            <label className='form-label'>Name *</label>
            <input
              className='input-base'
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder='Product name'
            />
          </div>

          {/* <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="input-base" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Optional description" rows={2} style={{ resize: 'vertical', height: 'auto' }} />
          </div> */}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 10,
            }}>
            <div className='form-group'>
              <label className='form-label'>Buying Price ({currency}) *</label>
              <input
                type='number'
                className='input-base'
                value={form.buyingPrice}
                onChange={(e) =>
                  setForm({ ...form, buyingPrice: e.target.value })
                }
                placeholder='0.00'
                min='0'
              />
            </div>
            <div className='form-group'>
              <label className='form-label'>Selling Price ({currency}) *</label>
              <input
                type='number'
                className='input-base'
                value={form.sellingPrice}
                onChange={(e) =>
                  setForm({ ...form, sellingPrice: e.target.value})
                }
                placeholder='0.00'
                min='0'
              />
            </div>
          </div>

          {/* Live profit preview */}
          {(Number(form.buyingPrice) > 0 || Number(form.sellingPrice) > 0) && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span
                className={`badge ${profit >= 0 ? 'badge-success' : 'badge-danger'}`}>
                Profit: {currency}
                {profit.toLocaleString()}
              </span>
              <span className='badge badge-pink'>Margin: {margin}%</span>
            </div>
          )}

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 12,
            }}>
            <div className='form-group'>
              <label className='form-label'>Stock *</label>
              <input
                type='number'
                className='input-base'
                value={form.stock}
                onChange={(e) => setForm({ ...form, stock: e.target.value })}
                placeholder='0'
                min='0'
              />
            </div>
            <div className='form-group'>
              <label className='form-label'>Restock Point</label>
              <input
                className='input-base'
                type='number'
                value={form.reorder}
                onChange={(e) => setForm({ ...form, reorder: e.target.value })}
                placeholder='0'
              />
            </div>
          </div>

          <div className='form-group'>
            <label className='form-label'>Branch *</label>
            <select
              className='input-base'
              value={form.branchId}
              onChange={(e) => setForm({ ...form, branchId: e.target.value })}
              style={{ cursor: 'pointer' }}>
              <option value=''>Select branch...</option>
              {branches?.map((b) => (
                <option
                  key={b.id}
                  value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <motion.button
            type='submit'
            className='btn btn-primary'
            style={{ width: '100%', marginTop: 8 }}
            disabled={loading}
            whileTap={{ scale: 0.97 }}>
            {loading ?
              <span className='spinner' />
            : 'Add Product'}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
