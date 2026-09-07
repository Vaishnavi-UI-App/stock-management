import { useState } from 'react';
import { Package, Boxes, AlertTriangle, CalendarClock, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { Products } from './Products';
import { CompanyStock } from './CompanyStock';
import { StockAlerts } from '../admin/StockAlerts';
import { ExpiryTracking } from '../admin/ExpiryTracking';
import { DamageTracking } from '../admin/DamageTracking';
import './Stock.css';

type ProductsTab = 'products' | 'companyStock' | 'stockAlerts' | 'expiryTracking' | 'damageTracking';

// Single "Products" page hosting Products, Company Stock, Stock Alerts,
// Expiry Tracking, and Damage Tracking as tabs — same consolidation pattern as
// Settings and Attendance Mgmt. Each tab renders the existing, unmodified page
// component.
export function ProductsHub() {
  const { currentUser } = useStore();
  const canViewProducts = !!currentUser?.permissions?.products?.view;
  const canViewCompanyStock = !!currentUser?.permissions?.companyStock?.view;
  const canViewStockAlerts = !!currentUser?.permissions?.stockAlerts?.view;
  const canViewExpiryTracking = !!currentUser?.permissions?.expiryTracking?.view;
  const canViewDamageTracking = !!currentUser?.permissions?.damageTracking?.view;

  const tabs: { key: ProductsTab; label: string; icon: typeof Package }[] = [
    ...(canViewProducts ? [{ key: 'products' as const, label: 'Products', icon: Package }] : []),
    ...(canViewCompanyStock ? [{ key: 'companyStock' as const, label: 'Company Stock', icon: Boxes }] : []),
    ...(canViewStockAlerts ? [{ key: 'stockAlerts' as const, label: 'Stock Alerts', icon: AlertTriangle }] : []),
    ...(canViewExpiryTracking ? [{ key: 'expiryTracking' as const, label: 'Expiry Tracking', icon: CalendarClock }] : []),
    ...(canViewDamageTracking ? [{ key: 'damageTracking' as const, label: 'Damage Tracking', icon: Trash2 }] : []),
  ];

  const [activeTab, setActiveTab] = useState<ProductsTab>(tabs[0]?.key ?? 'products');

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Product catalog and company-wide stock levels</p>
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

      {activeTab === 'products' && canViewProducts && <Products />}
      {activeTab === 'companyStock' && canViewCompanyStock && <CompanyStock />}
      {activeTab === 'stockAlerts' && canViewStockAlerts && <StockAlerts />}
      {activeTab === 'expiryTracking' && canViewExpiryTracking && <ExpiryTracking />}
      {activeTab === 'damageTracking' && canViewDamageTracking && <DamageTracking />}
    </div>
  );
}
