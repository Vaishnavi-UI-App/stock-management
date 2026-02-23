import { useState, useEffect } from 'react';
import {
  CreditCard, Search, Save, X, AlertTriangle, CheckCircle
} from 'lucide-react';
import { customersApi, creditApi } from '../../services/api';
import '../stock/Stock.css';

export function CreditLimits() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const data = await customersApi.getAll();
      setCustomers(data);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveCreditLimit = async (customerId: string) => {
    setIsSaving(true);
    try {
      await creditApi.setCreditLimit(customerId, editValue);
      setEditingId(null);
      fetchCustomers();
    } catch (error: any) {
      alert(error.message || 'Failed to update credit limit');
    } finally {
      setIsSaving(false);
    }
  };

  const getHealthColor = (balance: number, creditLimit: number) => {
    if (creditLimit <= 0) return { bg: '#e5e7eb', color: '#6b7280', label: 'No Limit' };
    const ratio = balance / creditLimit;
    if (ratio > 1) return { bg: '#f8d7da', color: '#721c24', label: 'Over Limit' };
    if (ratio > 0.8) return { bg: '#fff3cd', color: '#856404', label: 'Warning' };
    return { bg: '#d4edda', color: '#155724', label: 'Healthy' };
  };

  const filtered = customers.filter(c =>
    (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.phone || '').includes(searchQuery)
  );

  const overLimitCount = customers.filter(c => (c.creditLimit || 0) > 0 && (c.balance || c.outstandingBalance || 0) > (c.creditLimit || 0)).length;

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Credit Limits</h1>
          <p>Manage customer credit limits and monitor balances</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <div style={{ background: '#e3f2fd', padding: '16px', borderRadius: '10px' }}>
          <div style={{ fontSize: '13px', color: '#1565c0' }}>Total Customers</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1565c0' }}>{customers.length}</div>
        </div>
        <div style={{ background: overLimitCount > 0 ? '#f8d7da' : '#d4edda', padding: '16px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: overLimitCount > 0 ? '#721c24' : '#155724' }}>
            {overLimitCount > 0 ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
            Over Credit Limit
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: overLimitCount > 0 ? '#721c24' : '#155724' }}>{overLimitCount}</div>
        </div>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ position: 'relative', maxWidth: '360px' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search by customer name or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: '40px' }}
          />
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="loading">Loading customers...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <CreditCard size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <h3>No customers found</h3>
          <p style={{ color: '#6b7280' }}>{searchQuery ? 'Try a different search term' : 'No customer data available'}</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Phone</th>
                <th>Current Balance</th>
                <th>Credit Limit</th>
                <th>Available Credit</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c: any) => {
                const id = c.id || c._id;
                const balance = c.balance || c.outstandingBalance || 0;
                const creditLimit = c.creditLimit || 0;
                const available = Math.max(0, creditLimit - balance);
                const health = getHealthColor(balance, creditLimit);
                const isEditing = editingId === id;

                return (
                  <tr key={id} style={{ background: health.label === 'Over Limit' ? '#fff5f5' : undefined }}>
                    <td style={{ fontWeight: '600' }}>{c.name}</td>
                    <td>{c.phone || '-'}</td>
                    <td style={{ fontWeight: '600' }}>₹{balance.toLocaleString()}</td>
                    <td>
                      {isEditing ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input
                            type="number"
                            className="form-input"
                            value={editValue}
                            onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                            style={{ width: '120px', padding: '4px 8px', fontSize: '13px' }}
                            min={0}
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveCreditLimit(id)}
                            disabled={isSaving}
                            style={{ background: '#00a651', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            style={{ background: '#e5e7eb', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <span
                          onClick={() => { setEditingId(id); setEditValue(creditLimit); }}
                          style={{ cursor: 'pointer', borderBottom: '1px dashed #00a651', color: '#00a651', fontWeight: '600' }}
                          title="Click to edit"
                        >
                          ₹{creditLimit.toLocaleString()}
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: '600', color: available > 0 ? '#155724' : '#721c24' }}>
                      {creditLimit > 0 ? `₹${available.toLocaleString()}` : '-'}
                    </td>
                    <td>
                      <span style={{
                        background: health.bg,
                        color: health.color,
                        padding: '4px 10px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                      }}>
                        {health.label}
                      </span>
                    </td>
                    <td>
                      {!isEditing && (
                        <button
                          className="btn btn-sm"
                          onClick={() => { setEditingId(id); setEditValue(creditLimit); }}
                          style={{ padding: '4px 10px', background: '#e3f2fd', color: '#1565c0', fontSize: '12px' }}
                        >
                          Edit Limit
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
