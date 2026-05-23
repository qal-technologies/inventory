'use client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useSessionStore } from '@/store/sessionStore';
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

export default function StaffNotificationsPage() {
  const { branch } = useSessionStore();

  const { data: notifications, isLoading } = useQuery<Notification[]>({
    queryKey: ['staff-notifications', branch?.branchId],
    queryFn: async () => {
      if (!branch?.branchId) return [];
      const res = await fetch(`/api/notifications?branchId=${branch.branchId}`);
      if (!res.ok) throw new Error('Failed to fetch notifications');
      return res.json();
    },
    enabled: !!branch?.branchId,
  });

  const getStaffMessage = (n: Notification) => {
    if (n.type === 'danger') {
      const prodName = n.message.split(' has ')[0] || 'A product';
      return `${prodName} is out of stock.`;
    }
    if (n.type === 'warning') {
      const prodName = n.message.split(' has ')[0] || 'A product';
      return `${prodName} is running low. Please restock.`;
    }
    if (n.type === 'success') {
      return 'Sale processed successfully.';
    }
    return n.message;
  };

  return (
    <motion.div
      style={{ padding: '16px 16px 60px', maxWidth: 600, margin: '0 auto' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2 style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Bell size={22} color="var(--accent-deep)" /> Notifications
      </h2>

      <div style={{
        background: 'rgba(255,255,255,0.85)', borderRadius: 'var(--radius-lg)',
        padding: '4px 16px', border: '1px solid var(--border)', minHeight: 120
      }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '20px 0' }}>
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton" style={{ height: 50 }} />
            ))}
          </div>
        ) : !notifications || notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            <Bell size={40} style={{ opacity: 0.25, marginBottom: 8 }} />
            <p style={{ fontSize: '0.875rem' }}>No notifications yet</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <AnimatePresence>
              {notifications.map((n, i) => {
                const Icon = icons[n.type] || Info;
                return (
                  <motion.div
                    key={n.id}
                    className="notif-item"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '12px 0',
                      borderBottom: i < notifications.length - 1 ? '1px solid var(--border)' : 'none',
                    }}
                  >
                    <div
                      className="notif-dot"
                      style={{
                        background: dotColors[n.type] || 'var(--info)',
                        marginTop: 4,
                      }}
                    />
                    <div style={{ flex: 1, paddingLeft: 5 }}>
                      <p style={{ fontWeight: 600, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Icon size={13} color={dotColors[n.type]} />
                        {n.title}
                      </p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: 2 }}>
                        {getStaffMessage(n)}
                      </p>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-light)', marginTop: 4 }}>
                        {format(new Date(n.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
