import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, CheckCircle2, Clock, Edit2, Filter, Plus, Wallet, X,
  Search, Camera, Eye, Trash2, IndianRupee, Users, FileText, Download
} from 'lucide-react';
import { customersApi, paymentsApi, salesApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import type { Customer, Payment, Sale } from '../../types';
import '../stock/Stock.css';

type DepositStatus = 'pending' | 'deposited' | 'cleared';
type EntryType = 'due_clear' | 'advance';
type ViewTab = 'entries' | 'customer_summary';

const DEPOSIT_KEY = 'payment-received-deposit-status';
const CHEQUE_PHOTO_KEY = 'payment-received-cheque-photos';

export function PaymentReceived() {
  const { currentUser } = useStore();
  const [sales, setSales] = useState<Sale[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'advance' | 'paid'>('all');
  const [depositMap, setDepositMap] = useState<Record<string, DepositStatus>>({});
  const [chequePhotos, setChequePhotos] = useState<Record<string, string>>({});
  const [viewTab, setViewTab] = useState<ViewTab>('entries');
  const [customerSearch, setCustomerSearch] = useState('');
  const [viewingCheque, setViewingCheque] = useState<string | null>(null);

  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [entryType, setEntryType] = useState<EntryType>('due_clear');
  const [customerMode, setCustomerMode] = useState<'existing' | 'new'>('existing');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedSaleId, setSelectedSaleId] = useState('');
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit' | 'check'>('cash');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [chequePhotoName, setChequePhotoName] = useState('');
  const [chequePhotoData, setChequePhotoData] = useState('');
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const d = localStorage.getItem(DEPOSIT_KEY);
    const c = localStorage.getItem(CHEQUE_PHOTO_KEY);
    if (d) { try { setDepositMap(JSON.parse(d)); } catch { setDepositMap({}); } }
    if (c) { try { setChequePhotos(JSON.parse(c)); } catch { setChequePhotos({}); } }
  }, []);

  useEffect(() => { localStorage.setItem(DEPOSIT_KEY, JSON.stringify(depositMap)); }, [depositMap]);
  useEffect(() => { localStorage.setItem(CHEQUE_PHOTO_KEY, JSON.stringify(chequePhotos)); }, [chequePhotos]);
  useEffect(() => { loadData(); }, [currentUser?.id, currentUser?.role]);

  const loadData = async () => {
    setLoading(true);
    try {
      const salesFilters = currentUser?.role === 'salesman' ? { salesmanId: currentUser.id } : undefined;
      const [salesData, customerData, paymentData] = await Promise.all([
        salesApi.getAll(salesFilters),
        customersApi.getAll(),
        paymentsApi.getAll()
      ]);

      if (currentUser?.role === 'salesman') {
        const customerIds = new Set(salesData.map((s: Sale) => s.customerId).filter(Boolean));
        setCustomers(customerData.filter((c: Customer) => customerIds.has(c.id)));
        setPayments(paymentData.filter((p: Payment) => customerIds.has(p.customerId)));
      } else {
        setCustomers(customerData);
        setPayments(paymentData);
      }
      setSales(salesData);
    } catch (error) {
      console.error('Failed to load payment data', error);
      setSales([]); setCustomers([]); setPayments([]);
    } finally {
      setLoading(false);
    }
  };

  // Due invoices for selected customer
  const dueInvoices = useMemo(() => {
    if (!selectedCustomerId) return [];
    return sales
      .filter((s) => s.customerId === selectedCustomerId && (s.balanceDue || 0) > 0)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [sales, selectedCustomerId]);

  const selectedDueInvoice = dueInvoices.find((s) => s.id === selectedSaleId);

  // Customer summary for the selected customer in form
  const selectedCustomerSummary = useMemo(() => {
    if (!selectedCustomerId) return null;
    const customer = customers.find(c => c.id === selectedCustomerId);
    if (!customer) return null;

    const custSales = sales.filter(s => s.customerId === selectedCustomerId);
    const custPayments = payments.filter(p => p.customerId === selectedCustomerId);
    const totalBills = custSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
    const totalPaid = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalDue = custSales.reduce((sum, s) => sum + Math.max(0, s.balanceDue || 0), 0);
    const totalAdvance = Math.max(0, -(customer.currentBalance || 0));
    const billCount = custSales.length;
    const pendingBills = custSales.filter(s => (s.balanceDue || 0) > 0).length;

    return { customer, totalBills, totalPaid, totalDue, totalAdvance, billCount, pendingBills };
  }, [selectedCustomerId, customers, sales, payments]);

  // Overall summary
  const summary = useMemo(() => {
    const due = sales.reduce((sum, s) => sum + Math.max(0, s.balanceDue || 0), 0);
    const advance = customers.reduce((sum, c) => sum + Math.max(0, -(c.currentBalance || 0)), 0);
    const received = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    const totalBills = sales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
    return { due, advance, received, totalBills };
  }, [sales, customers, payments]);

  // Customer-wise summary for the summary tab
  const customerSummaryRows = useMemo(() => {
    const map = new Map<string, {
      customer: Customer;
      totalBills: number;
      totalPaid: number;
      totalDue: number;
      totalAdvance: number;
      billCount: number;
      pendingBills: number;
      lastPaymentDate: string | null;
    }>();

    customers.forEach(c => {
      const custSales = sales.filter(s => s.customerId === c.id);
      const custPayments = payments.filter(p => p.customerId === c.id);
      const totalBills = custSales.reduce((sum, s) => sum + (s.finalAmount || 0), 0);
      const totalPaid = custPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
      const totalDue = custSales.reduce((sum, s) => sum + Math.max(0, s.balanceDue || 0), 0);
      const totalAdvance = Math.max(0, -(c.currentBalance || 0));
      const billCount = custSales.length;
      const pendingBills = custSales.filter(s => (s.balanceDue || 0) > 0).length;
      const lastPayment = custPayments.sort((a, b) =>
        new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
      )[0];

      if (billCount > 0 || totalPaid > 0) {
        map.set(c.id, {
          customer: c,
          totalBills,
          totalPaid,
          totalDue,
          totalAdvance,
          billCount,
          pendingBills,
          lastPaymentDate: lastPayment ? new Date(lastPayment.paymentDate).toLocaleDateString('en-IN') : null
        });
      }
    });

    let rows = Array.from(map.values());
    if (customerSearch.trim()) {
      const q = customerSearch.toLowerCase();
      rows = rows.filter(r =>
        r.customer.name.toLowerCase().includes(q) ||
        r.customer.phone.includes(q)
      );
    }
    return rows.sort((a, b) => b.totalDue - a.totalDue);
  }, [customers, sales, payments, customerSearch]);

  // Payment entries rows
  const rows = useMemo(() => {
    const withMeta = payments.map((p) => {
      const customer = customers.find((c) => c.id === p.customerId);
      const sale = sales.find((s) => s.id === p.saleId);
      const dueAfter = sale ? Math.max(0, sale.balanceDue || 0) : customer ? Math.max(0, customer.currentBalance) : 0;
      const entryTag = p.notes?.includes('ENTRY_TYPE:ADVANCE')
        ? 'advance'
        : p.notes?.includes('ENTRY_TYPE:DUE_CLEAR')
          ? 'due'
          : dueAfter > 0 ? 'due' : 'paid';
      return { payment: p, customer, sale, dueAfter, entryTag };
    });

    return withMeta
      .filter((row) => {
        if (statusFilter === 'all') return true;
        if (statusFilter === 'advance') return row.entryTag === 'advance';
        if (statusFilter === 'due') return row.entryTag === 'due';
        return row.entryTag === 'paid';
      })
      .sort((a, b) => new Date(b.payment.paymentDate).getTime() - new Date(a.payment.paymentDate).getTime());
  }, [payments, customers, sales, statusFilter]);

  const isReminderRequired = (payment: Payment) => {
    const method = payment.paymentMethod;
    const needsBankDeposit = method === 'cash' || method === 'card' || method === 'upi' || method === 'credit';
    if (!needsBankDeposit) return false;
    const ageMs = Date.now() - new Date(payment.paymentDate).getTime();
    return ageMs > 2 * 24 * 60 * 60 * 1000 && (depositMap[payment.id] || 'pending') === 'pending';
  };

  const onSelectChequePhoto = (file?: File | null) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }
    setChequePhotoName(file.name);
    const reader = new FileReader();
    reader.onload = () => setChequePhotoData(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const resetEntryForm = () => {
    setEntryType('due_clear');
    setCustomerMode('existing');
    setSelectedCustomerId('');
    setSelectedSaleId('');
    setNewCustomerName('');
    setNewCustomerPhone('');
    setNewCustomerAddress('');
    setPaymentAmount(0);
    setPaymentMethod('cash');
    setReferenceNo('');
    setNotes('');
    setChequePhotoName('');
    setChequePhotoData('');
    setCustomerSearchInput('');
    setIsSubmitting(false);
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearchInput.trim()) return customers;
    const q = customerSearchInput.toLowerCase();
    return customers.filter(c =>
      c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, customerSearchInput]);

  const createEntry = async () => {
    try {
      if (paymentAmount <= 0) { alert('Please enter amount'); return; }
      if (paymentMethod === 'check' && !chequePhotoData) {
        alert('Cheque photo is required for check payment');
        return;
      }

      setIsSubmitting(true);
      let customerId = selectedCustomerId;
      if (customerMode === 'new') {
        if (!newCustomerName.trim() || !newCustomerPhone.trim()) {
          alert('New customer name and phone are required');
          setIsSubmitting(false);
          return;
        }
        const created = await customersApi.create({
          name: newCustomerName.trim(),
          phone: newCustomerPhone.trim(),
          address: newCustomerAddress.trim() || undefined
        });
        customerId = created.id;
      }

      if (!customerId) { alert('Please select customer'); setIsSubmitting(false); return; }
      if (entryType === 'due_clear' && !selectedSaleId) {
        alert('Select invoice for due clear entry');
        setIsSubmitting(false);
        return;
      }

      const entryMarker = entryType === 'advance' ? 'ENTRY_TYPE:ADVANCE' : 'ENTRY_TYPE:DUE_CLEAR';
      const mergedNotes = [entryMarker, notes.trim(), chequePhotoName ? `CHEQUE_FILE:${chequePhotoName}` : '']
        .filter(Boolean).join(' | ');

      const createdPayment = await paymentsApi.create({
        customerId,
        saleId: entryType === 'due_clear' ? selectedSaleId : undefined,
        amount: paymentAmount,
        paymentMethod: paymentMethod === 'check' ? 'credit' : paymentMethod,
        referenceNo: referenceNo || undefined,
        notes: mergedNotes || undefined,
        isAdvance: entryType === 'advance'
      });

      if (chequePhotoData) {
        setChequePhotos((prev) => ({ ...prev, [createdPayment.id]: chequePhotoData }));
      }

      setShowEntryModal(false);
      resetEntryForm();
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to create payment entry');
      setIsSubmitting(false);
    }
  };

  const openEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount || 0);
    setPaymentMethod((payment.paymentMethod || 'cash') as typeof paymentMethod);
    setReferenceNo(payment.referenceNo || '');
    setNotes(payment.notes || '');
    setChequePhotoName('');
    setChequePhotoData('');
    setShowEditModal(true);
  };

  const updateEntry = async () => {
    if (!editingPayment) return;
    try {
      setIsSubmitting(true);
      let mergedNotes = notes;
      if (chequePhotoName) {
        mergedNotes = `${notes || ''}${notes ? ' | ' : ''}CHEQUE_FILE:${chequePhotoName}`;
      }
      const updated = await paymentsApi.update(editingPayment.id, {
        amount: paymentAmount,
        paymentMethod: paymentMethod === 'check' ? 'credit' : paymentMethod,
        referenceNo: referenceNo || '',
        notes: mergedNotes,
        paymentDate: new Date().toISOString()
      });
      if (chequePhotoData) {
        setChequePhotos((prev) => ({ ...prev, [updated.id]: chequePhotoData }));
      }
      setShowEditModal(false);
      setEditingPayment(null);
      setIsSubmitting(false);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Failed to update payment entry');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Payment Received</h1>
          <p>Track advance payments, due clearances & cheque collections</p>
        </div>
        <button className="btn btn-primary" onClick={() => { resetEntryForm(); setShowEntryModal(true); }}>
          <Plus size={16} /> Add Entry
        </button>
      </div>

      {/* Summary Cards */}
      <div className="stats-grid" style={{ marginBottom: 16 }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon"><IndianRupee size={20} color="#10b981" /></div>
          <div className="stat-content">
            <span className="stat-label">Total Bills</span>
            <span className="stat-value" style={{ color: '#10b981' }}>₹{summary.totalBills.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-icon"><Wallet size={20} color="#8b5cf6" /></div>
          <div className="stat-content">
            <span className="stat-label">Total Received</span>
            <span className="stat-value" style={{ color: '#8b5cf6' }}>₹{summary.received.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #dc2626' }}>
          <div className="stat-icon"><Clock size={20} color="#dc2626" /></div>
          <div className="stat-content">
            <span className="stat-label">Total Due</span>
            <span className="stat-value" style={{ color: '#dc2626' }}>₹{summary.due.toLocaleString('en-IN')}</span>
          </div>
        </div>
        <div className="stat-card" style={{ borderLeft: '4px solid #2563eb' }}>
          <div className="stat-icon"><CheckCircle2 size={20} color="#2563eb" /></div>
          <div className="stat-content">
            <span className="stat-label">Total Advance</span>
            <span className="stat-value" style={{ color: '#2563eb' }}>₹{summary.advance.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 8, padding: 4 }}>
            <button
              className={`btn btn-sm ${viewTab === 'entries' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewTab('entries')}
              style={{ borderRadius: 6 }}
            >
              <FileText size={14} /> Payment Entries
            </button>
            <button
              className={`btn btn-sm ${viewTab === 'customer_summary' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setViewTab('customer_summary')}
              style={{ borderRadius: 6 }}
            >
              <Users size={14} /> Customer Summary
            </button>
          </div>

          {viewTab === 'entries' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Filter size={16} />
              <select className="form-select" style={{ maxWidth: 220 }} value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
                <option value="all">All Entries</option>
                <option value="due">Due Clear</option>
                <option value="advance">Advance</option>
                <option value="paid">Other Paid</option>
              </select>
            </div>
          )}

          {viewTab === 'customer_summary' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, maxWidth: 300 }}>
              <Search size={16} />
              <input
                className="form-input"
                placeholder="Search customer name or phone..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Payment Entries Table */}
      {viewTab === 'entries' && (
        <div className="card">
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 24 }}>Loading...</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Invoice</th>
                    <th>Entry Type</th>
                    <th>Method</th>
                    <th>Amount</th>
                    <th>Due/Advance</th>
                    <th>Cheque</th>
                    <th>Deposit</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ payment, customer, sale, dueAfter, entryTag }) => {
                    const status = depositMap[payment.id] || 'pending';
                    const hasCheque = !!chequePhotos[payment.id];
                    return (
                      <tr key={payment.id}>
                        <td>{new Date(payment.paymentDate).toLocaleDateString('en-IN')}</td>
                        <td>
                          <div>
                            <div style={{ fontWeight: 600 }}>{customer?.name || '-'}</div>
                            {customer?.phone && <div style={{ fontSize: 11, color: '#6b7280' }}>{customer.phone}</div>}
                          </div>
                        </td>
                        <td>{sale?.billNumber || '-'}</td>
                        <td>
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: 12,
                            fontSize: 11,
                            fontWeight: 600,
                            background: entryTag === 'advance' ? '#dbeafe' : entryTag === 'due' ? '#fef3c7' : '#d1fae5',
                            color: entryTag === 'advance' ? '#1d4ed8' : entryTag === 'due' ? '#92400e' : '#065f46'
                          }}>
                            {entryTag === 'due' ? 'Due Clear' : entryTag === 'advance' ? 'Advance' : 'Paid'}
                          </span>
                        </td>
                        <td style={{ textTransform: 'uppercase', fontSize: 12 }}>{payment.paymentMethod}</td>
                        <td style={{ fontWeight: 600, color: '#059669' }}>₹{payment.amount.toLocaleString('en-IN')}</td>
                        <td>
                          {entryTag === 'advance'
                            ? <span style={{ color: '#2563eb' }}>Adv ₹{Math.max(0, customer ? -(customer.currentBalance || 0) : 0).toLocaleString('en-IN')}</span>
                            : <span style={{ color: '#dc2626' }}>Due ₹{Math.max(0, dueAfter).toLocaleString('en-IN')}</span>}
                        </td>
                        <td>
                          {hasCheque ? (
                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() => setViewingCheque(chequePhotos[payment.id])}
                              style={{ fontSize: 11 }}
                            >
                              <Eye size={12} /> View
                            </button>
                          ) : '-'}
                        </td>
                        <td>
                          <select
                            className="form-select"
                            value={status}
                            onChange={(e) => setDepositMap((prev) => ({ ...prev, [payment.id]: e.target.value as DepositStatus }))}
                            style={{
                              fontSize: 11, padding: '2px 4px',
                              background: status === 'cleared' ? '#d1fae5' : status === 'deposited' ? '#dbeafe' : '#fef3c7',
                              borderColor: status === 'cleared' ? '#10b981' : status === 'deposited' ? '#3b82f6' : '#f59e0b'
                            }}
                          >
                            <option value="pending">Pending</option>
                            <option value="deposited">Deposited</option>
                            <option value="cleared">Cleared</option>
                          </select>
                        </td>
                        <td>
                          {isReminderRequired(payment) ? (
                            <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', color: '#dc2626', fontWeight: 600, fontSize: 11 }}>
                              <AlertTriangle size={12} /> Overdue
                            </span>
                          ) : <span style={{ color: '#10b981', fontSize: 11 }}>OK</span>}
                        </td>
                        <td>
                          {currentUser?.role === 'stock_manager' ? (
                            <button className="btn btn-sm btn-secondary" onClick={() => openEdit(payment)}>
                              <Edit2 size={12} />
                            </button>
                          ) : '-'}
                        </td>
                      </tr>
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                        No payment entries found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Customer Summary Table */}
      {viewTab === 'customer_summary' && (
        <div className="card">
          <div className="table-container">
            {loading ? (
              <div style={{ padding: 24 }}>Loading...</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer</th>
                    <th>Phone</th>
                    <th>Total Bills</th>
                    <th>Bill Amount</th>
                    <th>Total Paid</th>
                    <th>Due Amount</th>
                    <th>Advance</th>
                    <th>Pending Bills</th>
                    <th>Last Payment</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {customerSummaryRows.map((row, idx) => (
                    <tr key={row.customer.id}>
                      <td>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{row.customer.name}</td>
                      <td style={{ fontSize: 12, color: '#6b7280' }}>{row.customer.phone}</td>
                      <td>{row.billCount}</td>
                      <td>₹{row.totalBills.toLocaleString('en-IN')}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>₹{row.totalPaid.toLocaleString('en-IN')}</td>
                      <td style={{ color: row.totalDue > 0 ? '#dc2626' : '#6b7280', fontWeight: row.totalDue > 0 ? 600 : 400 }}>
                        ₹{row.totalDue.toLocaleString('en-IN')}
                      </td>
                      <td style={{ color: row.totalAdvance > 0 ? '#2563eb' : '#6b7280', fontWeight: row.totalAdvance > 0 ? 600 : 400 }}>
                        ₹{row.totalAdvance.toLocaleString('en-IN')}
                      </td>
                      <td>
                        {row.pendingBills > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{row.pendingBills}</span>
                        ) : (
                          <span style={{ color: '#10b981' }}>0</span>
                        )}
                      </td>
                      <td style={{ fontSize: 12 }}>{row.lastPaymentDate || '-'}</td>
                      <td>
                        {row.totalAdvance > 0 ? (
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' }}>
                            Advance
                          </span>
                        ) : row.totalDue > 0 ? (
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#fef3c7', color: '#92400e' }}>
                            Due
                          </span>
                        ) : (
                          <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: '#d1fae5', color: '#065f46' }}>
                            Clear
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {customerSummaryRows.length === 0 && (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', color: '#6b7280', padding: 40 }}>
                        No customer data found
                      </td>
                    </tr>
                  )}
                </tbody>
                {customerSummaryRows.length > 0 && (
                  <tfoot>
                    <tr style={{ fontWeight: 700, background: '#f9fafb' }}>
                      <td colSpan={3}>Grand Total ({customerSummaryRows.length} Customers)</td>
                      <td>{customerSummaryRows.reduce((s, r) => s + r.billCount, 0)}</td>
                      <td>₹{customerSummaryRows.reduce((s, r) => s + r.totalBills, 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#059669' }}>₹{customerSummaryRows.reduce((s, r) => s + r.totalPaid, 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#dc2626' }}>₹{customerSummaryRows.reduce((s, r) => s + r.totalDue, 0).toLocaleString('en-IN')}</td>
                      <td style={{ color: '#2563eb' }}>₹{customerSummaryRows.reduce((s, r) => s + r.totalAdvance, 0).toLocaleString('en-IN')}</td>
                      <td>{customerSummaryRows.reduce((s, r) => s + r.pendingBills, 0)}</td>
                      <td colSpan={2}></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            )}
          </div>
        </div>
      )}

      {/* Add Entry Modal */}
      {showEntryModal && (
        <div className="modal-overlay" onClick={() => setShowEntryModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 720 }}>
            <div className="modal-header">
              <h3 className="modal-title">Add Payment Entry</h3>
              <button className="modal-close" onClick={() => setShowEntryModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {/* Entry Type & Customer Source */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Entry Type</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-sm ${entryType === 'due_clear' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setEntryType('due_clear')}
                      style={{ flex: 1, borderRadius: 8 }}
                    >
                      Due Clear
                    </button>
                    <button
                      className={`btn btn-sm ${entryType === 'advance' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setEntryType('advance')}
                      style={{ flex: 1, borderRadius: 8 }}
                    >
                      Advance
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Customer Source</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      className={`btn btn-sm ${customerMode === 'existing' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCustomerMode('existing')}
                      style={{ flex: 1, borderRadius: 8 }}
                    >
                      Existing
                    </button>
                    <button
                      className={`btn btn-sm ${customerMode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCustomerMode('new')}
                      style={{ flex: 1, borderRadius: 8 }}
                    >
                      New Customer
                    </button>
                  </div>
                </div>
              </div>

              {/* Existing Customer Selection */}
              {customerMode === 'existing' ? (
                <div className="form-group">
                  <label className="form-label">Customer</label>
                  <div style={{ position: 'relative' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#9ca3af' }} />
                    <input
                      className="form-input"
                      placeholder="Search customer by name or phone..."
                      value={customerSearchInput}
                      onChange={(e) => setCustomerSearchInput(e.target.value)}
                      style={{ paddingLeft: 32, marginBottom: 4 }}
                    />
                  </div>
                  <select
                    className="form-select"
                    value={selectedCustomerId}
                    onChange={(e) => { setSelectedCustomerId(e.target.value); setSelectedSaleId(''); }}
                    size={Math.min(5, filteredCustomers.length + 1)}
                    style={{ minHeight: 40 }}
                  >
                    <option value="">-- Select customer --</option>
                    {filteredCustomers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.phone} {c.currentBalance > 0 ? `(Due ₹${c.currentBalance.toLocaleString('en-IN')})` : c.currentBalance < 0 ? `(Adv ₹${Math.abs(c.currentBalance).toLocaleString('en-IN')})` : '(Clear)'}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#166534', marginBottom: 8 }}>New Customer Details</div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Name *</label>
                      <input className="form-input" value={newCustomerName} onChange={(e) => setNewCustomerName(e.target.value)} placeholder="Customer name" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Phone *</label>
                      <input className="form-input" value={newCustomerPhone} onChange={(e) => setNewCustomerPhone(e.target.value)} placeholder="Phone number" />
                    </div>
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Address</label>
                    <input className="form-input" value={newCustomerAddress} onChange={(e) => setNewCustomerAddress(e.target.value)} placeholder="Address (optional)" />
                  </div>
                </div>
              )}

              {/* Customer Summary Box */}
              {customerMode === 'existing' && selectedCustomerSummary && (
                <div style={{
                  background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
                  border: '1px solid #bfdbfe',
                  borderRadius: 10,
                  padding: 14,
                  marginBottom: 14
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#1e40af', marginBottom: 10 }}>
                    {selectedCustomerSummary.customer.name} - Account Summary
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Total Bills</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#374151' }}>{selectedCustomerSummary.billCount}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>₹{selectedCustomerSummary.totalBills.toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Total Paid</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>₹{selectedCustomerSummary.totalPaid.toLocaleString('en-IN')}</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Due Amount</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#dc2626' }}>₹{selectedCustomerSummary.totalDue.toLocaleString('en-IN')}</div>
                      <div style={{ fontSize: 11, color: '#dc2626' }}>{selectedCustomerSummary.pendingBills} pending</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#6b7280', textTransform: 'uppercase', fontWeight: 600 }}>Advance</div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: '#2563eb' }}>₹{selectedCustomerSummary.totalAdvance.toLocaleString('en-IN')}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Selection for Due Clear */}
              {entryType === 'due_clear' && customerMode === 'existing' && selectedCustomerId && (
                <div className="form-group">
                  <label className="form-label">Select Invoice (Due)</label>
                  {dueInvoices.length > 0 ? (
                    <select className="form-select" value={selectedSaleId} onChange={(e) => setSelectedSaleId(e.target.value)}>
                      <option value="">-- Select invoice --</option>
                      {dueInvoices.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.billNumber} | {new Date(s.saleDate).toLocaleDateString('en-IN')} | Bill ₹{(s.finalAmount || 0).toLocaleString('en-IN')} | Due ₹{Math.max(0, s.balanceDue || 0).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ padding: '8px 12px', background: '#d1fae5', borderRadius: 8, fontSize: 13, color: '#065f46' }}>
                      No pending due invoices for this customer
                    </div>
                  )}

                  {selectedDueInvoice && (
                    <div style={{
                      marginTop: 8, padding: '8px 12px', background: '#fef3c7', borderRadius: 8,
                      display: 'flex', justifyContent: 'space-between', fontSize: 12
                    }}>
                      <span>Bill: ₹{(selectedDueInvoice.finalAmount || 0).toLocaleString('en-IN')}</span>
                      <span>Paid: ₹{(selectedDueInvoice.amountPaid || 0).toLocaleString('en-IN')}</span>
                      <span style={{ fontWeight: 700, color: '#dc2626' }}>Due: ₹{Math.max(0, selectedDueInvoice.balanceDue || 0).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Amount & Payment Method */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input
                    type="number"
                    className="form-input"
                    value={paymentAmount || ''}
                    onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                    placeholder={selectedDueInvoice ? `Max ₹${Math.max(0, selectedDueInvoice.balanceDue || 0).toLocaleString('en-IN')}` : 'Enter amount'}
                    style={{ fontSize: 16, fontWeight: 600 }}
                  />
                  {entryType === 'due_clear' && selectedDueInvoice && paymentAmount > 0 && (
                    <div style={{ fontSize: 11, marginTop: 4, color: paymentAmount > (selectedDueInvoice.balanceDue || 0) ? '#dc2626' : '#059669' }}>
                      {paymentAmount >= (selectedDueInvoice.balanceDue || 0)
                        ? 'Full due will be cleared'
                        : `Remaining due: ₹${((selectedDueInvoice.balanceDue || 0) - paymentAmount).toLocaleString('en-IN')}`}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="credit">Bank Transfer</option>
                    <option value="check">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Reference & Notes */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Reference No</label>
                  <input className="form-input" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} placeholder="Transaction/Cheque No" />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional notes" />
                </div>
              </div>

              {/* Cheque Photo Upload */}
              <div className="form-group">
                <label className="form-label">
                  <Camera size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Upload Cheque / Payment Proof {paymentMethod === 'check' && <span style={{ color: '#dc2626' }}>*</span>}
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: 10,
                  padding: chequePhotoData ? 8 : 20,
                  textAlign: 'center',
                  background: '#f9fafb',
                  cursor: 'pointer',
                  position: 'relative'
                }}>
                  {chequePhotoData ? (
                    <div style={{ position: 'relative' }}>
                      <img
                        src={chequePhotoData}
                        alt="Cheque"
                        style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' }}
                      />
                      <div style={{ marginTop: 6, fontSize: 12, color: '#6b7280' }}>{chequePhotoName}</div>
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => { setChequePhotoData(''); setChequePhotoName(''); }}
                        style={{ position: 'absolute', top: 4, right: 4, background: '#fff', borderRadius: '50%', padding: 4 }}
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Camera size={28} color="#9ca3af" />
                      <div style={{ fontSize: 13, color: '#6b7280', marginTop: 6 }}>
                        Click to upload or take photo
                      </div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        Supports JPG, PNG (max 5MB)
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => onSelectChequePhoto(e.target.files?.[0])}
                        style={{ display: 'none' }}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowEntryModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={createEntry} disabled={isSubmitting}>
                {isSubmitting ? 'Saving...' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && editingPayment && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Payment Entry</h3>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input type="number" className="form-input" value={paymentAmount || ''} onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Method</label>
                  <select className="form-select" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="credit">Bank Transfer</option>
                    <option value="check">Cheque</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Reference No</label>
                  <input className="form-input" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Notes</label>
                  <input className="form-input" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>
              </div>

              {/* Cheque Photo Upload for Edit */}
              <div className="form-group">
                <label className="form-label">
                  <Camera size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                  Upload / Replace Cheque Photo
                </label>
                <div style={{
                  border: '2px dashed #d1d5db', borderRadius: 10, padding: chequePhotoData ? 8 : 16,
                  textAlign: 'center', background: '#f9fafb'
                }}>
                  {chequePhotoData ? (
                    <div style={{ position: 'relative' }}>
                      <img src={chequePhotoData} alt="Cheque" style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8, objectFit: 'contain' }} />
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => { setChequePhotoData(''); setChequePhotoName(''); }}
                        style={{ position: 'absolute', top: 4, right: 4, background: '#fff', borderRadius: '50%', padding: 4 }}
                      >
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    </div>
                  ) : (
                    <label style={{ cursor: 'pointer', display: 'block' }}>
                      <Camera size={24} color="#9ca3af" />
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>Click to upload photo</div>
                      <input type="file" accept="image/*" capture="environment" onChange={(e) => onSelectChequePhoto(e.target.files?.[0])} style={{ display: 'none' }} />
                    </label>
                  )}
                </div>
                {/* Show existing cheque if available */}
                {editingPayment && chequePhotos[editingPayment.id] && !chequePhotoData && (
                  <div style={{ marginTop: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>Current cheque photo:</div>
                    <img
                      src={chequePhotos[editingPayment.id]}
                      alt="Existing cheque"
                      style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'contain', border: '1px solid #e5e7eb' }}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={updateEntry} disabled={isSubmitting}>
                {isSubmitting ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cheque Viewer Modal */}
      {viewingCheque && (
        <div className="modal-overlay" onClick={() => setViewingCheque(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <h3 className="modal-title">Cheque / Payment Proof</h3>
              <button className="modal-close" onClick={() => setViewingCheque(null)}><X size={18} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: 'center', padding: 16 }}>
              <img
                src={viewingCheque}
                alt="Cheque"
                style={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 8, objectFit: 'contain' }}
              />
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <a
                href={viewingCheque}
                download="cheque-photo.jpg"
                className="btn btn-secondary"
              >
                <Download size={14} /> Download
              </a>
              <button className="btn btn-primary" onClick={() => setViewingCheque(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
