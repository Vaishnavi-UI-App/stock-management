import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Filter, Wallet } from 'lucide-react';
import { salesApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import type { Sale } from '../../types';
import '../stock/Stock.css';

type DepositStatus = 'pending' | 'deposited' | 'cleared';

const STORAGE_KEY = 'payment-received-deposit-status';

export function PaymentReceived() {
  const { currentUser } = useStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'advance' | 'paid'>('all');
  const [depositMap, setDepositMap] = useState<Record<string, DepositStatus>>({});

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setDepositMap(JSON.parse(raw));
      } catch {
        setDepositMap({});
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(depositMap));
  }, [depositMap]);

  useEffect(() => {
    loadSales();
  }, [currentUser?.id, currentUser?.role]);

  const loadSales = async () => {
    setLoading(true);
    try {
      const filters = currentUser?.role === 'salesman' ? { salesmanId: currentUser.id } : undefined;
      const data = await salesApi.getAll(filters);
      setSales(data);
    } catch (error) {
      console.error('Failed to load payment data', error);
      setSales([]);
    } finally {
      setLoading(false);
    }
  };

  const rows = useMemo(() => {
    return sales
      .filter((s) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'due') return (s.balanceDue || 0) > 0;
        if (statusFilter === 'advance') return (s.amountPaid || 0) > s.finalAmount;
        return (s.balanceDue || 0) === 0;
      })
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, statusFilter]);

  const summary = useMemo(() => {
    const due = sales.reduce((sum, s) => sum + Math.max(0, s.balanceDue || 0), 0);
    const advance = sales.reduce((sum, s) => sum + Math.max(0, (s.amountPaid || 0) - s.finalAmount), 0);
    const received = sales.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
    return { due, advance, received };
  }, [sales]);

  const isReminderRequired = (sale: Sale) => {
    const method = sale.paymentMethod;
    const needsBankDeposit = method === 'cash' || method === 'card' || method === 'upi' || method === 'credit';
    if (!needsBankDeposit) return false;
    const ageMs = Date.now() - new Date(sale.saleDate).getTime();
    return ageMs > 2 * 24 * 60 * 60 * 1000 && (depositMap[sale.id] || 'pending') === 'pending';
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Payment Received</h1>
          <p>Due, advance, collections and bank deposit status</p>
        </div>
      </div>

      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card">
          <div className="stat-icon"><Wallet size={20} /></div>
          <div className="stat-content">
            <span className="stat-label">Total Received</span>
            <span className="stat-value">₹{summary.received.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon"><Clock size={20} color="#dc2626" /></div>
          <div className="stat-content">
            <span className="stat-label">Total Due</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>₹{summary.due.toLocaleString()}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="stat-icon"><CheckCircle2 size={20} color="#2563eb" /></div>
          <div className="stat-content">
            <span className="stat-label">Advance</span>
            <span className="stat-value" style={{ color: '#2563eb' }}>₹{summary.advance.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={16} />
          <select className="form-select" style={{ maxWidth: 220 }} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
            <option value="all">All</option>
            <option value="due">Due</option>
            <option value="advance">Advance</option>
            <option value="paid">Paid/Cleared</option>
          </select>
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          {loading ? (
            <div style={{ padding: 24 }}>Loading...</div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th>Total</th>
                  <th>Received</th>
                  <th>Due</th>
                  <th>Bank Deposit</th>
                  <th>Reminder</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((sale) => {
                  const status = depositMap[sale.id] || 'pending';
                  return (
                    <tr key={sale.id}>
                      <td>{sale.billNumber}</td>
                      <td>{sale.customerName}</td>
                      <td>{new Date(sale.saleDate).toLocaleDateString('en-IN')}</td>
                      <td style={{ textTransform: 'uppercase' }}>{sale.paymentMethod}</td>
                      <td>₹{sale.finalAmount.toLocaleString()}</td>
                      <td>₹{(sale.amountPaid || 0).toLocaleString()}</td>
                      <td style={{ color: (sale.balanceDue || 0) > 0 ? '#dc2626' : '#16a34a' }}>
                        ₹{Math.max(0, sale.balanceDue || 0).toLocaleString()}
                      </td>
                      <td>
                        <select
                          className="form-select"
                          value={status}
                          onChange={(e) => setDepositMap((prev) => ({ ...prev, [sale.id]: e.target.value as DepositStatus }))}
                        >
                          <option value="pending">Pending</option>
                          <option value="deposited">Deposited</option>
                          <option value="cleared">Cleared</option>
                        </select>
                      </td>
                      <td>
                        {isReminderRequired(sale) ? (
                          <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', color: '#dc2626', fontWeight: 600 }}>
                            <AlertTriangle size={14} /> Overdue
                          </span>
                        ) : 'OK'}
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', color: '#6b7280' }}>No payment records</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
