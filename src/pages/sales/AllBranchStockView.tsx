import { useState, useEffect } from 'react';
import {
  Package,
  Building2,
  Search,
  RefreshCw,
  ClipboardList,
  ArrowRight
} from 'lucide-react';
import { branchStockApi, stockUpdateRequestsApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

interface BranchStockItem {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  lastUpdated: string;
  product?: { id: string; name: string; sku: string; category: string; unit: string };
  branch?: { id: string; name: string };
}

export function AllBranchStockView() {
  const { currentUser, branches } = useStore();
  const [allStock, setAllStock] = useState<BranchStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBranch, setSelectedBranch] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestProduct, setRequestProduct] = useState<BranchStockItem | null>(null);
  const [requestQty, setRequestQty] = useState(0);
  const [requestReason, setRequestReason] = useState('');

  const myBranchId = currentUser?.branchId || '';

  useEffect(() => {
    fetchAllStock();
  }, []);

  const fetchAllStock = async () => {
    try {
      setLoading(true);
      const data = await branchStockApi.getAll();
      setAllStock(data);
    } catch (error) {
      console.error('Failed to fetch branch stock:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpdate = (item: BranchStockItem) => {
    setRequestProduct(item);
    setRequestQty(item.quantity);
    setRequestReason('');
    setShowRequestModal(true);
  };

  const submitRequest = async () => {
    if (!requestProduct || !myBranchId) return;
    try {
      await stockUpdateRequestsApi.create({
        branchId: myBranchId,
        productId: requestProduct.productId,
        requestedQuantity: requestQty,
        reason: requestReason || undefined
      });
      alert('Stock update request submitted for admin approval');
      setShowRequestModal(false);
      setRequestProduct(null);
    } catch (error: any) {
      alert(error.message || 'Failed to submit request');
    }
  };

  // Filter stock
  const filteredStock = allStock.filter(item => {
    if (selectedBranch !== 'all' && item.branchId !== selectedBranch) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.product?.name?.toLowerCase().includes(term) ||
        item.product?.sku?.toLowerCase().includes(term) ||
        item.product?.category?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  // Group by branch
  const stockByBranch: Record<string, BranchStockItem[]> = {};
  filteredStock.forEach(item => {
    const branchName = item.branch?.name || 'Unknown';
    if (!stockByBranch[branchName]) stockByBranch[branchName] = [];
    stockByBranch[branchName].push(item);
  });

  if (loading) {
    return (
      <div className="stock-page">
        <div className="page-header"><h1>All Branch Stock</h1></div>
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading...</div>
      </div>
    );
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1><Building2 size={28} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />All Branch Stock</h1>
          <p style={{ color: '#64748b', marginTop: '0.25rem' }}>View stock across all branches. Update your own branch stock via requests.</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchAllStock}>
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <select
          className="form-input"
          style={{ width: 'auto', minWidth: '200px' }}
          value={selectedBranch}
          onChange={e => setSelectedBranch(e.target.value)}
        >
          <option value="all">All Branches</option>
          {branches.map(b => (
            <option key={b.id} value={b.id}>
              {b.name} {b.id === myBranchId ? '(My Branch)' : ''}
            </option>
          ))}
        </select>
        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
          <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            className="form-input"
            placeholder="Search products..."
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b' }}>{branches.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Branches</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3b82f6' }}>{filteredStock.length}</div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Stock Entries</div>
        </div>
        <div className="card" style={{ padding: '1rem', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#22c55e' }}>
            {filteredStock.reduce((sum, s) => sum + s.quantity, 0).toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Total Units</div>
        </div>
      </div>

      {/* Stock by Branch */}
      {Object.entries(stockByBranch).map(([branchName, items]) => {
        const isMyBranch = items[0]?.branchId === myBranchId;
        return (
          <div
            key={branchName}
            className="card"
            style={{ marginBottom: '1.5rem', border: isMyBranch ? '2px solid #3b82f6' : undefined }}
          >
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: isMyBranch ? '#eff6ff' : undefined }}>
              <h2 style={{ fontSize: '0.875rem' }}>
                <Building2 size={16} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                {branchName}
                {isMyBranch && <span style={{ marginLeft: '0.5rem', padding: '0.125rem 0.5rem', borderRadius: '9999px', fontSize: '0.625rem', background: '#dbeafe', color: '#1e40af' }}>My Branch</span>}
              </h2>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{items.length} products</span>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>HSN</th>
                      <th>Category</th>
                      <th style={{ textAlign: 'right' }}>Quantity</th>
                      <th>Unit</th>
                      {isMyBranch && <th style={{ textAlign: 'center' }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(item => (
                      <tr key={item.id}>
                        <td style={{ fontWeight: '500' }}>{item.product?.name || '-'}</td>
                        <td style={{ color: '#64748b', fontSize: '0.8rem' }}>{item.product?.sku || '-'}</td>
                        <td style={{ fontSize: '0.8rem' }}>{item.product?.category || '-'}</td>
                        <td style={{ textAlign: 'right', fontWeight: '600' }}>
                          <span style={{
                            color: item.quantity < 10 ? '#b91c1c' : item.quantity < 50 ? '#d97706' : '#15803d'
                          }}>
                            {item.quantity}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.8rem', color: '#64748b' }}>{item.product?.unit || '-'}</td>
                        {isMyBranch && (
                          <td style={{ textAlign: 'center' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleRequestUpdate(item)}
                              title="Request stock update"
                            >
                              <ClipboardList size={14} /> Update
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })}

      {Object.keys(stockByBranch).length === 0 && (
        <div className="card" style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
          No stock data found
        </div>
      )}

      {/* Request Update Modal */}
      {showRequestModal && requestProduct && (
        <div className="modal-overlay" onClick={() => setShowRequestModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2>Request Stock Update</h2>
              <button className="modal-close" onClick={() => setShowRequestModal(false)}>
                <span style={{ fontSize: '1.5rem' }}>&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ fontWeight: '600' }}>{requestProduct.product?.name}</div>
                <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                  Current: {requestProduct.quantity} {requestProduct.product?.unit}
                </div>
              </div>
              <div className="form-group">
                <label>New Quantity *</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{requestProduct.quantity}</span>
                  <ArrowRight size={14} color="#64748b" />
                  <input
                    type="number"
                    className="form-input"
                    min="0"
                    value={requestQty || ''}
                    onChange={e => setRequestQty(parseInt(e.target.value) || 0)}
                    style={{ flex: 1 }}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea
                  className="form-input"
                  rows={3}
                  placeholder="Why is this update needed?"
                  value={requestReason}
                  onChange={e => setRequestReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowRequestModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submitRequest} disabled={requestQty < 0}>
                Submit for Approval
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
