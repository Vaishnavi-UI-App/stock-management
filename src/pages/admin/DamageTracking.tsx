import { useState, useEffect } from 'react';
import {
  AlertTriangle, Plus, Clock, CheckCircle, X, Package,
  Trash2, Building2, User
} from 'lucide-react';
import { damagesApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

export function DamageTracking() {
  const { products, branches, currentUser } = useStore();
  const isBranchManager = currentUser?.role === 'branch_manager';
  const [damages, setDamages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

  // Form
  const [productId, setProductId] = useState('');
  const [branchId, setBranchId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchDamages();
  }, []);

  const fetchDamages = async () => {
    setIsLoading(true);
    try {
      const data = await damagesApi.getAll();
      setDamages(data);
    } catch (error) {
      console.error('Failed to fetch damages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setProductId('');
    setBranchId(isBranchManager && currentUser?.branchId ? currentUser.branchId : '');
    setQuantity(1);
    setReason('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { alert('Please select a product'); return; }
    if (quantity <= 0) { alert('Quantity must be greater than 0'); return; }
    if (!reason.trim()) { alert('Please provide a reason'); return; }

    setIsSubmitting(true);
    try {
      await damagesApi.create({ productId, branchId: branchId || undefined, quantity, reason });
      setShowAddModal(false);
      resetForm();
      fetchDamages();
    } catch (error: any) {
      alert(error.message || 'Failed to report damage');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this damage record? Stock will be deducted.')) return;
    try {
      await damagesApi.approve(id);
      fetchDamages();
    } catch (error: any) {
      alert(error.message || 'Failed to approve');
    }
  };

  const summary = {
    total: damages.length,
    pending: damages.filter(d => d.status === 'pending').length,
    approved: damages.filter(d => d.status === 'approved').length,
    totalQtyLost: damages.filter(d => d.status === 'approved').reduce((sum: number, d: any) => sum + (d.quantity || 0), 0),
  };

  const filteredDamages = damages.filter(d => {
    if (filter === 'all') return true;
    return d.status === filter;
  });

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; color: string; border: string; icon: any; label: string }> = {
      pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: <Clock size={14} />, label: 'Pending' },
      approved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: <CheckCircle size={14} />, label: 'Approved' },
    };
    return config[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', icon: null, label: status };
  };

  const summaryCards = [
    { label: 'Total Records', value: summary.total, icon: <Package size={22} />, gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
    { label: 'Pending Review', value: summary.pending, icon: <Clock size={22} />, gradient: 'linear-gradient(135deg, #d97706, #f59e0b)' },
    { label: 'Approved', value: summary.approved, icon: <CheckCircle size={22} />, gradient: 'linear-gradient(135deg, #15803d, #22c55e)' },
    { label: 'Total Qty Lost', value: summary.totalQtyLost, icon: <AlertTriangle size={22} />, gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)' },
  ];

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trash2 size={28} style={{ color: '#ef4444' }} />
            Damage Tracking
          </h1>
          <p>Report and manage damaged stock records</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
          style={{ background: '#ef4444', border: 'none', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 4px 12px rgba(239,68,68,0.3)' }}
        >
          <Plus size={18} />
          Report Damage
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
        {summaryCards.map((card) => (
          <div key={card.label} style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '20px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '14px',
              background: card.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', flexShrink: 0
            }}>
              {card.icon}
            </div>
            <div>
              <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '2px' }}>{card.label}</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#0f172a', lineHeight: 1 }}>{card.value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['all', 'pending', 'approved'] as const).map((tab) => {
          const isActive = filter === tab;
          return (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: isActive ? '2px solid #2563eb' : '2px solid #e2e8f0',
                background: isActive ? '#2563eb' : '#ffffff',
                color: isActive ? '#ffffff' : '#475569',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'pending' && summary.pending > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.3)' : '#ef4444',
                  color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700
                }}>
                  {summary.pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Damage Records */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}></div>
          Loading damage records...
        </div>
      ) : filteredDamages.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <AlertTriangle size={56} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <h3 style={{ color: '#334155', margin: '0 0 8px' }}>No damage records</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>Report damaged stock using the button above</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredDamages.map((d: any) => {
            const statusCfg = getStatusConfig(d.status);
            return (
              <div key={d.id || d._id} style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: '1px solid #f1f5f9',
                borderLeft: `4px solid ${statusCfg.color}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Date */}
                <div style={{
                  flex: '0 0 auto', textAlign: 'center', padding: '8px 12px',
                  background: '#f8fafc', borderRadius: '10px', minWidth: '60px'
                }}>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', lineHeight: 1 }}>
                    {d.createdAt ? new Date(d.createdAt).getDate().toString().padStart(2, '0') : '--'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                    {d.createdAt ? new Date(d.createdAt).toLocaleString('en-IN', { month: 'short' }) : ''}
                  </div>
                </div>

                {/* Product */}
                <div style={{ flex: '1 1 180px', minWidth: '150px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #ef4444, #f97316)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', flexShrink: 0
                    }}>
                      <Package size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
                        {d.product?.name || d.productName || 'Unknown Product'}
                      </div>
                      {d.product?.sku && (
                        <div style={{ fontSize: '12px', color: '#94a3b8' }}>SKU: {d.product.sku}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Qty Damaged</div>
                  <div style={{
                    fontSize: '22px', fontWeight: 700, color: '#ef4444',
                    background: '#fef2f2', padding: '4px 16px', borderRadius: '10px',
                    border: '1px solid #fecaca'
                  }}>
                    {d.quantity}
                  </div>
                </div>

                {/* Branch */}
                <div style={{ flex: '0 0 auto' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Location</div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '4px 12px', borderRadius: '8px', background: '#f1f5f9',
                    fontWeight: 500, fontSize: '13px', color: '#334155'
                  }}>
                    <Building2 size={14} style={{ color: '#64748b' }} />
                    {d.branch?.name || d.branchName || 'Company Stock'}
                  </div>
                </div>

                {/* Reason */}
                <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Reason</div>
                  <div style={{
                    fontSize: '13px', color: '#475569',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px'
                  }} title={d.reason}>
                    {d.reason || '-'}
                  </div>
                </div>

                {/* Reported By */}
                <div style={{ flex: '0 0 auto' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Reported By</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
                    <User size={14} style={{ color: '#6366f1' }} />
                    {d.reportedBy?.name || d.userName || '-'}
                  </div>
                </div>

                {/* Status */}
                <div style={{ flex: '0 0 auto' }}>
                  <span style={{
                    background: statusCfg.bg,
                    color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`,
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ flex: '0 0 auto' }}>
                  {d.status === 'pending' && (
                    <button
                      onClick={() => handleApprove(d.id || d._id)}
                      title="Approve (deduct stock)"
                      style={{
                        padding: '8px 16px', borderRadius: '10px', border: 'none',
                        background: '#f0fdf4', color: '#15803d', fontWeight: 600,
                        fontSize: '13px', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                      }}
                    >
                      <CheckCircle size={16} /> Approve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <h2 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <AlertTriangle size={20} />
                Report Damage
              </h2>
              <button className="modal-close" onClick={() => { setShowAddModal(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body" style={{ padding: '24px' }}>
                <div className="form-group">
                  <label className="form-label">Product *</label>
                  <select className="form-select" value={productId} onChange={(e) => setProductId(e.target.value)} required style={{ borderRadius: '10px' }}>
                    <option value="">Select Product</option>
                    {products.map((p: any) => (
                      <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                {!isBranchManager && (
                  <div className="form-group">
                    <label className="form-label">Branch (optional)</label>
                    <select className="form-select" value={branchId} onChange={(e) => setBranchId(e.target.value)} style={{ borderRadius: '10px' }}>
                      <option value="">Company Stock</option>
                      {branches.map((b: any) => (
                        <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Quantity *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                    min={1}
                    required
                    style={{ borderRadius: '10px' }}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Reason *</label>
                  <textarea
                    className="form-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Describe how the damage occurred..."
                    rows={3}
                    required
                    style={{ borderRadius: '10px' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 24px', gap: '12px' }}>
                <button type="button" className="btn" onClick={() => { setShowAddModal(false); resetForm(); }} style={{ borderRadius: '10px' }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#ef4444', border: 'none', borderRadius: '10px', fontWeight: 600 }}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : 'Report Damage'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
