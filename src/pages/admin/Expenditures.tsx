import { useState, useEffect } from 'react';
import {
  Receipt, Download,
  Clock, CheckCircle, XCircle, Eye, X, Filter
} from 'lucide-react';
import { expendituresApi, usersApi } from '../../services/api';
import type { Expenditure, User as UserType } from '../../types';
import { format } from 'date-fns';
import '../stock/Stock.css';

export function Expenditures() {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedExpenditure, setSelectedExpenditure] = useState<Expenditure | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Filters
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  // Summary
  const [summary, setSummary] = useState({
    pending: { count: 0, amount: 0 },
    approved: { count: 0, amount: 0 },
    rejected: { count: 0, amount: 0 },
    total: { count: 0, amount: 0 }
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchExpenditures();
    fetchSummary();
  }, [filter, selectedUser, selectedMonth, selectedYear]);

  const fetchUsers = async () => {
    try {
      const data = await usersApi.getAll();
      // Filter to show only salesmen
      setUsers(data.filter((u: any) => u.role === 'salesman'));
    } catch (error) {
      console.error('Failed to fetch users:', error);
    }
  };

  const fetchExpenditures = async () => {
    setIsLoading(true);
    try {
      const data = await expendituresApi.getAll({
        status: filter === 'all' ? undefined : filter,
        userId: selectedUser || undefined,
        month: selectedMonth,
        year: selectedYear
      });
      setExpenditures(data);
    } catch (error) {
      console.error('Failed to fetch expenditures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const data = await expendituresApi.getSummary({
        userId: selectedUser || undefined,
        month: selectedMonth,
        year: selectedYear
      });
      setSummary(data);
    } catch (error) {
      console.error('Failed to fetch summary:', error);
    }
  };

  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this expenditure?')) {
      return;
    }

    try {
      await expendituresApi.approve(id);
      fetchExpenditures();
      fetchSummary();
      if (showViewModal) setShowViewModal(false);
    } catch (error: any) {
      alert(error.message || 'Failed to approve expenditure');
    }
  };

  const handleReject = async () => {
    if (!selectedExpenditure) return;

    try {
      await expendituresApi.reject(selectedExpenditure.id, rejectionReason);
      setShowRejectModal(false);
      setShowViewModal(false);
      setRejectionReason('');
      fetchExpenditures();
      fetchSummary();
    } catch (error: any) {
      alert(error.message || 'Failed to reject expenditure');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="status-badge" style={{ background: '#fff3cd', color: '#856404', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={14} /> Pending
          </span>
        );
      case 'approved':
        return (
          <span className="status-badge" style={{ background: '#d4edda', color: '#155724', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={14} /> Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="status-badge" style={{ background: '#f8d7da', color: '#721c24', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
            <XCircle size={14} /> Rejected
          </span>
        );
      default:
        return null;
    }
  };

  const viewExpenditure = (exp: Expenditure) => {
    setSelectedExpenditure(exp);
    setShowViewModal(true);
  };

  const downloadReport = () => {
    // Generate CSV
    const monthName = new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' });
    let csvContent = `EXPENDITURE REPORT - ${monthName} ${selectedYear}\n`;
    csvContent += selectedUser ? `Employee: ${users.find(u => u.id === selectedUser)?.name || 'Unknown'}\n` : 'All Employees\n';
    csvContent += '\n';
    csvContent += 'Date,Employee,Employee Code,Description,Amount,Status,Rejection Reason\n';

    expenditures.forEach(exp => {
      csvContent += [
        format(new Date(exp.date), 'dd/MM/yyyy'),
        `"${exp.user?.name || 'Unknown'}"`,
        exp.user?.employeeCode || '-',
        `"${exp.description.replace(/"/g, '""')}"`,
        exp.amount.toFixed(2),
        exp.status.toUpperCase(),
        `"${exp.rejectionReason || ''}"`
      ].join(',') + '\n';
    });

    csvContent += '\n';
    csvContent += `SUMMARY\n`;
    csvContent += `Total Entries,${summary.total.count}\n`;
    csvContent += `Total Amount,${summary.total.amount.toFixed(2)}\n`;
    csvContent += `Approved,${summary.approved.count} entries - ₹${summary.approved.amount.toFixed(2)}\n`;
    csvContent += `Pending,${summary.pending.count} entries - ₹${summary.pending.amount.toFixed(2)}\n`;
    csvContent += `Rejected,${summary.rejected.count} entries - ₹${summary.rejected.amount.toFixed(2)}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const fileName = `Expenditure_Report_${monthName}_${selectedYear}${selectedUser ? `_${users.find(u => u.id === selectedUser)?.name || 'user'}` : ''}.csv`;
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const months = [
    { value: 1, label: 'January' },
    { value: 2, label: 'February' },
    { value: 3, label: 'March' },
    { value: 4, label: 'April' },
    { value: 5, label: 'May' },
    { value: 6, label: 'June' },
    { value: 7, label: 'July' },
    { value: 8, label: 'August' },
    { value: 9, label: 'September' },
    { value: 10, label: 'October' },
    { value: 11, label: 'November' },
    { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Employee Expenditures</h1>
          <p>Review and manage employee expense claims</p>
        </div>
        <button className="btn btn-primary" onClick={downloadReport}>
          <Download size={18} />
          Download Report
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stock-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="summary-card" style={{ background: '#fff3cd', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#856404' }}>
            {summary.pending.count}
          </div>
          <div style={{ fontSize: '13px', color: '#856404' }}>Pending Approval</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#856404', marginTop: '4px' }}>
            ₹{summary.pending.amount.toLocaleString()}
          </div>
        </div>
        <div className="summary-card" style={{ background: '#d4edda', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#155724' }}>
            {summary.approved.count}
          </div>
          <div style={{ fontSize: '13px', color: '#155724' }}>Approved</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#155724', marginTop: '4px' }}>
            ₹{summary.approved.amount.toLocaleString()}
          </div>
        </div>
        <div className="summary-card" style={{ background: '#f8d7da', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#721c24' }}>
            {summary.rejected.count}
          </div>
          <div style={{ fontSize: '13px', color: '#721c24' }}>Rejected</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#721c24', marginTop: '4px' }}>
            ₹{summary.rejected.amount.toLocaleString()}
          </div>
        </div>
        <div className="summary-card" style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1565c0' }}>
            {summary.total.count}
          </div>
          <div style={{ fontSize: '13px', color: '#1565c0' }}>Total Claims</div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1565c0', marginTop: '4px' }}>
            ₹{summary.total.amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={18} />
          <span style={{ fontWeight: '600' }}>Filters</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Employee</label>
            <select
              className="form-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">All Employees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.employeeCode ? `(${user.employeeCode})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Month</label>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '100px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Year</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        {(['pending', 'approved', 'rejected', 'all'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'pending' && summary.pending.count > 0 && (
              <span style={{ marginLeft: '6px', background: '#dc3545', color: 'white', padding: '2px 8px', borderRadius: '12px', fontSize: '12px' }}>
                {summary.pending.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Expenditures List */}
      {isLoading ? (
        <div className="loading">Loading expenditures...</div>
      ) : expenditures.length === 0 ? (
        <div className="empty-state" style={{ textAlign: 'center', padding: '48px' }}>
          <Receipt size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <h3>No expenditures found</h3>
          <p>No expense claims for the selected filters</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Employee</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Evidence</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenditures.map((exp) => (
                <tr key={exp.id}>
                  <td>{format(new Date(exp.date), 'dd/MM/yyyy')}</td>
                  <td>
                    <div>
                      <div style={{ fontWeight: '600' }}>{exp.user?.name || 'Unknown'}</div>
                      {exp.user?.employeeCode && (
                        <div style={{ fontSize: '12px', color: '#666' }}>{exp.user.employeeCode}</div>
                      )}
                    </div>
                  </td>
                  <td style={{ maxWidth: '250px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.description}
                    </div>
                  </td>
                  <td style={{ fontWeight: '600' }}>₹{exp.amount.toLocaleString()}</td>
                  <td>
                    {exp.evidenceFile ? (
                      <span style={{ color: '#2e7d32' }}>Attached</span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>None</span>
                    )}
                  </td>
                  <td>{getStatusBadge(exp.status)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => viewExpenditure(exp)}
                        title="View Details"
                        style={{ padding: '6px', background: '#e3f2fd', color: '#1565c0' }}
                      >
                        <Eye size={16} />
                      </button>
                      {exp.status === 'pending' && (
                        <>
                          <button
                            className="btn btn-sm"
                            onClick={() => handleApprove(exp.id)}
                            title="Approve"
                            style={{ padding: '6px', background: '#d4edda', color: '#155724' }}
                          >
                            <CheckCircle size={16} />
                          </button>
                          <button
                            className="btn btn-sm"
                            onClick={() => {
                              setSelectedExpenditure(exp);
                              setShowRejectModal(true);
                            }}
                            title="Reject"
                            style={{ padding: '6px', background: '#f8d7da', color: '#721c24' }}
                          >
                            <XCircle size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedExpenditure && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2>Expenditure Details</h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#666' }}>Status</span>
                  {getStatusBadge(selectedExpenditure.status)}
                </div>

                {selectedExpenditure.status === 'rejected' && selectedExpenditure.rejectionReason && (
                  <div style={{ background: '#ffebee', padding: '12px', borderRadius: '8px' }}>
                    <strong style={{ color: '#c62828' }}>Rejection Reason:</strong>
                    <p style={{ margin: '4px 0 0', color: '#c62828' }}>{selectedExpenditure.rejectionReason}</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Employee</span>
                  <span style={{ fontWeight: '600' }}>
                    {selectedExpenditure.user?.name}
                    {selectedExpenditure.user?.employeeCode && ` (${selectedExpenditure.user.employeeCode})`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Date</span>
                  <span style={{ fontWeight: '600' }}>{format(new Date(selectedExpenditure.date), 'dd MMMM yyyy')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#666' }}>Amount</span>
                  <span style={{ fontWeight: '700', fontSize: '18px', color: '#2e7d32' }}>
                    ₹{selectedExpenditure.amount.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#666' }}>Description</span>
                  <p style={{ marginTop: '4px', background: '#f5f5f5', padding: '12px', borderRadius: '8px' }}>
                    {selectedExpenditure.description}
                  </p>
                </div>

                {selectedExpenditure.evidenceFile && (
                  <div>
                    <span style={{ color: '#666' }}>Evidence</span>
                    <div style={{ marginTop: '8px' }}>
                      {selectedExpenditure.evidenceType?.startsWith('image/') ? (
                        <img
                          src={selectedExpenditure.evidenceFile}
                          alt="Evidence"
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '8px' }}
                        />
                      ) : (
                        <a
                          href={selectedExpenditure.evidenceFile}
                          download={selectedExpenditure.evidenceName}
                          className="btn"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                        >
                          <Download size={16} />
                          Download {selectedExpenditure.evidenceName}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px', fontSize: '12px', color: '#9ca3af' }}>
                  Submitted on {format(new Date(selectedExpenditure.createdAt), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {selectedExpenditure.status === 'pending' && (
                <>
                  <button
                    className="btn"
                    style={{ background: '#f8d7da', color: '#721c24' }}
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#28a745' }}
                    onClick={() => handleApprove(selectedExpenditure.id)}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>
                </>
              )}
              <button className="btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedExpenditure && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Reject Expenditure</h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '16px' }}>
                Rejecting expenditure of <strong>₹{selectedExpenditure.amount.toLocaleString()}</strong> by{' '}
                <strong>{selectedExpenditure.user?.name}</strong>
              </p>
              <div className="form-group">
                <label className="form-label">Reason for Rejection</label>
                <textarea
                  className="form-input"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter reason for rejection..."
                  rows={3}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={() => setShowRejectModal(false)}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#dc3545', color: 'white' }}
                onClick={handleReject}
              >
                Reject Expenditure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
