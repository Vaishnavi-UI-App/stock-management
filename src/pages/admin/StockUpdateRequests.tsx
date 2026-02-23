import { useState, useEffect } from 'react';
import {
  ClipboardList,
  CheckCircle,
  XCircle,
  Clock,
  Package,
  Plus,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { format } from 'date-fns';
import { stockUpdateRequestsApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import type { StockUpdateRequest } from '../../types';
import '../stock/Stock.css';

export function StockUpdateRequests() {
  const { currentUser, products } = useStore();
  const isAdmin = currentUser?.role === 'stock_manager';
  const isBranchManager = currentUser?.role === 'branch_manager';

  const [requests, setRequests] = useState<StockUpdateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<StockUpdateRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({
    productId: '',
    requestedQuantity: 0,
    reason: ''
  });

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    try {
      setRefreshing(true);
      const filterParam = filter === 'all' ? undefined : filter;
      const data = await stockUpdateRequestsApi.getAll({ status: filterParam });
      setRequests(data);
    } catch (error) {
      console.error('Failed to fetch stock requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleCreate = async () => {
    if (!createForm.productId || !currentUser?.branchId) return;
    try {
      await stockUpdateRequestsApi.create({
        branchId: currentUser.branchId,
        productId: createForm.productId,
        requestedQuantity: createForm.requestedQuantity,
        requestType: 'update_quantity',
        reason: createForm.reason || undefined
      });
      setShowCreateModal(false);
      setCreateForm({ productId: '', requestedQuantity: 0, reason: '' });
      fetchRequests();
    } catch (error: any) {
      alert(error.message || 'Failed to create request');
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this stock update? The branch stock will be updated immediately.')) return;
    try {
      await stockUpdateRequestsApi.approve(id);
      fetchRequests();
    } catch (error: any) {
      alert(error.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    try {
      await stockUpdateRequestsApi.reject(selectedRequest.id, rejectReason);
      setShowRejectModal(false);
      setSelectedRequest(null);
      setRejectReason('');
      fetchRequests();
    } catch (error: any) {
      alert(error.message || 'Failed to reject');
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, { bg: string; color: string; label: string }> = {
      pending: { bg: '#fffbeb', color: '#d97706', label: 'Pending' },
      approved: { bg: '#f0fdf4', color: '#15803d', label: 'Approved' },
      rejected: { bg: '#fef2f2', color: '#b91c1c', label: 'Rejected' }
    };
    const s = styles[status] || styles.pending;
    return (
      <span style={{ padding: '0.25rem 0.5rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: 500, background: s.bg, color: s.color }}>
        {s.label}
      </span>
    );
  };

  // Summary counts
  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const approvedCount = requests.filter(r => r.status === 'approved').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  if (loading) {
    return (
      <div className="stock-page">
        <div className="page-header"><h1>Stock Update Requests</h1></div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1><ClipboardList size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />Stock Update Requests</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>
            {isAdmin ? 'Review and approve branch stock change requests' : 'Submit stock update requests for admin approval'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {isBranchManager && (
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              <Plus size={16} /> New Request
            </button>
          )}
          <button className="btn btn-secondary" onClick={fetchRequests} disabled={refreshing}>
            <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filter === 'all' ? '2px solid #3b82f6' : undefined }} onClick={() => setFilter('all')}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{requests.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filter === 'pending' ? '2px solid #d97706' : undefined }} onClick={() => setFilter('pending')}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#d97706' }}>{pendingCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pending</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filter === 'approved' ? '2px solid #15803d' : undefined }} onClick={() => setFilter('approved')}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#15803d' }}>{approvedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Approved</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', border: filter === 'rejected' ? '2px solid #b91c1c' : undefined }} onClick={() => setFilter('rejected')}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#b91c1c' }}>{rejectedCount}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rejected</div>
        </div>
      </div>

      {/* Request List */}
      <div className="card">
        <div className="card-header">
          <h2>Requests</h2>
        </div>
        <div className="card-body">
          {requests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
              No stock update requests found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {requests.map((req) => (
                <div
                  key={req.id}
                  style={{
                    padding: '1rem',
                    borderRadius: '0.5rem',
                    border: '1px solid #e2e8f0',
                    borderLeft: `4px solid ${req.status === 'pending' ? '#d97706' : req.status === 'approved' ? '#15803d' : '#b91c1c'}`,
                    background: 'white'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Package size={16} />
                        {req.product?.name || 'Unknown Product'}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                        {req.branch?.name || 'Unknown Branch'}
                        {req.requestedByUser && ` - by ${req.requestedByUser.name}`}
                      </div>
                    </div>
                    {getStatusBadge(req.status)}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.875rem' }}>
                    <span style={{ padding: '0.25rem 0.5rem', background: '#f1f5f9', borderRadius: '0.25rem', fontWeight: '600' }}>
                      {req.currentQuantity ?? 0}
                    </span>
                    <ArrowRight size={14} color="#64748b" />
                    <span style={{ padding: '0.25rem 0.5rem', background: '#dbeafe', borderRadius: '0.25rem', fontWeight: '600', color: '#1e40af' }}>
                      {req.requestedQuantity}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>units</span>
                  </div>

                  {req.reason && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#64748b', fontStyle: 'italic' }}>
                      Reason: {req.reason}
                    </div>
                  )}

                  {req.rejectionReason && (
                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#b91c1c' }}>
                      Rejection: {req.rejectionReason}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                      {format(new Date(req.createdAt), 'dd MMM yyyy, HH:mm')}
                    </div>
                    {isAdmin && req.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => handleApprove(req.id)}>
                          <CheckCircle size={14} /> Approve
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: '#b91c1c' }}
                          onClick={() => { setSelectedRequest(req); setShowRejectModal(true); }}
                        >
                          <XCircle size={14} /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>New Stock Update Request</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>
                <XCircle size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Product *</label>
                <select
                  className="form-input"
                  value={createForm.productId}
                  onChange={e => setCreateForm({ ...createForm, productId: e.target.value })}
                >
                  <option value="">-- Select Product --</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Requested Quantity *</label>
                <input
                  type="number"
                  className="form-input"
                  min="0"
                  value={createForm.requestedQuantity || ''}
                  onChange={e => setCreateForm({ ...createForm, requestedQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Why is this change needed?"
                  value={createForm.reason}
                  onChange={e => setCreateForm({ ...createForm, reason: e.target.value })}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleCreate}
                disabled={!createForm.productId || createForm.requestedQuantity <= 0}
              >
                <Plus size={16} /> Submit Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Reject Request</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <XCircle size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '1rem', color: '#64748b' }}>
                Reject stock update for <strong>{selectedRequest.product?.name}</strong>?
              </p>
              <div className="form-group">
                <label>Rejection Reason</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Provide a reason..."
                  value={rejectReason}
                  onChange={e => setRejectReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ background: '#b91c1c' }} onClick={handleReject}>
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
