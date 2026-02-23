import { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Package, Filter, X, CheckCircle, Clock } from 'lucide-react';
import { batchesApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

interface Batch {
  id: string;
  productId: string;
  productName: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  branchName: string;
}

export function ExpiryTracking() {
  const { products, branches, fetchProducts, fetchBranches } = useStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDays, setFilterDays] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    productId: '',
    batchNo: '',
    mfgDate: '',
    expDate: '',
    quantity: 0,
    branchId: '',
  });

  useEffect(() => {
    fetchProducts();
    fetchBranches();
    loadBatches();
  }, [filterDays]);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await batchesApi.getAll(filterDays || undefined);
      setBatches(data);
    } catch {
      setBatches([]);
    }
    setLoading(false);
  };

  const getDaysToExpiry = (expDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(expDate);
    exp.setHours(0, 0, 0, 0);
    return Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getStatusColor = (expDate: string) => {
    const days = getDaysToExpiry(expDate);
    if (days <= 0) return '#dc2626';
    if (days <= 30) return '#f97316';
    return '#16a34a';
  };

  const getStatusLabel = (expDate: string) => {
    const days = getDaysToExpiry(expDate);
    if (days <= 0) return 'Expired';
    if (days <= 30) return `Expiring in ${days}d`;
    return 'Safe';
  };

  const expired = batches.filter(b => getDaysToExpiry(b.expDate) <= 0);
  const expiringSoon = batches.filter(b => { const d = getDaysToExpiry(b.expDate); return d > 0 && d <= 30; });
  const safe = batches.filter(b => getDaysToExpiry(b.expDate) > 30);

  const handleSubmit = async () => {
    try {
      await batchesApi.create(form);
      setShowModal(false);
      setForm({ productId: '', batchNo: '', mfgDate: '', expDate: '', quantity: 0, branchId: '' });
      loadBatches();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const summaryCards = [
    { label: 'Total Batches', value: batches.length, icon: <Package size={20} />, color: '#00a651' },
    { label: 'Expired', value: expired.length, icon: <AlertTriangle size={20} />, color: '#dc2626' },
    { label: 'Expiring Soon', value: expiringSoon.length, icon: <Clock size={20} />, color: '#f97316' },
    { label: 'Safe', value: safe.length, icon: <CheckCircle size={20} />, color: '#16a34a' },
  ];

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Expiry Tracking</h1>
          <p>Monitor product batch expiry dates</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00a651', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={18} /> Add Batch
        </button>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${c.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{c.label}</p>
                <p style={{ fontSize: 28, fontWeight: 700, color: c.color }}>{c.value}</p>
              </div>
              <div style={{ color: c.color }}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="filter-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} color="#6b7280" />
          <span style={{ fontSize: 14, color: '#6b7280' }}>Days to Expiry:</span>
        </div>
        {[30, 60, 90, null].map(d => (
          <button
            key={String(d)}
            onClick={() => setFilterDays(d)}
            style={{
              padding: '6px 16px', borderRadius: 20, border: '1px solid #e5e7eb', cursor: 'pointer', fontSize: 13, fontWeight: 500,
              background: filterDays === d ? '#00a651' : '#fff',
              color: filterDays === d ? '#fff' : '#374151',
            }}
          >
            {d ? `${d} days` : 'All'}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Product', 'Batch No', 'Mfg Date', 'Exp Date', 'Qty', 'Branch', 'Status'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {batches.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No batches found</td></tr>
              ) : batches.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{b.productName}</td>
                  <td style={{ padding: '12px 16px' }}>{b.batchNo}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(b.mfgDate).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>{new Date(b.expDate).toLocaleDateString()}</td>
                  <td style={{ padding: '12px 16px' }}>{b.quantity}</td>
                  <td style={{ padding: '12px 16px' }}>{b.branchName}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{
                      display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      background: `${getStatusColor(b.expDate)}15`, color: getStatusColor(b.expDate),
                    }}>
                      {getStatusLabel(b.expDate)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 520, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Add New Batch</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Product</label>
                <select value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })} className="form-select" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
                  <option value="">Select Product</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Batch No</label>
                <input value={form.batchNo} onChange={e => setForm({ ...form, batchNo: e.target.value })} className="form-input" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div className="form-row">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Mfg Date</label>
                  <input type="date" value={form.mfgDate} onChange={e => setForm({ ...form, mfgDate: e.target.value })} className="form-input" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Exp Date</label>
                  <input type="date" value={form.expDate} onChange={e => setForm({ ...form, expDate: e.target.value })} className="form-input" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
                </div>
              </div>
              <div className="form-row">
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Quantity</label>
                  <input type="number" value={form.quantity} onChange={e => setForm({ ...form, quantity: Number(e.target.value) })} className="form-input" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Branch</label>
                  <select value={form.branchId} onChange={e => setForm({ ...form, branchId: e.target.value })} className="form-select" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
                    <option value="">Select Branch</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={handleSubmit} style={{ marginTop: 8, background: '#00a651', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, width: '100%' }}>
                Add Batch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
