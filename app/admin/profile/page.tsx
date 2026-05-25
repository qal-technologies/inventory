'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db, auth } from '@/lib/firebase/client';
import { signOut } from 'firebase/auth';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  LogOut,
  Shield,
  Mail,
  Building,
  Plus,
  Pencil,
  Trash2,
  Bell,
  MapPin,
  CreditCard,
  Key,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { toastError } from '@/lib/error-handler';
import { fetchBranches } from '@/lib/services/branches';
import Link from 'next/link';
import { useAppStore } from '@/store/appStore';

type Branch = {
  id: string;
  name: string;
  address: string;
  paymentAccount: string;
  paymentBank: string;
  paymentAccountName: string;
};

export default function AdminProfilePage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user, clearSession } = useSessionStore();
  const { branch: selectedBranch, setBranch: setSelectedBranch } =
    useAppStore();
  const [activeTab, setActiveTab] = useState<'profile' | 'branches'>('profile');

  // Branch CRUD State
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [branchForm, setBranchForm] = useState({
    name: '',
    address: '',
    paymentBank: '',
    paymentAccountName: '',
    paymentAccount: '',
    key: '',
  });

  // Query notifications count
  const { data: notifications } = useQuery<any[]>({
    queryKey: ['admin-notifications'],
    queryFn: async () => {
      const res = await fetch('/api/notifications');
      if (!res.ok) return [];
      return res.json();
    },
  });
  const unreadCount = notifications?.filter((n) => !n.read).length || 0;

  // Query branches
  const { data: branches, isLoading: branchesLoading } = useQuery<Branch[]>({
    queryKey: ['branches'],
    queryFn: fetchBranches,
  });

  // Add Branch Mutation
  const addBranchMut = useMutation({
    mutationFn: async (data: typeof branchForm) => {
      const res = await fetch('/api/branches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create branch');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      toast.success('Branch created successfully!');
      setShowAddForm(false);
      setBranchForm({
        name: '',
        address: '',
        paymentBank: '',
        paymentAccountName: '',
        paymentAccount: '',
        key: '',
      });
    },
    onError: (err) => toastError(err),
  });

  // Edit Branch Mutation
  const editBranchMut = useMutation({
    mutationFn: async (branch: Branch & { key?: string }) => {
      const res = await fetch(`/api/branches/${branch.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(branch),
      });
      if (!res.ok) throw new Error('Failed to update branch');
      return res.json();
    },
    onSuccess: (data) => {
      // If branch was renamed and our filter was pointing at the old name, update it
      const { oldName, newName } = data || {};
      if (
        oldName &&
        newName &&
        oldName !== newName &&
        selectedBranch === oldName
      ) {
        setSelectedBranch(newName);
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      // Re-fetch sales so dashboard/history reflect updated branchName on existing records
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      toast.success('Branch details updated! 🎉');
      setEditingBranch(null);
    },
    onError: (err) => toastError(err),
  });

  // Delete Branch Mutation
  const deleteBranchMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/branches/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete branch');
      return res.json();
    },
    onSuccess: (data, deletedId) => {
      // If the deleted branch was the active filter, clear it
      const deletedBranch = branches?.find((b) => b.id === deletedId);
      if (deletedBranch && selectedBranch === deletedBranch.name) {
        setSelectedBranch(null);
      }
      queryClient.invalidateQueries({ queryKey: ['branches'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
      const productCount = data?.deletedProducts ?? 0;
      const salesCount = data?.deletedSales ?? 0;
      toast.success(
        `Branch deleted along with ${productCount} product(s) and ${salesCount} sale record(s)`,
      );
    },
    onError: (err) => toastError(err),
  });

  const handleLogout = async () => {
    try {
      await signOut(auth);
      await fetch('/api/auth/logout', { method: 'POST' });
      clearSession();
      router.push('/login');
      toast.success('Logged out');
    } catch (err) {
      toastError(err, 'Logout failed');
    }
  };

  const handleCreateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchForm.name || !branchForm.key) {
      return toast.error('Branch Name and Key are required');
    }
    addBranchMut.mutate(branchForm);
  };

  const handleUpdateBranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBranch || !editingBranch.name) {
      return toast.error('Branch Name is required');
    }
    editBranchMut.mutate(editingBranch);
  };

  return (
    <div style={{maxWidth: 800, margin: '0 auto', paddingBottom: 80}}>
      {/* Header bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}>
        <h1>Settings & Profile</h1>
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
      </div>

      {/* Tabs list */}
      <div
        className='tabs'
        style={{ marginBottom: 24, width: 'max-content' }}>
        <button
          className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}>
          My Profile
        </button>
        <button
          className={`tab-btn ${activeTab === 'branches' ? 'active' : ''}`}
          onClick={() => setActiveTab('branches')}>
          Branches
        </button>
      </div>

      <AnimatePresence mode='wait'>
        {activeTab === 'profile' ?
          <motion.div
            key='profile-tab'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className='glass'
            style={{ padding: 24, maxWidth: 480 }}>
            {/* User Info card */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                marginBottom: 24,
              }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 'var(--radius-full)',
                  background:
                    'linear-gradient(135deg, var(--pink-300), var(--pink-500))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-pink)',
                }}>
                <User
                  size={28}
                  color='#fff'
                />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: '1.125rem' }}>
                  {user?.name || 'Admin User'}
                </p>
                <span className='badge badge-pink'>
                  <Shield size={12} /> {user?.role || 'admin'}
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className='form-group'>
                <label className='form-label'>
                  <Mail
                    size={14}
                    style={{
                      display: 'inline',
                      verticalAlign: 'middle',
                      marginRight: 4,
                    }}
                  />
                  Email Address
                </label>
                <input
                  className='input-base'
                  value={user?.email || ''}
                  disabled
                />
              </div>

              <div className='form-group'>
                <label className='form-label'>Name</label>
                <input
                  className='input-base'
                  value={user?.name || ''}
                  disabled
                />
              </div>
            </div>

            <motion.button
              className='btn btn-danger'
              style={{ width: '100%', maxWidth:300, justifySelf:'center', display:'flex', marginTop: 32 }}
              onClick={handleLogout}
              whileTap={{ scale: 0.97 }}>
              <LogOut size={18} /> Sign Out
            </motion.button>
          </motion.div>
        : <motion.div
            key='branches-tab'
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Create Branch Trigger */}
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className='btn btn-primary'
                style={{padding:10, paddingInline:15}}
                onClick={() => setShowAddForm(!showAddForm)}>
                <Plus size={16} /> Add Branch
              </button>
            </div>

            {/* Add Branch Form */}
            {showAddForm && (
              <motion.form
                onSubmit={handleCreateBranch}
                className='glass'
                style={{ padding: 20, borderRadius:20 }}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}>
                <h3 style={{ marginBottom: 16 }}>Add New Branch</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 10,
                    marginBottom: 15,
                  }}
                  className='form-grid-2'>
                  <div className='form-group'>
                    <label className='form-label'>Branch Name *</label>
                    <input
                      className='input-base'
                      placeholder='e.g. Lagos City'
                      value={branchForm.name}
                      onChange={(e) =>
                        setBranchForm({ ...branchForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className='form-group'>
                    <label className='form-label'>Address</label>
                    <input
                      className='input-base'
                      placeholder='Branch address'
                      value={branchForm.address}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 10,
                    marginBottom: 12,
                  }}>
                  <div className='form-group'>
                    <label className='form-label'>Bank Name</label>
                    <input
                      className='input-base'
                      placeholder='e.g. Opay'
                      value={branchForm.paymentBank}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          paymentBank: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='form-group'>
                    <label className='form-label'>Account Name</label>
                    <input
                      className='input-base'
                      placeholder='Acc. name'
                      value={branchForm.paymentAccountName}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          paymentAccountName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='form-group'>
                    <label className='form-label'>Account Number</label>
                    <input
                      className='input-base'
                      placeholder='10-digit'
                      maxLength={10}
                      type='number'
                      value={branchForm.paymentAccount}
                      onChange={(e) =>
                        setBranchForm({
                          ...branchForm,
                          paymentAccount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div
                  className='form-group'
                  style={{ marginBottom: 16 }}>
                  <label className='form-label'>
                    Staff Branch Login Key * (Hashed)
                  </label>
                  <input
                    className='input-base'
                    placeholder='Enter branch login passcode'
                    value={branchForm.key}
                    onChange={(e) =>
                      setBranchForm({ ...branchForm, key: e.target.value })
                    }
                  />
                </div>

                <button
                  type='submit'
                  className='btn btn-primary'
                  style={{ width: '100%' }}>
                  Create Branch
                </button>
              </motion.form>
            )}

            {/* Edit Branch Modal / Box */}
            {editingBranch && (
              <motion.form
                onSubmit={handleUpdateBranch}
                className='glass'
                style={{ padding: 20, border: '1px solid var(--accent-deep)' }}>
                <h3 style={{ marginBottom: 16 }}>Edit Branch Details</h3>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: 12,
                    marginBottom: 12,
                  }}
                  className='form-grid-2'>
                  <div className='form-group'>
                    <label className='form-label'>Branch Name *</label>
                    <input
                      className='input-base'
                      value={editingBranch.name}
                      onChange={(e) =>
                        setEditingBranch({
                          ...editingBranch,
                          name: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='form-group'>
                    <label className='form-label'>Address</label>
                    <input
                      className='input-base'
                      value={editingBranch.address}
                      onChange={(e) =>
                        setEditingBranch({
                          ...editingBranch,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr',
                    gap: 10,
                    marginBottom: 12,
                  }}>
                  <div className='form-group'>
                    <label className='form-label'>Bank Name</label>
                    <input
                      className='input-base'
                      value={editingBranch.paymentBank}
                      onChange={(e) =>
                        setEditingBranch({
                          ...editingBranch,
                          paymentBank: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='form-group'>
                    <label className='form-label'>Account Name</label>
                    <input
                      className='input-base'
                      value={editingBranch.paymentAccountName}
                      onChange={(e) =>
                        setEditingBranch({
                          ...editingBranch,
                          paymentAccountName: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className='form-group'>
                    <label className='form-label'>Account Number</label>
                    <input
                      className='input-base'
                      type='number'
                      value={editingBranch.paymentAccount}
                      onChange={(e) =>
                        setEditingBranch({
                          ...editingBranch,
                          paymentAccount: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>

                <div
                  className='form-group'
                  style={{ marginBottom: 16 }}>
                  <label className='form-label'>
                    New Login Key (leave blank to keep unchanged)
                  </label>
                  <input
                    className='input-base'
                    placeholder='Enter new login passcode'
                    onChange={(e) =>
                      setEditingBranch({
                        ...editingBranch,
                        key: e.target.value,
                      } as any)
                    }
                  />
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    type='button'
                    className='btn btn-secondary'
                    style={{ flex: 1 }}
                    onClick={() => setEditingBranch(null)}>
                    Cancel
                  </button>
                  <button
                    type='submit'
                    className='btn btn-primary'
                    style={{ flex: 1 }}>
                    Save Changes
                  </button>
                </div>
              </motion.form>
            )}

            {/* Branches List */}
            <div
              className='glass'
              style={{ padding: 0, overflow: 'auto' }}>
              <table className='inv-table'>
                <thead>
                  <tr>
                    <th>Branch</th>
                    <th>Location</th>
                    <th>Payment Details</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {branchesLoading ?
                    <tr>
                      <td
                        colSpan={4}
                        style={{ textAlign: 'center', padding: 20 }}>
                        Loading branches...
                      </td>
                    </tr>
                  : branches?.length === 0 ?
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          textAlign: 'center',
                          padding: 20,
                          color: 'var(--text-muted)',
                        }}>
                        No branches created yet.
                      </td>
                    </tr>
                  : branches?.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 600 }}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}>
                            <Building
                              size={16}
                              color='var(--accent-deep)'
                            />
                            {b.name}
                          </div>
                        </td>
                        <td>
                          {b.address ?
                            <span
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: '0.8rem',
                              }}>
                              <MapPin
                                size={12}
                                color='var(--text-muted)'
                              />
                              {b.address}
                            </span>
                          : <span
                              style={{
                                color: 'var(--text-light)',
                                fontSize: '0.8rem',
                              }}>
                              No location
                            </span>
                          }
                        </td>
                        <td>
                          {b.paymentAccount ?
                            <div
                              style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>
                              <p style={{ fontWeight: 600 }}>{b.paymentBank}</p>
                              <p style={{ color: 'var(--text-muted)' }}>
                                {b.paymentAccount} ({b.paymentAccountName})
                              </p>
                            </div>
                          : <span
                              style={{
                                color: 'var(--text-light)',
                                fontSize: '0.8rem',
                              }}>
                              Not set
                            </span>
                          }
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button
                              className='btn btn-ghost btn-sm'
                              style={{ padding: 6 }}
                              onClick={() => setEditingBranch(b)}>
                              <Pencil size={14} />
                            </button>
                            <button
                              className='btn btn-ghost btn-sm'
                              style={{ padding: 6, color: 'var(--danger)' }}
                              onClick={() => {
                                const productWarning = `⚠️ Delete "${b.name}" branch?\n\nThis will PERMANENTLY delete the branch AND all products linked to it.\n\nThis action cannot be undone.`;
                                if (confirm(productWarning)) {
                                  deleteBranchMut.mutate(b.id);
                                }
                              }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          </motion.div>
        }
      </AnimatePresence>
    </div>
  );
}
