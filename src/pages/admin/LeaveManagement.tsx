import { useState, useEffect } from 'react';
import {
  CalendarDays, Clock, CheckCircle, XCircle, X,
  FileText, Users, Calendar
} from 'lucide-react';
import { leavesApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

export function LeaveManagement() {
  const { currentUser } = useStore();
  const isBranchManager = currentUser?.role === 'branch_manager';
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  const [summary, setSummary] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });

  useEffect(() => {
    fetchLeaves();
  }, [filter]);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const data = await leavesApi.getAll(filter === 'all' ? undefined : filter);
      setLeaves(data);
      // Compute summary from full data
      const all = await leavesApi.getAll();
      setSummary({
        total: all.length,
        pending: all.filter((l: any) => l.status === 'pending').length,
        approved: all.filter((l: any) => l.status === 'approved').length,
        rejected: all.filter((l: any) => l.status === 'rejected').length,
      });
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Approve this leave request?')) return;
    try {
      await leavesApi.approve(id);
      fetchLeaves();
    } catch (error: any) {
      alert(error.message || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!selectedLeave) return;
    try {
      await leavesApi.reject(selectedLeave.id || selectedLeave._id, rejectionReason);
      setShowRejectModal(false);
      setRejectionReason('');
      setSelectedLeave(null);
      fetchLeaves();
    } catch (error: any) {
      alert(error.message || 'Failed to reject');
    }
  };

  const getDays = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; color: string; border: string; icon: any; label: string }> = {
      pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: <Clock size={14} />, label: 'Pending' },
      approved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: <CheckCircle size={14} />, label: 'Approved' },
      rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: <XCircle size={14} />, label: 'Rejected' },
    };
    return config[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', icon: null, label: status };
  };

  const summaryCards = [
    { label: 'Total Requests', value: summary.total, icon: <FileText size={22} />, gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)', lightBg: '#eff6ff' },
    { label: 'Pending', value: summary.pending, icon: <Clock size={22} />, gradient: 'linear-gradient(135deg, #d97706, #f59e0b)', lightBg: '#fffbeb' },
    { label: 'Approved', value: summary.approved, icon: <CheckCircle size={22} />, gradient: 'linear-gradient(135deg, #15803d, #22c55e)', lightBg: '#f0fdf4' },
    { label: 'Rejected', value: summary.rejected, icon: <XCircle size={22} />, gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)', lightBg: '#fef2f2' },
  ];

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays size={28} style={{ color: '#2563eb' }} />
            {isBranchManager ? 'Branch Leave Management' : 'Leave Management'}
          </h1>
          <p>{isBranchManager ? 'Review and manage your branch employee leave requests' : 'Review and manage employee leave requests'}</p>
        </div>
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

      {/* Status Filter Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => {
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
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 700
                }}>
                  {summary.pending}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Leave Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}></div>
          Loading leave requests...
        </div>
      ) : leaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <CalendarDays size={56} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <h3 style={{ color: '#334155', margin: '0 0 8px' }}>No leave requests found</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>No requests match the selected filter</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {leaves.map((leave: any) => {
            const statusCfg = getStatusConfig(leave.status);
            const days = leave.startDate && leave.endDate ? getDays(leave.startDate, leave.endDate) : 0;
            return (
              <div key={leave.id || leave._id} style={{
                background: '#ffffff',
                borderRadius: '14px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                border: `1px solid #f1f5f9`,
                borderLeft: `4px solid ${statusCfg.color}`,
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '16px'
              }}>
                {/* Employee Info */}
                <div style={{ flex: '1 1 200px', minWidth: '180px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '14px', flexShrink: 0
                    }}>
                      {(leave.user?.name || leave.userName || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', color: '#0f172a' }}>
                        {leave.user?.name || leave.userName || 'Unknown'}
                      </div>
                      {(leave.user?.employeeCode || leave.employeeCode) && (
                        <div style={{ fontSize: '12px', color: '#6366f1' }}>
                          {leave.user?.employeeCode || leave.employeeCode}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Leave Type */}
                <div style={{ flex: '0 0 auto', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Type</div>
                  <div style={{
                    padding: '4px 12px', borderRadius: '8px', background: '#f1f5f9',
                    fontWeight: 600, fontSize: '13px', color: '#334155', textTransform: 'capitalize'
                  }}>
                    {leave.leaveType || leave.type || '-'}
                  </div>
                </div>

                {/* Date Range */}
                <div style={{ flex: '1 1 180px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={16} style={{ color: '#94a3b8', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                      {leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '-'}
                      {' '}&rarr;{' '}
                      {leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                    </div>
                    <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 600 }}>{days} day{days !== 1 ? 's' : ''}</div>
                  </div>
                </div>

                {/* Reason */}
                <div style={{ flex: '1 1 200px', minWidth: '150px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Reason</div>
                  <div style={{ fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '250px' }}>
                    {leave.reason || '-'}
                  </div>
                </div>

                {/* Status Badge */}
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
                <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                  {leave.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(leave.id || leave._id)}
                        title="Approve"
                        style={{
                          padding: '8px 16px', borderRadius: '10px', border: 'none',
                          background: '#f0fdf4', color: '#15803d', fontWeight: 600,
                          fontSize: '13px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                        }}
                      >
                        <CheckCircle size={16} /> Approve
                      </button>
                      <button
                        onClick={() => { setSelectedLeave(leave); setShowRejectModal(true); }}
                        title="Reject"
                        style={{
                          padding: '8px 16px', borderRadius: '10px', border: 'none',
                          background: '#fef2f2', color: '#b91c1c', fontWeight: 600,
                          fontSize: '13px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: '6px', transition: 'all 0.2s'
                        }}
                      >
                        <XCircle size={16} /> Reject
                      </button>
                    </>
                  )}
                  {leave.status === 'rejected' && leave.rejectionReason && (
                    <span style={{
                      fontSize: '12px', color: '#b91c1c', fontStyle: 'italic',
                      maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                    }} title={leave.rejectionReason}>
                      {leave.rejectionReason}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedLeave && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <h2 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <XCircle size={20} />
                Reject Leave Request
              </h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{
                background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px',
                display: 'flex', alignItems: 'center', gap: '12px'
              }}>
                <Users size={18} style={{ color: '#6366f1' }} />
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>
                    {selectedLeave.user?.name || selectedLeave.userName || 'Employee'}
                  </div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Leave request will be rejected</div>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reason for Rejection</label>
                <textarea
                  className="form-input"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                  style={{ borderRadius: '10px' }}
                />
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', gap: '12px' }}>
              <button className="btn" onClick={() => setShowRejectModal(false)} style={{ borderRadius: '10px' }}>Cancel</button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: 'white', borderRadius: '10px', fontWeight: 600 }}
                onClick={handleReject}
              >
                Reject Leave
              </button>
            </div>
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
