import { useState, useEffect } from 'react';
import { AlertTriangle, Package, CheckCircle, XCircle, Edit3, Save, ShieldAlert } from 'lucide-react';
import { stockAlertsApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

export function StockAlerts() {
  const { products, fetchProducts, currentUser } = useStore();
  const isBranchManager = currentUser?.role === 'branch_manager';
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
    if (products.length === 0) fetchProducts();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const alertsData = await stockAlertsApi.getAlerts();
      setAlerts(alertsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (product: any) => {
    const currentStock = product.currentStock ?? product.quantity ?? 0;
    const reorderPoint = product.reorderPoint ?? 10;
    if (currentStock === 0) return 'out_of_stock';
    if (currentStock <= reorderPoint) return 'low_stock';
    return 'healthy';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'out_of_stock': return { bg: '#fee2e2', color: '#dc2626', text: 'Out of Stock' };
      case 'low_stock': return { bg: '#fff3cd', color: '#856404', text: 'Low Stock' };
      default: return { bg: '#d4edda', color: '#155724', text: 'Healthy' };
    }
  };

  const handleEditReorder = (productId: string, currentValue: number) => {
    setEditingId(productId);
    setEditValue(currentValue);
  };

  const handleSaveReorder = async (productId: string) => {
    try {
      await stockAlertsApi.setReorderPoint(productId, editValue);
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to update reorder point');
    }
  };

  // Combine alerts with products for a comprehensive view
  const allProducts = alerts.length > 0 ? alerts : products.map(p => ({
    ...p,
    currentStock: (p as any).currentStock ?? (p as any).quantity ?? 0,
    reorderPoint: (p as any).reorderPoint ?? 10
  }));

  const filteredProducts = filterStatus === 'all'
    ? allProducts
    : allProducts.filter(p => getStockStatus(p) === filterStatus);

  const totalProducts = allProducts.length;
  const lowStock = allProducts.filter(p => getStockStatus(p) === 'low_stock').length;
  const outOfStock = allProducts.filter(p => getStockStatus(p) === 'out_of_stock').length;
  const healthy = allProducts.filter(p => getStockStatus(p) === 'healthy').length;

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
            <ShieldAlert size={24} color="#00a651" /> Stock Alerts
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>Monitor stock levels and set reorder points</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Products', value: totalProducts, icon: <Package size={20} />, color: '#6366f1', filter: 'all' },
          { label: 'Low Stock', value: lowStock, icon: <AlertTriangle size={20} />, color: '#f59e0b', filter: 'low_stock' },
          { label: 'Out of Stock', value: outOfStock, icon: <XCircle size={20} />, color: '#ef4444', filter: 'out_of_stock' },
          { label: 'Healthy Stock', value: healthy, icon: <CheckCircle size={20} />, color: '#22c55e', filter: 'healthy' },
        ].map((card, i) => (
          <div
            key={i}
            onClick={() => setFilterStatus(card.filter)}
            style={{ background: filterStatus === card.filter ? `${card.color}10` : '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: filterStatus === card.filter ? `2px solid ${card.color}` : '1px solid #e2e8f0', cursor: 'pointer', transition: 'all 0.2s' }}
          >
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

      {/* Products Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Product', 'SKU', 'Current Stock', 'Reorder Point', 'Status', ...(isBranchManager ? [] : ['Action'])].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No products found</td></tr>
              ) : (
                filteredProducts.map((product, idx) => {
                  const status = getStockStatus(product);
                  const badge = getStatusBadge(status);
                  const currentStock = product.currentStock ?? product.quantity ?? 0;
                  const reorderPoint = product.reorderPoint ?? 10;
                  const isEditing = editingId === product.id;
                  return (
                    <tr key={product.id || idx} style={{ borderBottom: '1px solid #f1f5f9', background: status === 'out_of_stock' ? '#fef2f2' : status === 'low_stock' ? '#fffbeb' : 'transparent' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600 }}>{product.name}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b' }}>{product.sku || product.code || '--'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600, color: status === 'out_of_stock' ? '#dc2626' : status === 'low_stock' ? '#d97706' : '#1e293b' }}>
                        {currentStock}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <input
                              type="number"
                              value={editValue}
                              onChange={e => setEditValue(Number(e.target.value))}
                              min={0}
                              style={{ width: 70, padding: '4px 8px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                            />
                            <button onClick={() => handleSaveReorder(product.id)} style={{ background: '#00a651', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}>
                              <Save size={14} />
                            </button>
                            <button onClick={() => setEditingId(null)} style={{ background: '#e2e8f0', color: '#64748b', border: 'none', borderRadius: 4, padding: '4px 6px', cursor: 'pointer' }}>
                              <XCircle size={14} />
                            </button>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.875rem' }}>{reorderPoint}</span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{badge.text}</span>
                      </td>
                      {!isBranchManager && (
                        <td style={{ padding: '12px 16px' }}>
                          {!isEditing && (
                            <button onClick={() => handleEditReorder(product.id, reorderPoint)} style={{ background: '#f0fdf4', color: '#00a651', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <Edit3 size={14} /> Edit Reorder
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
