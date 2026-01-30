import { useState, useEffect, useRef } from 'react';
import {
  Receipt, Plus, FileText, Upload, Trash2,
  Clock, CheckCircle, XCircle, Eye, X, Download
} from 'lucide-react';
import { expendituresApi } from '../../services/api';
import type { Expenditure } from '../../types';
import { format } from 'date-fns';
import './Sales.css';

export function MyExpenditures() {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedExpenditure, setSelectedExpenditure] = useState<Expenditure | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  // Form state
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [evidenceFile, setEvidenceFile] = useState<string>('');
  const [evidenceType, setEvidenceType] = useState<string>('');
  const [evidenceName, setEvidenceName] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchExpenditures();
  }, [filter]);

  const fetchExpenditures = async () => {
    setIsLoading(true);
    try {
      const data = await expendituresApi.getAll({
        status: filter === 'all' ? undefined : filter
      });
      setExpenditures(data);
    } catch (error) {
      console.error('Failed to fetch expenditures:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setEvidenceFile(reader.result as string);
        setEvidenceType(file.type);
        setEvidenceName(file.name);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    if (amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    try {
      await expendituresApi.create({
        date,
        description: description.trim(),
        amount,
        evidenceFile,
        evidenceType,
        evidenceName
      });

      // Reset form
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setDescription('');
      setAmount(0);
      setEvidenceFile('');
      setEvidenceType('');
      setEvidenceName('');
      setShowAddModal(false);

      fetchExpenditures();
      alert('Expenditure submitted successfully!');
    } catch (error: any) {
      alert(error.message || 'Failed to submit expenditure');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expenditure?')) {
      return;
    }

    try {
      await expendituresApi.delete(id);
      fetchExpenditures();
    } catch (error: any) {
      alert(error.message || 'Failed to delete expenditure');
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

  const totalAmount = expenditures.reduce((sum, exp) => sum + exp.amount, 0);
  const approvedAmount = expenditures.filter(e => e.status === 'approved').reduce((sum, exp) => sum + exp.amount, 0);
  const pendingAmount = expenditures.filter(e => e.status === 'pending').reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>My Expenditures</h1>
          <p>Track your work-related expenses</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <Plus size={18} />
          Add Expenditure
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stock-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div className="summary-card" style={{ background: '#e3f2fd', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#1565c0' }}>
            ₹{totalAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: '13px', color: '#1976d2' }}>Total Expenditures</div>
        </div>
        <div className="summary-card" style={{ background: '#e8f5e9', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#2e7d32' }}>
            ₹{approvedAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: '13px', color: '#388e3c' }}>Approved</div>
        </div>
        <div className="summary-card" style={{ background: '#fff8e1', padding: '16px', borderRadius: '8px' }}>
          <div style={{ fontSize: '24px', fontWeight: '700', color: '#f57c00' }}>
            ₹{pendingAmount.toLocaleString()}
          </div>
          <div style={{ fontSize: '13px', color: '#fb8c00' }}>Pending Approval</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="tabs" style={{ marginBottom: '20px' }}>
        {(['all', 'pending', 'approved', 'rejected'] as const).map((tab) => (
          <button
            key={tab}
            className={`tab ${filter === tab ? 'active' : ''}`}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          <p>Add your first expenditure to get started</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
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
                  <td style={{ maxWidth: '300px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {exp.description}
                    </div>
                  </td>
                  <td style={{ fontWeight: '600' }}>₹{exp.amount.toLocaleString()}</td>
                  <td>
                    {exp.evidenceFile ? (
                      <span style={{ color: '#2e7d32', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FileText size={16} /> {exp.evidenceName || 'File attached'}
                      </span>
                    ) : (
                      <span style={{ color: '#9ca3af' }}>No file</span>
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
                        <button
                          className="btn btn-sm"
                          onClick={() => handleDelete(exp.id)}
                          title="Delete"
                          style={{ padding: '6px', background: '#ffebee', color: '#c62828' }}
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Expenditure Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2>Add Expenditure</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Description *</label>
                  <textarea
                    className="form-input"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your expenditure..."
                    rows={3}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Amount (₹) *</label>
                  <input
                    type="number"
                    className="form-input"
                    value={amount || ''}
                    onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Upload Evidence (Photo/PDF)</label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,.pdf"
                    style={{ display: 'none' }}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #d1d5db',
                      borderRadius: '8px',
                      padding: '24px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      background: evidenceFile ? '#e8f5e9' : '#f9fafb'
                    }}
                  >
                    {evidenceFile ? (
                      <div>
                        <CheckCircle size={32} style={{ color: '#2e7d32', marginBottom: '8px' }} />
                        <p style={{ fontWeight: '600', color: '#2e7d32' }}>{evidenceName}</p>
                        <p style={{ fontSize: '12px', color: '#666' }}>Click to change file</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} style={{ color: '#9ca3af', marginBottom: '8px' }} />
                        <p style={{ color: '#666' }}>Click to upload file</p>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>Max 5MB - Images or PDF</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn" onClick={() => setShowAddModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Expenditure'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Expenditure Modal */}
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
              <button className="btn" onClick={() => setShowViewModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
