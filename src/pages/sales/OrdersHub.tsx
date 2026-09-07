import { useState } from 'react';
import { Send, ClipboardList } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { MyOrders } from './MyOrders';
import { Orders } from '../orders/Orders';
import './Sales.css';

type OrdersTab = 'myOrders' | 'orders';

// Single "My Orders" page hosting My Orders (self-service) and Orders (the
// permission-gated approve/manage-all view) as tabs — same consolidation
// pattern as Settings and Attendance Mgmt. Each tab renders the existing,
// unmodified page component.
export function OrdersHub() {
  const { currentUser } = useStore();
  const canViewOrders = !!currentUser?.permissions?.orders?.view;

  // My Orders needs no permission — every authenticated user gets it, same as
  // it was as a standalone sidebar entry.
  const tabs: { key: OrdersTab; label: string; icon: typeof Send }[] = [
    { key: 'myOrders', label: 'My Orders', icon: Send },
    ...(canViewOrders ? [{ key: 'orders' as const, label: 'Orders', icon: ClipboardList }] : []),
  ];

  const [activeTab, setActiveTab] = useState<OrdersTab>('myOrders');

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>My Orders</h1>
          <p>Create purchase invoices and manage orders</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #00a651' : '2px solid transparent',
                marginBottom: '-2px',
                color: active ? '#00a651' : '#6b7280',
                fontWeight: active ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'myOrders' && <MyOrders />}
      {activeTab === 'orders' && canViewOrders && <Orders />}
    </div>
  );
}
