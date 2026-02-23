import { useState, useEffect } from 'react';
import { RotateCcw, Plus, CheckCircle, XCircle, X, FileText, Clock, DollarSign } from 'lucide-react';
import { salesReturnsApi, salesApi } from '../../services/api';
import '../stock/Stock.css';

export function SalesReturns() {
  const [returns, setReturns] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [, setSelectedSale] = useState<any>(null);
  const [returnItems, setReturnItems] = useState<{ productName: string; quantity: number; price: number }[]>([]);
  const [reason, setReason] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [returnsData, salesData] = await Promise.all([
        salesReturnsApi.getAll(),
        salesApi.getAll()
      ]);
      setReturns(returnsData);
      setSales(salesData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaleSelect = (saleId: string) => {
    setSelectedSaleId(saleId);
    const sale = sales.find(s => s.id === saleId);
    setSelectedSale(sale);
    if (sale?.items) {
      setReturnItems(sale.items.map((item: any) => ({
        productName: item.productName || item.product?.name || 'Product',
        quantity: 0,
        price: item.price || item.unitPrice || 0
      })));
    } else {
      setReturnItems([]);
    }
  };

  const handleAddReturnItem = () => {
    setReturnItems([...returnItems, { productName: '', quantity: 1, price: 0 }]);
  };

  const handleRemoveReturnItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...returnItems];
    (updated[index] as any)[field] = value;
    setReturnItems(updated);
  };

  const handleSubmit = async () => {
    if (!selectedSaleId) {
      alert('Please select a sale');
      return;
    }
    const validItems = returnItems.filter(item => item.quantity > 0);
    if (validItems.length === 0) {
      alert('Please add at least one return item with quantity > 0');
      return;
    }
    try {
      await salesReturnsApi.create({
        saleId: selectedSaleId,
        items: validItems,
        reason
      });
      setShowModal(false);
      setSelectedSaleId('');
      setSelectedSale(null);
      setReturnItems([]);
      setReason('');
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to create return');
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await salesReturnsApi.approve(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (id: string) => {
    try {
      await salesReturnsApi.reject(id);
      fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved': return { bg: '#d4edda', color: '#155724', text: 'Approved' };
      case 'rejected': return { bg: '#f8d7da', color: '#721c24', text: 'Rejected' };
      default: return { bg: '#fff3cd', color: '#856404', text: 'Pending' };
    }
  };

  const filtered = filterStatus === 'all' ? returns : returns.filter(r => r.status === filterStatus);
  const totalReturns = returns.length;
  const pendingCount = returns.filter(r => r.status === 'pending').length;
  const approvedCount = returns.filter(r => r.status === 'approved').length;
  const totalRefund = returns
    .filter(r => r.status === 'approved')
    .reduce((sum, r) => sum + (r.totalAmount || r.items?.reduce((s: number, i: any) => s + i.quantity * i.price, 0) || 0), 0);

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
            <RotateCcw size={24} color="#00a651" /> Sales Returns
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>Manage product returns and refunds</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: '#00a651', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
        >
          <Plus size={18} /> New Return
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Returns', value: totalReturns, icon: <FileText size={20} />, color: '#6366f1' },
          { label: 'Pending', value: pendingCount, icon: <Clock size={20} />, color: '#f59e0b' },
          { label: 'Approved', value: approvedCount, icon: <CheckCircle size={20} />, color: '#22c55e' },
          { label: 'Total Refund Amount', value: `₹${totalRefund.toLocaleString('en-IN')}`, icon: <DollarSign size={20} />, color: '#00a651' },
        ].map((card, i) => (
          <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
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

      {/* Filter */}
      <div style={{ marginBottom: 16 }}>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: '0.875rem' }}
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {/* Returns Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['#', 'Bill No', 'Items', 'Reason', 'Amount', 'Status', 'Date', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No returns found</td></tr>
              ) : (
                filtered.map((ret, idx) => {
                  const badge = getStatusBadge(ret.status);
                  const amount = ret.totalAmount || ret.items?.reduce((s: number, i: any) => s + i.quantity * i.price, 0) || 0;
                  return (
                    <tr key={ret.id || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600 }}>{ret.sale?.billNumber || ret.billNumber || ret.saleId?.slice(0, 8) || '--'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem' }}>{ret.items?.length || 0} items</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ret.reason || '--'}</td>
                      <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600 }}>₹{amount.toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: badge.bg, color: badge.color, padding: '4px 12px', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600 }}>{badge.text}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: '#64748b' }}>{ret.createdAt ? new Date(ret.createdAt).toLocaleDateString('en-IN') : '--'}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {ret.status === 'pending' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleApprove(ret.id)} style={{ background: '#d4edda', color: '#155724', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <CheckCircle size={14} /> Approve
                            </button>
                            <button onClick={() => handleReject(ret.id)} style={{ background: '#f8d7da', color: '#721c24', border: 'none', borderRadius: 6, padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem' }}>
                              <XCircle size={14} /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '90%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto', padding: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#1e293b' }}>Create Sales Return</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}><X size={20} /></button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Select Sale (Bill Number)</label>
              <select
                value={selectedSaleId}
                onChange={e => handleSaleSelect(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem' }}
              >
                <option value="">-- Select Sale --</option>
                {sales.map(sale => (
                  <option key={sale.id} value={sale.id}>
                    {sale.billNumber || sale.id?.slice(0, 8)} - {sale.customer?.name || sale.customerName || 'Customer'} - ₹{(sale.totalAmount || sale.grandTotal || 0).toLocaleString('en-IN')}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>Return Items</label>
                <button onClick={handleAddReturnItem} style={{ background: '#00a651', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: '0.75rem' }}>
                  <Plus size={14} /> Add Item
                </button>
              </div>
              {returnItems.map((item, idx) => (
                <div key={idx} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <input
                    value={item.productName}
                    onChange={e => handleItemChange(idx, 'productName', e.target.value)}
                    placeholder="Product Name"
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={e => handleItemChange(idx, 'quantity', Number(e.target.value))}
                    placeholder="Qty"
                    min={0}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                  />
                  <input
                    type="number"
                    value={item.price}
                    onChange={e => handleItemChange(idx, 'price', Number(e.target.value))}
                    placeholder="Price"
                    min={0}
                    style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: '0.8rem' }}
                  />
                  <button onClick={() => handleRemoveReturnItem(idx)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer' }}>
                    <X size={14} />
                  </button>
                </div>
              ))}
              {returnItems.length > 0 && (
                <p style={{ textAlign: 'right', fontSize: '0.85rem', fontWeight: 600, color: '#1e293b', marginTop: 8 }}>
                  Total: ₹{returnItems.reduce((s, i) => s + i.quantity * i.price, 0).toLocaleString('en-IN')}
                </p>
              )}
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>Reason for Return</label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value)}
                rows={3}
                placeholder="Enter reason for return..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontWeight: 600, color: '#374151' }}>Cancel</button>
              <button onClick={handleSubmit} style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#00a651', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>Submit Return</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
