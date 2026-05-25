'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/client';
import { uploadProductImage } from '@/lib/cloudinary';
import { motion } from 'framer-motion';
import { ArrowLeft, ImageIcon, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchBranches } from '@/lib/services/branches';

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const queryClient = useQueryClient();
  const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || '₦';

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

  const getBranchName = (id?: string) => {
    if (!id) return 'General';
    const branch = branches?.find((b) => b.id === id);
    return branch?.name || id;
  };


  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch product details
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['admin-product', id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${id}`);
      if (!res.ok) throw new Error('Failed to fetch product');
      return res.json();
    },
    enabled: !!id,
  });

  // Pre-fill form when product loads
  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'General',
        reorder: String(product.reorder ?? 0),
        buyingPrice: String(product.buyingPrice || 0),
        sellingPrice: String(product.sellingPrice || 0),
        stock: String(product.stock || 0),
        branchId: product.branchId || '',
      });
      if (product.imageUrl) {
        setImagePreview(product.imageUrl);
      }
    }
  }, [product]);

  // Fetch branches for dropdown
  const { data: branches } = useQuery({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.buyingPrice || !form.sellingPrice || !form.branchId) {
      return toast.error('Fill in all required fields');
    }
    setLoading(true);
    try {
      let imageUrl = product?.imageUrl || '';
      if (imageFile) {
        imageUrl = await uploadProductImage(imageFile);
      }

      const res = await fetch(`/api/products/${id}`, {
        method: 'PATCH',
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
      if (!res.ok) throw new Error('Failed to update product');
      toast.success('Product updated successfully! 🎉');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-product', id] });
      router.push('/admin/inventory');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  const profit = (Number(form.sellingPrice) || 0) - (Number(form.buyingPrice) || 0);
  const margin = Number(form.sellingPrice) > 0 ? (profit / Number(form.sellingPrice) * 100).toFixed(1) : '0';

  if (productLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 600, padding: 24 }}>
        <div className="skeleton" style={{ height: 40, width: 200 }} />
        <div className="skeleton" style={{ height: 400 }} />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <button
        onClick={() => router.push('/admin/inventory')}
        className="btn btn-secondary btn-sm"
        style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <ArrowLeft size={16} /> Back to Inventory
      </button>

      <form onSubmit={handleSubmit} className="glass" style={{ padding: 20, maxWidth: 600, marginBottom: 60 }}>
        <h3 style={{ marginBottom: 20 }}>Edit Product Details</h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Image upload */}
          <div className="form-group">
            <label className="form-label">Product Image</label>
            <label className="dropzone" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" style={{ width: 120, height: 120, objectFit: 'cover', borderRadius: 'var(--radius-md)' }} />
              ) : (
                <ImageIcon size={32} color="var(--pink-300)" />
              )}
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {imagePreview ? 'Change Image' : 'Click to upload image'}
              </span>
              <input type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Name *</label>
            <input className="input-base" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Product name" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Buying Price ({currency}) *</label>
              <input type="number" className="input-base" value={form.buyingPrice} onChange={(e) => setForm({ ...form, buyingPrice: e.target.value })} placeholder="0.00" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Selling Price ({currency}) *</label>
              <input type="number" className="input-base" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} placeholder="0.00" min="0" />
            </div>
          </div>

          {/* Live profit preview */}
          {(Number(form.buyingPrice) > 0 || Number(form.sellingPrice) > 0) && (
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <span className={`badge ${profit >= 0 ? 'badge-success' : 'badge-danger'}`}>
                Profit: {currency}{profit.toLocaleString()}
              </span>
              <span className="badge badge-pink">Margin: {margin}%</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Stock *</label>
              <input type="number" className="input-base" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} placeholder="0" min="0" />
            </div>
            <div className="form-group">
              <label className="form-label">Restock Point</label>
              <input className="input-base" type='number' value={form.reorder} onChange={(e) => setForm({ ...form, reorder: e.target.value })} placeholder="0" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Branch *</label>
            <select className="input-base" value={form.branchId} onChange={(e) => setForm({ ...form, branchId: e.target.value })} style={{ cursor: 'pointer' }}>
              <option value="">{getBranchName(product?.branchId)}</option>
              {branches?.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <motion.button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: 8 }} disabled={loading} whileTap={{ scale: 0.97 }}>
            {loading ? <span className="spinner" /> : 'Save Changes'}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
}
