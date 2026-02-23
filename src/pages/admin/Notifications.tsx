import { useState, useEffect, type ReactNode } from 'react';
import { Bell, AlertTriangle, Clock, Package, RotateCcw, DollarSign, Calendar, CheckCircle, RefreshCw, Inbox, CheckCheck } from 'lucide-react';
import { stockAlertsApi, salesApi, salesReturnsApi, leavesApi, expendituresApi, notificationsApi } from '../../services/api';
import type { AppNotification } from '../../types';
import { format } from 'date-fns';
import '../stock/Stock.css';

interface Notification {
  id: string;
  type: 'low_stock' | 'pending_sale' | 'pending_return' | 'pending_leave' | 'pending_expense' | 'activity';
  title: string;
  message: string;
  icon: ReactNode;
  color: string;
  bg: string;
  time?: string;
}

export function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [dbNotifications, setDbNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'system' | 'messages'>('messages');
  const [activeFilter, setActiveFilter] = useState('all');
  const [summary, setSummary] = useState({ lowStock: 0, pendingSales: 0, pendingReturns: 0, pendingLeaves: 0, pendingExpenses: 0 });

  useEffect(() => {
    fetchNotifications();
    fetchDbNotifications();
  }, []);

  const fetchDbNotifications = async () => {
    try {
      const data = await notificationsApi.getAll();
      setDbNotifications(data);
    } catch (err) {
      console.error('Failed to fetch DB notifications:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
      setDbNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error('Failed to mark as read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setDbNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error('Failed to mark all as read:', err);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    const notifs: Notification[] = [];
    let lowStockCount = 0, pendingSalesCount = 0, pendingReturnsCount = 0, pendingLeavesCount = 0, pendingExpensesCount = 0;

    try {
      // Low stock alerts
      try {
        const alerts = await stockAlertsApi.getAlerts();
        const lowItems = alerts.filter((a: any) => {
          const stock = a.currentStock ?? a.quantity ?? 0;
          const reorder = a.reorderPoint ?? 10;
          return stock <= reorder;
        });
        lowStockCount = lowItems.length;
        lowItems.slice(0, 10).forEach((item: any, i: number) => {
          const stock = item.currentStock ?? item.quantity ?? 0;
          notifs.push({
            id: `stock-${i}`,
            type: 'low_stock',
            title: stock === 0 ? 'Out of Stock' : 'Low Stock Alert',
            message: `${item.name} - Current stock: ${stock} (Reorder point: ${item.reorderPoint ?? 10})`,
            icon: <AlertTriangle size={18} />,
            color: stock === 0 ? '#dc2626' : '#d97706',
            bg: stock === 0 ? '#fef2f2' : '#fffbeb',
          });
        });
      } catch {}

      // Pending sales
      try {
        const pendingSales = await salesApi.getPendingSales();
        pendingSalesCount = pendingSales.length;
        if (pendingSales.length > 0) {
          notifs.push({
            id: 'sales-pending',
            type: 'pending_sale',
            title: 'Pending Sales Approvals',
            message: `${pendingSales.length} sale(s) awaiting approval`,
            icon: <DollarSign size={18} />,
            color: '#0ea5e9',
            bg: '#f0f9ff',
          });
        }
      } catch {}

      // Pending returns
      try {
        const allReturns = await salesReturnsApi.getAll();
        const pendingReturns = allReturns.filter((r: any) => r.status === 'pending');
        pendingReturnsCount = pendingReturns.length;
        if (pendingReturns.length > 0) {
          notifs.push({
            id: 'returns-pending',
            type: 'pending_return',
            title: 'Pending Returns',
            message: `${pendingReturns.length} return(s) awaiting approval`,
            icon: <RotateCcw size={18} />,
            color: '#8b5cf6',
            bg: '#f5f3ff',
          });
        }
      } catch {}

      // Pending leaves
      try {
        const pendingLeaves = await leavesApi.getAll('pending');
        pendingLeavesCount = pendingLeaves.length;
        if (pendingLeaves.length > 0) {
          notifs.push({
            id: 'leaves-pending',
            type: 'pending_leave',
            title: 'Pending Leave Requests',
            message: `${pendingLeaves.length} leave request(s) awaiting approval`,
            icon: <Calendar size={18} />,
            color: '#f59e0b',
            bg: '#fffbeb',
          });
        }
      } catch {}

      // Pending expenses
      try {
        const pendingExpenses = await expendituresApi.getPending();
        pendingExpensesCount = pendingExpenses.length;
        if (pendingExpenses.length > 0) {
          notifs.push({
            id: 'expenses-pending',
            type: 'pending_expense',
            title: 'Pending Expense Claims',
            message: `${pendingExpenses.length} expense(s) awaiting approval`,
            icon: <DollarSign size={18} />,
            color: '#ef4444',
            bg: '#fef2f2',
          });
        }
      } catch {}

      setSummary({ lowStock: lowStockCount, pendingSales: pendingSalesCount, pendingReturns: pendingReturnsCount, pendingLeaves: pendingLeavesCount, pendingExpenses: pendingExpensesCount });
    } catch (err) {
      console.error(err);
    } finally {
      setNotifications(notifs);
      setLoading(false);
    }
  };

  const filteredNotifications = activeFilter === 'all'
    ? notifications
    : notifications.filter(n => n.type === activeFilter);

  const totalPending = summary.pendingSales + summary.pendingReturns + summary.pendingLeaves + summary.pendingExpenses;

  const filterTabs = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'low_stock', label: 'Stock Alerts', count: summary.lowStock },
    { key: 'pending_sale', label: 'Sales', count: summary.pendingSales },
    { key: 'pending_return', label: 'Returns', count: summary.pendingReturns },
    { key: 'pending_leave', label: 'Leaves', count: summary.pendingLeaves },
    { key: 'pending_expense', label: 'Expenses', count: summary.pendingExpenses },
  ];

  if (loading) {
    return (
      <div className="stock-page">
        <div style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <div className="loading-spinner" />
        </div>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Bell size={24} color="#00a651" /> Notification Center
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>System alerts and pending approvals</p>
        </div>
        <button
          onClick={fetchNotifications}
          style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Low Stock Items', value: summary.lowStock, icon: <Package size={20} />, color: '#ef4444' },
          { label: 'Pending Approvals', value: totalPending, icon: <Clock size={20} />, color: '#f59e0b' },
          { label: 'Pending Sales', value: summary.pendingSales, icon: <DollarSign size={20} />, color: '#0ea5e9' },
          { label: 'Pending Leaves', value: summary.pendingLeaves, icon: <Calendar size={20} />, color: '#8b5cf6' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ color: '#64748b', fontSize: '0.8rem', marginBottom: 4 }}>{card.label}</p>
                <p style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b' }}>{card.value}</p>
              </div>
              <div style={{ background: `${card.color}15`, borderRadius: 10, padding: 10, color: card.color }}>{card.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* View Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('messages')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
            border: 'none', background: activeTab === 'messages' ? '#00a651' : 'transparent',
            color: activeTab === 'messages' ? 'white' : '#64748b', borderRadius: '8px 8px 0 0',
            cursor: 'pointer', fontWeight: activeTab === 'messages' ? 600 : 400, fontSize: '14px'
          }}
        >
          <Inbox size={16} /> Messages
          {dbNotifications.filter(n => !n.isRead).length > 0 && (
            <span style={{ background: activeTab === 'messages' ? 'rgba(255,255,255,0.3)' : '#ef4444', color: 'white', padding: '2px 8px', borderRadius: 10, fontSize: '11px', fontWeight: 700 }}>
              {dbNotifications.filter(n => !n.isRead).length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('system')}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
            border: 'none', background: activeTab === 'system' ? '#00a651' : 'transparent',
            color: activeTab === 'system' ? 'white' : '#64748b', borderRadius: '8px 8px 0 0',
            cursor: 'pointer', fontWeight: activeTab === 'system' ? 600 : 400, fontSize: '14px'
          }}
        >
          <AlertTriangle size={16} /> System Alerts
        </button>
      </div>

      {/* DB-backed Messages Tab */}
      {activeTab === 'messages' && (
        <>
          {dbNotifications.filter(n => !n.isRead).length > 0 && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
              <button
                onClick={handleMarkAllRead}
                style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: '0.8rem' }}
              >
                <CheckCheck size={16} /> Mark All Read
              </button>
            </div>
          )}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {dbNotifications.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <Inbox size={48} color="#94a3b8" style={{ opacity: 0.5 }} />
                <p style={{ color: '#94a3b8', marginTop: 16, fontSize: '0.95rem' }}>No messages yet</p>
              </div>
            ) : (
              dbNotifications.map(notif => (
                <div
                  key={notif.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px',
                    borderBottom: '1px solid #f1f5f9',
                    background: notif.isRead ? 'transparent' : '#f0fdf4',
                    transition: 'background 0.15s'
                  }}
                >
                  <div style={{
                    background: notif.type?.includes('stock') ? '#fffbeb' : '#eff6ff',
                    color: notif.type?.includes('stock') ? '#d97706' : '#2563eb',
                    borderRadius: 10, padding: 10, flexShrink: 0
                  }}>
                    <Bell size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', marginBottom: 2 }}>{notif.title}</p>
                    <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: 4 }}>{notif.message}</p>
                    <p style={{ color: '#94a3b8', fontSize: '0.7rem' }}>
                      {format(new Date(notif.createdAt), 'dd MMM yyyy, HH:mm')}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkRead(notif.id)}
                      style={{ background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 500, whiteSpace: 'nowrap' }}
                    >
                      Mark Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* System Alerts Tab */}
      {activeTab === 'system' && (
        <>
          {/* Filter Tabs */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
            {filterTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: activeFilter === tab.key ? '2px solid #00a651' : '1px solid #e2e8f0',
                  background: activeFilter === tab.key ? '#f0fdf4' : '#fff',
                  color: activeFilter === tab.key ? '#00a651' : '#64748b',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span style={{ background: activeFilter === tab.key ? '#00a651' : '#e2e8f0', color: activeFilter === tab.key ? '#fff' : '#64748b', borderRadius: 10, padding: '2px 8px', fontSize: '0.7rem' }}>{tab.count}</span>
                )}
              </button>
            ))}
          </div>

          {/* Notification List */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            {filteredNotifications.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center' }}>
                <CheckCircle size={48} color="#22c55e" />
                <p style={{ color: '#94a3b8', marginTop: 16, fontSize: '0.95rem' }}>All clear! No notifications in this category.</p>
              </div>
            ) : (
              filteredNotifications.map(notif => (
                <div key={notif.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}>
                  <div style={{ background: notif.bg, color: notif.color, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                    {notif.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontWeight: 600, color: '#1e293b', fontSize: '0.9rem', marginBottom: 2 }}>{notif.title}</p>
                    <p style={{ color: '#64748b', fontSize: '0.825rem' }}>{notif.message}</p>
                  </div>
                  <span style={{ background: notif.bg, color: notif.color, padding: '4px 10px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {notif.type.replace(/_/g, ' ').replace('pending ', '').toUpperCase()}
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
