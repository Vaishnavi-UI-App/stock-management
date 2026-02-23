import { useState, useEffect } from 'react';
import {
  Receipt, Download,
  Clock, CheckCircle, XCircle, Eye, X, Filter, Wallet, IndianRupee
} from 'lucide-react';
import { expendituresApi, usersApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import type { Expenditure, User as UserType } from '../../types';
import { format } from 'date-fns';
import '../stock/Stock.css';

export function Expenditures() {
  const { currentUser } = useStore();
  const isBranchManager = currentUser?.role === 'branch_manager';
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
      let filtered = data.filter((u: any) => u.role === 'salesman');
      // Branch manager only sees their branch employees
      if (isBranchManager && currentUser?.branchId) {
        filtered = filtered.filter((u: any) => u.branchId === currentUser.branchId);
      }
      setUsers(filtered);
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

  const getStatusConfig = (status: string) => {
    const config: Record<string, { bg: string; color: string; border: string; icon: any; label: string }> = {
      pending: { bg: '#fffbeb', color: '#b45309', border: '#fde68a', icon: <Clock size={14} />, label: 'Pending' },
      approved: { bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0', icon: <CheckCircle size={14} />, label: 'Approved' },
      rejected: { bg: '#fef2f2', color: '#b91c1c', border: '#fecaca', icon: <XCircle size={14} />, label: 'Rejected' },
    };
    return config[status] || { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', icon: null, label: status };
  };

  const viewExpenditure = (exp: Expenditure) => {
    setSelectedExpenditure(exp);
    setShowViewModal(true);
  };

  const downloadReport = () => {
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
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  const summaryCards = [
    { label: 'Pending Approval', count: summary.pending.count, amount: summary.pending.amount, icon: <Clock size={22} />, gradient: 'linear-gradient(135deg, #d97706, #f59e0b)' },
    { label: 'Approved', count: summary.approved.count, amount: summary.approved.amount, icon: <CheckCircle size={22} />, gradient: 'linear-gradient(135deg, #15803d, #22c55e)' },
    { label: 'Rejected', count: summary.rejected.count, amount: summary.rejected.amount, icon: <XCircle size={22} />, gradient: 'linear-gradient(135deg, #b91c1c, #ef4444)' },
    { label: 'Total Claims', count: summary.total.count, amount: summary.total.amount, icon: <Wallet size={22} />, gradient: 'linear-gradient(135deg, #2563eb, #3b82f6)' },
  ];

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Receipt size={28} style={{ color: '#2563eb' }} />
            {isBranchManager ? 'Branch Expenditures' : 'Employee Expenditures'}
          </h1>
          <p>{isBranchManager ? 'Review and manage your branch expense claims' : 'Review and manage employee expense claims'}</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={downloadReport}
          style={{ borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}
        >
          <Download size={18} />
          Download Report
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
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
              <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '2px' }}>{card.label}</div>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#0f172a', lineHeight: 1 }}>{card.count}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#2563eb', marginTop: '4px' }}>
                ₹{card.amount.toLocaleString()}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{
        background: '#ffffff', padding: '20px', borderRadius: '14px', marginBottom: '20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', color: '#475569' }}>
          <Filter size={18} />
          <span style={{ fontWeight: 600, fontSize: '14px' }}>Filters</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '180px', flex: '1 1 180px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Employee</label>
            <select
              className="form-select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              style={{ borderRadius: '10px' }}
            >
              <option value="">All Employees</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.employeeCode ? `(${user.employeeCode})` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '140px', flex: '0 1 140px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Month</label>
            <select
              className="form-select"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              style={{ borderRadius: '10px' }}
            >
              {months.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '100px', flex: '0 1 100px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Year</label>
            <select
              className="form-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              style={{ borderRadius: '10px' }}
            >
              {years.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
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
              {tab === 'pending' && summary.pending.count > 0 && (
                <span style={{
                  background: isActive ? 'rgba(255,255,255,0.3)' : '#ef4444',
                  color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 700
                }}>
                  {summary.pending.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Expenditure Cards */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: '#64748b' }}>
          <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#2563eb', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 16px' }}></div>
          Loading expenditures...
        </div>
      ) : expenditures.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px', background: '#ffffff', borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <Receipt size={56} style={{ color: '#cbd5e1', marginBottom: '16px' }} />
          <h3 style={{ color: '#334155', margin: '0 0 8px' }}>No expenditures found</h3>
          <p style={{ color: '#94a3b8', margin: 0 }}>No expense claims for the selected filters</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {expenditures.map((exp) => {
            const statusCfg = getStatusConfig(exp.status);
            return (
              <div key={exp.id} style={{
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
                    {format(new Date(exp.date), 'dd')}
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                    {format(new Date(exp.date), 'MMM')}
                  </div>
                </div>

                {/* Employee */}
                <div style={{ flex: '1 1 160px', minWidth: '140px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '10px',
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0
                    }}>
                      {(exp.user?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{exp.user?.name || 'Unknown'}</div>
                      {exp.user?.employeeCode && (
                        <div style={{ fontSize: '12px', color: '#6366f1' }}>{exp.user.employeeCode}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{ flex: '2 1 200px', minWidth: '150px' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Description</div>
                  <div style={{ fontSize: '13px', color: '#475569', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                    {exp.description}
                  </div>
                </div>

                {/* Amount */}
                <div style={{ flex: '0 0 auto', textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '2px' }}>Amount</div>
                  <div style={{ fontSize: '18px', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <IndianRupee size={16} />
                    {exp.amount.toLocaleString()}
                  </div>
                </div>

                {/* Evidence */}
                <div style={{ flex: '0 0 auto' }}>
                  {exp.evidenceFile ? (
                    <span style={{ fontSize: '12px', color: '#15803d', background: '#f0fdf4', padding: '4px 10px', borderRadius: '8px', fontWeight: 500 }}>Attached</span>
                  ) : (
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>No file</span>
                  )}
                </div>

                {/* Status */}
                <div style={{ flex: '0 0 auto' }}>
                  <span style={{
                    background: statusCfg.bg, color: statusCfg.color,
                    border: `1px solid ${statusCfg.border}`,
                    padding: '6px 14px', borderRadius: '10px', fontSize: '13px',
                    fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                  }}>
                    {statusCfg.icon} {statusCfg.label}
                  </span>
                </div>

                {/* Actions */}
                <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => viewExpenditure(exp)}
                    title="View Details"
                    style={{
                      padding: '8px 14px', borderRadius: '10px', border: 'none',
                      background: '#eff6ff', color: '#2563eb', fontWeight: 600,
                      fontSize: '13px', cursor: 'pointer', display: 'flex',
                      alignItems: 'center', gap: '6px'
                    }}
                  >
                    <Eye size={16} /> View
                  </button>
                  {exp.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(exp.id)}
                        title="Approve"
                        style={{
                          padding: '8px 14px', borderRadius: '10px', border: 'none',
                          background: '#f0fdf4', color: '#15803d', fontWeight: 600,
                          fontSize: '13px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: '6px'
                        }}
                      >
                        <CheckCircle size={16} />
                      </button>
                      <button
                        onClick={() => { setSelectedExpenditure(exp); setShowRejectModal(true); }}
                        title="Reject"
                        style={{
                          padding: '8px 14px', borderRadius: '10px', border: 'none',
                          background: '#fef2f2', color: '#b91c1c', fontWeight: 600,
                          fontSize: '13px', cursor: 'pointer', display: 'flex',
                          alignItems: 'center', gap: '6px'
                        }}
                      >
                        <XCircle size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedExpenditure && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header" style={{ background: '#eff6ff', borderBottom: '1px solid #bfdbfe' }}>
              <h2 style={{ color: '#1e40af', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <Receipt size={20} />
                Expenditure Details
              </h2>
              <button className="modal-close" onClick={() => setShowViewModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Status</span>
                  {(() => {
                    const s = getStatusConfig(selectedExpenditure.status);
                    return (
                      <span style={{
                        background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                        padding: '6px 14px', borderRadius: '10px', fontSize: '13px',
                        fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px'
                      }}>
                        {s.icon} {s.label}
                      </span>
                    );
                  })()}
                </div>

                {selectedExpenditure.status === 'rejected' && selectedExpenditure.rejectionReason && (
                  <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '12px', border: '1px solid #fecaca' }}>
                    <strong style={{ color: '#b91c1c', fontSize: '13px' }}>Rejection Reason:</strong>
                    <p style={{ margin: '6px 0 0', color: '#b91c1c', fontSize: '14px' }}>{selectedExpenditure.rejectionReason}</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Employee</span>
                  <span style={{ fontWeight: 600 }}>
                    {selectedExpenditure.user?.name}
                    {selectedExpenditure.user?.employeeCode && ` (${selectedExpenditure.user.employeeCode})`}
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Date</span>
                  <span style={{ fontWeight: 600 }}>{format(new Date(selectedExpenditure.date), 'dd MMMM yyyy')}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Amount</span>
                  <span style={{ fontWeight: 700, fontSize: '22px', color: '#15803d', display: 'flex', alignItems: 'center', gap: '2px' }}>
                    <IndianRupee size={18} />
                    {selectedExpenditure.amount.toLocaleString()}
                  </span>
                </div>

                <div>
                  <span style={{ color: '#64748b', fontSize: '14px' }}>Description</span>
                  <p style={{ marginTop: '8px', background: '#f8fafc', padding: '14px', borderRadius: '10px', fontSize: '14px', color: '#334155' }}>
                    {selectedExpenditure.description}
                  </p>
                </div>

                {selectedExpenditure.evidenceFile && (
                  <div>
                    <span style={{ color: '#64748b', fontSize: '14px' }}>Evidence</span>
                    <div style={{ marginTop: '8px' }}>
                      {selectedExpenditure.evidenceType?.startsWith('image/') ? (
                        <img
                          src={selectedExpenditure.evidenceFile}
                          alt="Evidence"
                          style={{ maxWidth: '100%', maxHeight: '300px', borderRadius: '12px' }}
                        />
                      ) : (
                        <a
                          href={selectedExpenditure.evidenceFile}
                          download={selectedExpenditure.evidenceName}
                          className="btn"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', borderRadius: '10px' }}
                        >
                          <Download size={16} />
                          Download {selectedExpenditure.evidenceName}
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '12px', fontSize: '12px', color: '#94a3b8' }}>
                  Submitted on {format(new Date(selectedExpenditure.createdAt), 'dd MMM yyyy, hh:mm a')}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 24px', gap: '12px' }}>
              {selectedExpenditure.status === 'pending' && (
                <>
                  <button
                    className="btn"
                    style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => setShowRejectModal(true)}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    className="btn btn-primary"
                    style={{ background: '#22c55e', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => handleApprove(selectedExpenditure.id)}
                  >
                    <CheckCircle size={16} /> Approve
                  </button>
                </>
              )}
              <button className="btn" onClick={() => setShowViewModal(false)} style={{ borderRadius: '10px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedExpenditure && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div className="modal-header" style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca' }}>
              <h2 style={{ color: '#b91c1c', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px' }}>
                <XCircle size={20} />
                Reject Expenditure
              </h2>
              <button className="modal-close" onClick={() => setShowRejectModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '24px' }}>
              <div style={{
                background: '#f8fafc', borderRadius: '12px', padding: '16px', marginBottom: '20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{selectedExpenditure.user?.name}</div>
                  <div style={{ fontSize: '13px', color: '#64748b' }}>Expenditure claim</div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '18px', color: '#b91c1c' }}>
                  ₹{selectedExpenditure.amount.toLocaleString()}
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
              <button className="btn" onClick={() => setShowRejectModal(false)} style={{ borderRadius: '10px' }}>
                Cancel
              </button>
              <button
                className="btn"
                style={{ background: '#ef4444', color: 'white', borderRadius: '10px', fontWeight: 600 }}
                onClick={handleReject}
              >
                Reject Expenditure
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
