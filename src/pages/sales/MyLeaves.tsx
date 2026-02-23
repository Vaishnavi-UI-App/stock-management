import { useState, useEffect } from 'react';
import {
  CalendarDays, Plus, Clock, CheckCircle, XCircle, X, Send
} from 'lucide-react';
import { leavesApi } from '../../services/api';
import './Sales.css';

const leaveTypes = [
  { value: 'casual', label: 'Casual Leave' },
  { value: 'sick', label: 'Sick Leave' },
  { value: 'earned', label: 'Earned Leave' },
  { value: 'unpaid', label: 'Unpaid Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
];

export function MyLeaves() {
  const [leaves, setLeaves] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [leaveType, setLeaveType] = useState('casual');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    fetchLeaves();
  }, []);

  const fetchLeaves = async () => {
    setIsLoading(true);
    try {
      const data = await leavesApi.getAll();
      setLeaves(data);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setLeaveType('casual');
    setStartDate('');
    setEndDate('');
    setReason('');
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      alert('Please select start and end dates');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      alert('End date cannot be before start date');
      return;
    }
    if (!reason.trim()) {
      alert('Please provide a reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await leavesApi.create({ leaveType, startDate, endDate, reason });
      setShowApplyModal(false);
      resetForm();
      fetchLeaves();
    } catch (error: any) {
      alert(error.message || 'Failed to apply for leave');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDays = (start: string, end: string) => {
    const diff = new Date(end).getTime() - new Date(start).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1);
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { bg: string; color: string; icon: any }> = {
      pending: { bg: '#fff3cd', color: '#856404', icon: <Clock size={14} /> },
      approved: { bg: '#d4edda', color: '#155724', icon: <CheckCircle size={14} /> },
      rejected: { bg: '#f8d7da', color: '#721c24', icon: <XCircle size={14} /> },
    };
    const s = map[status] || { bg: '#e5e7eb', color: '#374151', icon: null };
    return (
      <span style={{ background: s.bg, color: s.color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {s.icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>My Leaves</h1>
          <p>Apply for leave and view your leave history</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowApplyModal(true)} style={{ background: '#00a651' }}>
          <Plus size={18} />
          Apply for Leave
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total', value: leaves.length, bg: '#e3f2fd', color: '#1565c0' },
          { label: 'Pending', value: leaves.filter(l => l.status === 'pending').length, bg: '#fff3cd', color: '#856404' },
          { label: 'Approved', value: leaves.filter(l => l.status === 'approved').length, bg: '#d4edda', color: '#155724' },
          { label: 'Rejected', value: leaves.filter(l => l.status === 'rejected').length, bg: '#f8d7da', color: '#721c24' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, padding: '14px', borderRadius: '10px' }}>
            <div style={{ fontSize: '13px', color: c.color }}>{c.label}</div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Leave History */}
      {isLoading ? (
        <div className="loading">Loading leaves...</div>
      ) : leaves.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <CalendarDays size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <h3>No leave records</h3>
          <p style={{ color: '#6b7280' }}>Apply for your first leave using the button above</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Days</th>
                <th>Reason</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {leaves.map((leave: any) => (
                <tr key={leave.id || leave._id}>
                  <td style={{ textTransform: 'capitalize', fontWeight: '600' }}>{leave.leaveType || leave.type || '-'}</td>
                  <td>{leave.startDate ? new Date(leave.startDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td>{leave.endDate ? new Date(leave.endDate).toLocaleDateString('en-IN') : '-'}</td>
                  <td style={{ fontWeight: '600' }}>{leave.startDate && leave.endDate ? getDays(leave.startDate, leave.endDate) : '-'}</td>
                  <td style={{ maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {leave.reason || '-'}
                  </td>
                  <td>
                    {getStatusBadge(leave.status)}
                    {leave.status === 'rejected' && leave.rejectionReason && (
                      <div style={{ fontSize: '11px', color: '#721c24', marginTop: '4px' }}>{leave.rejectionReason}</div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="modal-overlay" onClick={() => setShowApplyModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>Apply for Leave</h2>
              <button className="modal-close" onClick={() => { setShowApplyModal(false); resetForm(); }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleApply}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Leave Type</label>
                  <select className="form-select" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
                    {leaveTypes.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="date"
                      className="form-input"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                </div>
                {startDate && endDate && new Date(endDate) >= new Date(startDate) && (
                  <div style={{ background: '#e6f9ef', padding: '8px 12px', borderRadius: '8px', fontSize: '13px', color: '#00a651', marginBottom: '12px' }}>
                    Total Days: <strong>{getDays(startDate, endDate)}</strong>
                  </div>
                )}
                <div className="form-group">
                  <label className="form-label">Reason</label>
                  <textarea
                    className="form-input"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Enter reason for leave..."
                    rows={3}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => { setShowApplyModal(false); resetForm(); }}>Cancel</button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ background: '#00a651' }}
                  disabled={isSubmitting}
                >
                  <Send size={16} />
                  {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
