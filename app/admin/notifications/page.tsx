'use client';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  CheckSquare,
  Trash,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type Notification = {
  id: string;
  type: 'warning' | 'danger' | 'success' | 'info';
  title: string;
  message: string;
  branchId?: string;
  read: boolean;
  createdAt: string;
};

const icons = {
  warning: AlertTriangle,
  danger: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const dotColors = {
  warning: 'var(--warning)',
  danger: 'var(--danger)',
  success: 'var(--success)',
  info: 'var(--info)',
};

export default function AdminNotificationsPage() {
  const queryClient = useQueryClient();
  const [limitCount] = useState(20);
  const [lastId, setLastId] = useState<string | undefined>(undefined);
  const [allNotifications, setAllNotifications] = useState<Notification[]>([]);

  const { data: notificationsResult, isLoading, isFetching } = useQuery<{
    notifications: Notification[];
    hasMore: boolean;
  }>({
    queryKey: ['admin-notifications', limitCount, lastId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('limit', limitCount.toString());
      if (lastId) params.set('lastId', lastId);

      const res = await fetch(`/api/notifications?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    staleTime: 60_000, // Fresh for 1 minute
  });

  useEffect(() => {
    if (notificationsResult?.notifications) {
      if (!lastId) {
        setAllNotifications(notificationsResult.notifications);
      } else {
        setAllNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const newNotifs = notificationsResult.notifications.filter((n) => !existingIds.has(n.id));
          return [...prev, ...newNotifs];
        });
      }
    }
  }, [notificationsResult?.notifications, lastId]);

  const isActuallyLoading = isLoading || (isFetching && allNotifications.length === 0);

  const markReadMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to mark read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const deleteNotif = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch('api/notifications', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Failed to delete notification');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-notifications'] });
    },
  });

  const handleMarkAllRead = async () => {
    if (!allNotifications) return;
    const unread = allNotifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    try {
      await Promise.all(unread.map((n) => markReadMut.mutateAsync(n.id)));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed to mark all as read');
    }
  };

  const unreadCount = allNotifications?.filter((n) => !n.read).length || 0;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', paddingBottom: 60 }}>
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
          <Bell
            size={24}
            color='var(--accent-deep)'
          />
          Notifications
          {unreadCount > 0 && (
            <span
              className='tab-badge'
              style={{ position: 'static', margin: 0 }}>
              {unreadCount}
            </span>
          )}
        </h1>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className='btn btn-secondary btn-sm'
            style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckSquare size={16} /> Mark all as read
          </button>
        )}
      </div>

      <div
        className='glass'
        style={{ padding: '8px 20px', minHeight: 180 }}>
        {isActuallyLoading ?
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              padding: '20px 0',
            }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className='skeleton'
                style={{ height: 60 }}
              />
            ))}
          </div>
        : allNotifications.length === 0 ?
          <div
            style={{
              textAlign: 'center',
              padding: '60px 0',
              color: 'var(--text-muted)',
            }}>
            <Bell
              size={48}
              style={{ opacity: 0.3, marginBottom: 12 }}
            />
            <p>No notifications yet</p>
          </div>
        : <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence>
              {allNotifications.map((n, i) => {
                const Icon = icons[n.type] || Info;
                return (
                  <motion.div
                    key={n.id}
                    className='notif-item'
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: n.read ? 0.7 : 1, y: 0 }}
                    exit={{ opacity: 0, x: -50 }}
                    transition={{ delay: i * 0.03 }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '14px 0',
                      borderBottom:
                        i < allNotifications.length - 1 ?
                          '1px solid var(--border)'
                        : 'none',
                      cursor: !n.read ? 'pointer' : 'default',
                    }}
                    onClick={() => {
                      if (!n.read) {
                        markReadMut.mutate(n.id);
                      }
                    }}>
                    <div
                      className='notif-dot'
                      style={{
                        background: dotColors[n.type] || 'var(--info)',
                        marginTop: 6,
                        opacity: n.read ? 0.3 : 1,
                      }}
                    />
                    <div style={{ flex: 1, paddingLeft: 10 }}>
                      <p
                        style={{
                          fontWeight: n.read ? 500 : 700,
                          fontSize: '0.9rem',
                          color:
                            n.read ?
                              'var(--text-secondary)'
                            : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}>
                        <Icon
                          size={14}
                          color={dotColors[n.type]}
                        />
                        {n.title}
                      </p>
                      <p
                        style={{
                          fontSize: '0.85rem',
                          color: 'var(--text-muted)',
                          marginTop: 4,
                        }}>
                        {n.message}
                      </p>
                      <p
                        style={{
                          fontSize: '0.75rem',
                          color: 'var(--text-light)',
                          marginTop: 6,
                        }}>
                        {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        }
      </div>

      {/* Load More Button */}
      {notificationsResult?.hasMore && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 20,
          }}>
          <button
            className='btn-primary'
            onClick={() => setLastId(allNotifications[allNotifications.length - 1]?.id)}
            disabled={isFetching}
            style={{
              width: 'auto',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '12px',
              opacity: isFetching ? 0.7 : 1,
            }}>
            {isFetching ? 'Loading...' : 'Load More Notifications'}
          </button>
        </div>
      )}
    </div>
  );
}
