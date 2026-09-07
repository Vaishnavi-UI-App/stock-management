import { useState, useEffect, useMemo } from 'react';
import { X, Wallet } from 'lucide-react';
import { suppliersApi, purchasesApi, supplierPaymentsApi } from '../../services/api';
import '../stock/Stock.css';

interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  gstin: string;
}

interface Purchase {
  id: string;
  purchaseNumber: string;
  supplierId: string;
  supplier: Supplier;
  finalAmount: number;
  amountPaid: number;
  balanceDue: number;
  paymentStatus: string;
}

interface SupplierPayment {
  id: string;
  supplierId: string;
  supplier: Supplier;
  purchaseId: string | null;
  purchase: Purchase | null;
  amount: number;
  paymentMethod: string;
  referenceNo: string | null;
  notes: string | null;
  paymentDate: string;
}

// Payment Out — money paid to suppliers, the mirror of Payment Received.
// Self-contained: loads its own suppliers/purchases/payments so it can be
// dropped into any page (Purchase Management, Accounts) as a tab.
export function PaymentOut() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [supplierPayments, setSupplierPayments] = useState<SupplierPayment[]>([]);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ supplierId: '', purchaseId: '', amount: 0, paymentMethod: 'cash', referenceNo: '', notes: '' });

  useEffect(() => {
    loadSuppliers();
    loadPurchases();
    loadSupplierPayments();
  }, []);

  const loadSuppliers = async () => {
    try { setSuppliers(await suppliersApi.getAll()); } catch { setSuppliers([]); }
  };

  const loadPurchases = async () => {
    try { setPurchases(await purchasesApi.getAll()); } catch { setPurchases([]); }
  };

  const loadSupplierPayments = async () => {
    try { setSupplierPayments(await supplierPaymentsApi.getAll()); } catch { setSupplierPayments([]); }
  };

  // Purchases with an outstanding balance for the supplier currently selected
  // in the payment form — what "Record Payment" lets you pay down.
  const payableSupplierPurchases = purchases.filter(
    p => p.supplierId === paymentForm.supplierId && p.balanceDue > 0
  );

  const handleRecordPayment = async () => {
    if (!paymentForm.supplierId || paymentForm.amount <= 0) {
      alert('Select a supplier and enter a positive amount');
      return;
    }
    try {
      await supplierPaymentsApi.create({
        supplierId: paymentForm.supplierId,
        purchaseId: paymentForm.purchaseId || undefined,
        amount: paymentForm.amount,
        paymentMethod: paymentForm.paymentMethod,
        referenceNo: paymentForm.referenceNo,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      setPaymentForm({ supplierId: '', purchaseId: '', amount: 0, paymentMethod: 'cash', referenceNo: '', notes: '' });
      loadSupplierPayments();
      loadPurchases();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Supplier-wise outstanding summary — total purchased, total paid, and
  // what's still owed, derived from the purchases already loaded.
  const supplierSummary = useMemo(() => {
    const bySupplier = new Map<string, { supplierId: string; supplierName: string; totalPurchased: number; totalPaid: number; outstanding: number }>();
    for (const p of purchases) {
      const key = p.supplierId;
      const existing = bySupplier.get(key);
      if (existing) {
        existing.totalPurchased += p.finalAmount || 0;
        existing.totalPaid += p.amountPaid || 0;
        existing.outstanding += p.balanceDue || 0;
      } else {
        bySupplier.set(key, {
          supplierId: p.supplierId,
          supplierName: p.supplier?.name || 'Unknown',
          totalPurchased: p.finalAmount || 0,
          totalPaid: p.amountPaid || 0,
          outstanding: p.balanceDue || 0,
        });
      }
    }
    return Array.from(bySupplier.values()).sort((a, b) => b.outstanding - a.outstanding);
  }, [purchases]);

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Payment Out</h1>
          <p>Record and track payments made to suppliers</p>
        </div>
        <button
          onClick={() => {
            setPaymentForm({ supplierId: '', purchaseId: '', amount: 0, paymentMethod: 'cash', referenceNo: '', notes: '' });
            setShowPaymentModal(true);
          }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00a651', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}
        >
          <Wallet size={18} /> Record Payment
        </button>
      </div>

      {/* Supplier-wise outstanding summary */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto', marginBottom: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
              {['Supplier', 'Total Purchased', 'Total Paid', 'Outstanding'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {supplierSummary.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No purchases found</td></tr>
            ) : supplierSummary.map(s => (
              <tr key={s.supplierId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.supplierName}</td>
                <td style={{ padding: '12px 16px' }}>{'₹'}{s.totalPurchased.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', color: '#16a34a' }}>{'₹'}{s.totalPaid.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: s.outstanding > 0 ? '#dc2626' : '#16a34a' }}>{'₹'}{s.outstanding.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Payment history */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
              {['Date', 'Supplier', 'Purchase #', 'Amount', 'Method', 'Reference', 'Notes'].map(h => (
                <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {supplierPayments.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No payments recorded</td></tr>
            ) : supplierPayments.map(pay => (
              <tr key={pay.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px' }}>{new Date(pay.paymentDate).toLocaleDateString()}</td>
                <td style={{ padding: '12px 16px', fontWeight: 500 }}>{pay.supplier?.name}</td>
                <td style={{ padding: '12px 16px' }}>{pay.purchase?.purchaseNumber || <span style={{ color: '#9ca3af' }}>General</span>}</td>
                <td style={{ padding: '12px 16px', fontWeight: 600, color: '#dc2626' }}>{'₹'}{pay.amount.toLocaleString()}</td>
                <td style={{ padding: '12px 16px', textTransform: 'capitalize' }}>{pay.paymentMethod}</td>
                <td style={{ padding: '12px 16px' }}>{pay.referenceNo || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{pay.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      {showPaymentModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 480 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>Record Payment</h2>
              <button onClick={() => setShowPaymentModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Supplier</label>
                <select
                  value={paymentForm.supplierId}
                  onChange={e => setPaymentForm({ ...paymentForm, supplierId: e.target.value, purchaseId: '' })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>

              {paymentForm.supplierId && (
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Against Purchase (optional)</label>
                  <select
                    value={paymentForm.purchaseId}
                    onChange={e => setPaymentForm({ ...paymentForm, purchaseId: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                  >
                    <option value="">General / advance payment</option>
                    {payableSupplierPurchases.map(p => (
                      <option key={p.id} value={p.id}>{p.purchaseNumber} — Balance ₹{p.balanceDue.toLocaleString()}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Amount</label>
                <input
                  type="number"
                  value={paymentForm.amount || ''}
                  onChange={e => setPaymentForm({ ...paymentForm, amount: Number(e.target.value) })}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Payment Method</label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={e => setPaymentForm({ ...paymentForm, paymentMethod: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="upi">UPI</option>
                  <option value="credit">Credit</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Reference No (optional)</label>
                <input
                  value={paymentForm.referenceNo}
                  onChange={e => setPaymentForm({ ...paymentForm, referenceNo: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Notes (optional)</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={e => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14, minHeight: 60, resize: 'vertical' }}
                />
              </div>

              <button
                onClick={handleRecordPayment}
                style={{ background: '#00a651', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 15, width: '100%' }}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
