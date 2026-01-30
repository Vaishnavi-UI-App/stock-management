import { useEffect, useState } from 'react';
import { FileText, Check, X, Edit2, Eye, Clock, AlertCircle, Printer } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { TaxInvoice } from '../../components/TaxInvoice';
import type { Sale } from '../../types';
import './Accounts.css';

export function Accounts() {
  const {
    pendingSales,
    fetchPendingSales,
    approveSale,
    rejectSale,
    updateSale,
    getUserById,
    getBranchById,
    isLoading
  } = useStore();

  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'preview' | 'edit'>('list');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [editForm, setEditForm] = useState({
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerGSTIN: '',
    discount: 0,
    cgstRate: 2.5,
    sgstRate: 2.5
  });

  useEffect(() => {
    fetchPendingSales();
  }, [fetchPendingSales]);

  const handleApprove = async (id: string) => {
    if (window.confirm('Are you sure you want to approve this bill?')) {
      try {
        await approveSale(id);
        alert('Bill approved successfully!');
        setViewMode('list');
        setSelectedSale(null);
      } catch (error: any) {
        alert(error.message || 'Failed to approve bill');
      }
    }
  };

  const handleReject = async () => {
    if (!selectedSale) return;
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    try {
      await rejectSale(selectedSale.id, rejectReason);
      alert('Bill rejected');
      setShowRejectModal(false);
      setRejectReason('');
      setViewMode('list');
      setSelectedSale(null);
    } catch (error: any) {
      alert(error.message || 'Failed to reject bill');
    }
  };

  const handleEdit = (sale: Sale) => {
    setSelectedSale(sale);
    setEditForm({
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || '',
      customerAddress: sale.customerAddress || '',
      customerGSTIN: sale.customerGSTIN || '',
      discount: sale.discount,
      cgstRate: sale.cgstRate || 2.5,
      sgstRate: sale.sgstRate || 2.5
    });
    setViewMode('edit');
  };

  const handleSaveEdit = async () => {
    if (!selectedSale) return;
    try {
      const totalAmount = selectedSale.items.reduce((sum, item) => sum + item.total, 0);
      const finalAmount = totalAmount - editForm.discount;

      await updateSale(selectedSale.id, {
        ...editForm,
        totalAmount,
        finalAmount
      });
      alert('Bill updated successfully!');
      setViewMode('list');
      setSelectedSale(null);
      fetchPendingSales();
    } catch (error: any) {
      alert(error.message || 'Failed to update bill');
    }
  };

  const handlePreview = (sale: Sale) => {
    setSelectedSale(sale);
    setViewMode('preview');
  };

  const handlePrint = () => {
    window.print();
  };

  if (viewMode === 'preview' && selectedSale) {
    return (
      <div className="accounts-page">
        <div className="page-header no-print">
          <div>
            <h1>Bill Preview</h1>
            <p>Bill #{selectedSale.billNumber}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
              Back to List
            </button>
            <button className="btn btn-primary" onClick={() => handleEdit(selectedSale)}>
              <Edit2 size={18} />
              Edit
            </button>
            <button className="btn btn-success" onClick={() => handleApprove(selectedSale.id)}>
              <Check size={18} />
              Approve
            </button>
            <button className="btn btn-danger" onClick={() => setShowRejectModal(true)}>
              <X size={18} />
              Reject
            </button>
          </div>
        </div>

        <TaxInvoice sale={selectedSale} />

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="modal-overlay">
            <div className="modal">
              <h3>Reject Bill</h3>
              <p>Please provide a reason for rejection:</p>
              <textarea
                className="form-input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter rejection reason..."
                rows={3}
              />
              <div className="modal-actions">
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-danger" onClick={handleReject}>
                  Reject Bill
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (viewMode === 'edit' && selectedSale) {
    return (
      <div className="accounts-page">
        <div className="page-header">
          <div>
            <h1>Edit Bill</h1>
            <p>Bill #{selectedSale.billNumber}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setViewMode('list')}>
              Cancel
            </button>
            <button className="btn btn-success" onClick={handleSaveEdit}>
              <Check size={18} />
              Save Changes
            </button>
          </div>
        </div>

        <div className="edit-form-container">
          <div className="edit-section">
            <h3>Customer Details</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.customerName}
                  onChange={(e) => setEditForm({ ...editForm, customerName: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input
                  type="tel"
                  className="form-input"
                  value={editForm.customerPhone}
                  onChange={(e) => setEditForm({ ...editForm, customerPhone: e.target.value })}
                />
              </div>
              <div className="form-group full-width">
                <label className="form-label">Address</label>
                <textarea
                  className="form-input"
                  value={editForm.customerAddress}
                  onChange={(e) => setEditForm({ ...editForm, customerAddress: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input
                  type="text"
                  className="form-input"
                  value={editForm.customerGSTIN}
                  onChange={(e) => setEditForm({ ...editForm, customerGSTIN: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="edit-section">
            <h3>Bill Items</h3>
            <table className="items-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>HSN</th>
                  <th>Qty</th>
                  <th>Rate</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {selectedSale.items.map((item, index) => (
                  <tr key={index}>
                    <td>{item.productName}</td>
                    <td>{item.hsnCode || '-'}</td>
                    <td>{item.quantity}</td>
                    <td>₹{item.price}</td>
                    <td>₹{item.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="edit-section">
            <h3>GST & Totals</h3>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">CGST Rate (%)</label>
                <select
                  className="form-select"
                  value={editForm.cgstRate}
                  onChange={(e) => setEditForm({ ...editForm, cgstRate: parseFloat(e.target.value) })}
                >
                  <option value={2.5}>2.5%</option>
                  <option value={6}>6%</option>
                  <option value={9}>9%</option>
                  <option value={9.5}>9.5%</option>
                  <option value={14}>14%</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">SGST Rate (%)</label>
                <select
                  className="form-select"
                  value={editForm.sgstRate}
                  onChange={(e) => setEditForm({ ...editForm, sgstRate: parseFloat(e.target.value) })}
                >
                  <option value={2.5}>2.5%</option>
                  <option value={6}>6%</option>
                  <option value={9}>9%</option>
                  <option value={9.5}>9.5%</option>
                  <option value={14}>14%</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Discount (₹)</label>
                <input
                  type="number"
                  className="form-input"
                  value={editForm.discount}
                  onChange={(e) => setEditForm({ ...editForm, discount: parseFloat(e.target.value) || 0 })}
                  min="0"
                />
              </div>
            </div>
            <div className="totals-summary">
              <div className="total-row">
                <span>Subtotal:</span>
                <span>₹{selectedSale.items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>Discount:</span>
                <span>- ₹{editForm.discount.toLocaleString()}</span>
              </div>
              <div className="total-row">
                <span>Total GST ({editForm.cgstRate + editForm.sgstRate}%):</span>
                <span>Included</span>
              </div>
              <div className="total-row final">
                <span>Final Amount:</span>
                <span>₹{(selectedSale.items.reduce((sum, item) => sum + item.total, 0) - editForm.discount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="accounts-page">
      <div className="page-header">
        <div>
          <h1>Accounts - Pending Bills</h1>
          <p>Review and approve bills submitted by salesmen</p>
        </div>
        <div className="pending-count">
          <Clock size={20} />
          <span>{pendingSales.length} Pending</span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading pending bills...</p>
        </div>
      ) : pendingSales.length === 0 ? (
        <div className="empty-state">
          <FileText size={64} className="empty-icon" />
          <h3>No Pending Bills</h3>
          <p>All bills have been reviewed. Check back later.</p>
        </div>
      ) : (
        <div className="pending-bills-list">
          {pendingSales.map((sale) => {
            const salesman = getUserById(sale.salesmanId);
            const branch = getBranchById(sale.branchId);

            return (
              <div className="pending-bill-card" key={sale.id}>
                <div className="bill-card-header">
                  <div className="bill-number">
                    <FileText size={20} />
                    <span>{sale.billNumber}</span>
                  </div>
                  <div className="bill-status pending">
                    <Clock size={14} />
                    Pending
                  </div>
                </div>

                <div className="bill-card-body">
                  <div className="bill-info-row">
                    <span className="label">Customer:</span>
                    <span className="value">{sale.customerName}</span>
                  </div>
                  <div className="bill-info-row">
                    <span className="label">Salesman:</span>
                    <span className="value">{salesman?.name || 'Unknown'}</span>
                  </div>
                  <div className="bill-info-row">
                    <span className="label">Branch:</span>
                    <span className="value">{branch?.name || 'Unknown'}</span>
                  </div>
                  <div className="bill-info-row">
                    <span className="label">Items:</span>
                    <span className="value">{sale.items.length} items</span>
                  </div>
                  <div className="bill-info-row">
                    <span className="label">Date:</span>
                    <span className="value">{new Date(sale.saleDate).toLocaleDateString()}</span>
                  </div>
                  <div className="bill-info-row amount">
                    <span className="label">Amount:</span>
                    <span className="value">₹{sale.finalAmount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bill-card-actions">
                  <button className="btn btn-sm btn-secondary" onClick={() => handlePreview(sale)}>
                    <Eye size={16} />
                    Preview
                  </button>
                  <button className="btn btn-sm btn-primary" onClick={() => handleEdit(sale)}>
                    <Edit2 size={16} />
                    Edit
                  </button>
                  <button className="btn btn-sm btn-success" onClick={() => handleApprove(sale.id)}>
                    <Check size={16} />
                    Approve
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => {
                      setSelectedSale(sale);
                      setShowRejectModal(true);
                    }}
                  >
                    <X size={16} />
                    Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Reject Bill</h3>
            <p>Please provide a reason for rejection:</p>
            <textarea
              className="form-input"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={3}
            />
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => {
                setShowRejectModal(false);
                setRejectReason('');
              }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleReject}>
                Reject Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
