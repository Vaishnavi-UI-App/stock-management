import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, X, ShoppingCart, Users } from 'lucide-react';
import { suppliersApi, purchasesApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  gstin: string;
}

interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

interface Purchase {
  id: string;
  supplierId: string;
  supplierName: string;
  items: PurchaseItem[];
  totalAmount: number;
  gstAmount: number;
  grandTotal: number;
  paymentStatus: string;
  notes: string;
  createdAt: string;
}

export function PurchaseManagement() {
  const { products, fetchProducts } = useStore();
  const [tab, setTab] = useState<'suppliers' | 'purchases'>('suppliers');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(false);

  // Supplier form
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierForm, setSupplierForm] = useState({ name: '', contact: '', phone: '', gstin: '' });

  // Purchase form
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState({ supplierId: '', notes: '' });
  const [purchaseItems, setPurchaseItems] = useState<{ productId: string; quantity: number; price: number }[]>([]);

  useEffect(() => {
    fetchProducts();
    loadSuppliers();
    loadPurchases();
  }, []);

  const loadSuppliers = async () => {
    try { setSuppliers(await suppliersApi.getAll()); } catch { setSuppliers([]); }
  };

  const loadPurchases = async () => {
    setLoading(true);
    try { setPurchases(await purchasesApi.getAll()); } catch { setPurchases([]); }
    setLoading(false);
  };

  const handleSaveSupplier = async () => {
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, supplierForm);
      } else {
        await suppliersApi.create(supplierForm);
      }
      setShowSupplierModal(false);
      setEditingSupplier(null);
      setSupplierForm({ name: '', contact: '', phone: '', gstin: '' });
      loadSuppliers();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDeleteSupplier = async (id: string) => {
    if (!confirm('Delete this supplier?')) return;
    try { await suppliersApi.delete(id); loadSuppliers(); } catch (e: any) { alert(e.message); }
  };

  const openEditSupplier = (s: Supplier) => {
    setEditingSupplier(s);
    setSupplierForm({ name: s.name, contact: s.contact, phone: s.phone, gstin: s.gstin });
    setShowSupplierModal(true);
  };

  const addPurchaseItem = () => {
    setPurchaseItems([...purchaseItems, { productId: '', quantity: 1, price: 0 }]);
  };

  const updatePurchaseItem = (index: number, field: string, value: any) => {
    const items = [...purchaseItems];
    (items[index] as any)[field] = value;
    setPurchaseItems(items);
  };

  const removePurchaseItem = (index: number) => {
    setPurchaseItems(purchaseItems.filter((_, i) => i !== index));
  };

  const subtotal = purchaseItems.reduce((s, i) => s + i.quantity * i.price, 0);
  const gstAmount = subtotal * 0.18;
  const grandTotal = subtotal + gstAmount;

  const handleCreatePurchase = async () => {
    try {
      await purchasesApi.create({
        supplierId: purchaseForm.supplierId,
        items: purchaseItems.map(i => ({
          ...i,
          productName: products.find(p => p.id === i.productId)?.name || '',
        })),
        totalAmount: subtotal,
        gstAmount,
        grandTotal,
        notes: purchaseForm.notes,
      });
      setShowPurchaseModal(false);
      setPurchaseForm({ supplierId: '', notes: '' });
      setPurchaseItems([]);
      loadPurchases();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 24px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 14,
    background: active ? '#00a651' : '#f3f4f6', color: active ? '#fff' : '#6b7280',
  });

  const getStatusStyle = (status: string): React.CSSProperties => {
    const colors: Record<string, string> = { paid: '#16a34a', partial: '#f97316', pending: '#dc2626' };
    const c = colors[status] || '#6b7280';
    return { display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: `${c}15`, color: c };
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Purchase Management</h1>
          <p>Manage suppliers and purchases</p>
        </div>
        <button
          onClick={() => tab === 'suppliers' ? (setEditingSupplier(null), setSupplierForm({ name: '', contact: '', phone: '', gstin: '' }), setShowSupplierModal(true)) : (setPurchaseItems([]), setShowPurchaseModal(true))}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00a651', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Plus size={18} /> {tab === 'suppliers' ? 'Add Supplier' : 'New Purchase'}
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 0 }}>
        <button onClick={() => setTab('suppliers')} style={tabStyle(tab === 'suppliers')}><Users size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Suppliers</button>
        <button onClick={() => setTab('purchases')} style={tabStyle(tab === 'purchases')}><ShoppingCart size={16} style={{ marginRight: 6, verticalAlign: 'middle' }} />Purchases</button>
      </div>

      {/* Suppliers Tab */}
      {tab === 'suppliers' && (
        <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Name', 'Contact Person', 'Phone', 'GSTIN', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {suppliers.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No suppliers found</td></tr>
              ) : suppliers.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.name}</td>
                  <td style={{ padding: '12px 16px' }}>{s.contact}</td>
                  <td style={{ padding: '12px 16px' }}>{s.phone}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13 }}>{s.gstin}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div className="action-buttons">
                      <button onClick={() => openEditSupplier(s)} style={{ background: '#eff6ff', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}><Edit2 size={16} color="#3b82f6" /></button>
                      <button onClick={() => handleDeleteSupplier(s.id)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}><Trash2 size={16} color="#dc2626" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Purchases Tab */}
      {tab === 'purchases' && (
        <div style={{ background: '#fff', borderRadius: '0 12px 12px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
          {loading ? (
            <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Supplier', 'Items', 'Amount', 'GST', 'Grand Total', 'Payment', 'Date'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {purchases.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No purchases found</td></tr>
                ) : purchases.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{p.supplierName}</td>
                    <td style={{ padding: '12px 16px' }}>{p.items?.length || 0} items</td>
                    <td style={{ padding: '12px 16px' }}>{'\u20B9'}{(p.totalAmount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}>{'\u20B9'}{(p.gstAmount || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#00a651' }}>{'\u20B9'}{(p.grandTotal || 0).toLocaleString()}</td>
                    <td style={{ padding: '12px 16px' }}><span style={getStatusStyle(p.paymentStatus)}>{p.paymentStatus}</span></td>
                    <td style={{ padding: '12px 16px' }}>{new Date(p.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Supplier Modal */}
      {showSupplierModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowSupplierModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(['name', 'contact', 'phone', 'gstin'] as const).map(f => (
                <div key={f}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6, textTransform: 'capitalize' }}>{f === 'gstin' ? 'GSTIN' : f}</label>
                  <input value={supplierForm[f]} onChange={e => setSupplierForm({ ...supplierForm, [f]: e.target.value })} className="form-input" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }} />
                </div>
              ))}
              <button onClick={handleSaveSupplier} style={{ marginTop: 8, background: '#00a651', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, width: '100%' }}>
                {editingSupplier ? 'Update Supplier' : 'Add Supplier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 640, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Create Purchase</h2>
              <button onClick={() => setShowPurchaseModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Supplier</label>
                <select value={purchaseForm.supplierId} onChange={e => setPurchaseForm({ ...purchaseForm, supplierId: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Items</label>
                  <button onClick={addPurchaseItem} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#00a651', border: '1px solid #bbf7d0', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}>
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                {purchaseItems.map((item, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 8, marginBottom: 8 }}>
                    <select value={item.productId} onChange={e => updatePurchaseItem(i, 'productId', e.target.value)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }}>
                      <option value="">Product</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input type="number" placeholder="Qty" value={item.quantity} onChange={e => updatePurchaseItem(i, 'quantity', Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                    <input type="number" placeholder="Price" value={item.price} onChange={e => updatePurchaseItem(i, 'price', Number(e.target.value))} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 13 }} />
                    <button onClick={() => removePurchaseItem(i)} style={{ background: '#fef2f2', border: 'none', borderRadius: 6, padding: 6, cursor: 'pointer' }}><Trash2 size={16} color="#dc2626" /></button>
                  </div>
                ))}
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes</label>
                <textarea value={purchaseForm.notes} onChange={e => setPurchaseForm({ ...purchaseForm, notes: e.target.value })} className="form-input" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, minHeight: 60, resize: 'vertical' }} />
              </div>

              <div style={{ background: '#f9fafb', borderRadius: 8, padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280' }}><span>Subtotal</span><span>{'\u20B9'}{subtotal.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#6b7280' }}><span>GST (18%)</span><span>{'\u20B9'}{gstAmount.toLocaleString()}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 700, color: '#00a651', borderTop: '1px solid #e5e7eb', paddingTop: 8 }}><span>Grand Total</span><span>{'\u20B9'}{grandTotal.toLocaleString()}</span></div>
              </div>

              <button onClick={handleCreatePurchase} style={{ background: '#00a651', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, width: '100%' }}>
                Create Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
