import { useState, useEffect } from 'react';
import { Calendar, Download, DollarSign, CreditCard, Smartphone, Banknote, AlertCircle, TrendingUp } from 'lucide-react';
import { dailyCollectionApi } from '../../services/api';
import '../stock/Stock.css';

interface CollectionReport {
  totalSales: number;
  totalAmount: number;
  totalCollected: number;
  outstanding: number;
  paymentBreakdown: {
    cash: number;
    card: number;
    upi: number;
    credit: number;
  };
  salesmanWise: Array<{
    salesmanId: string;
    salesmanName: string;
    branchName: string;
    totalSales: number;
    totalAmount: number;
    collected: number;
    outstanding: number;
  }>;
}

export function DailyCollection() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [report, setReport] = useState<CollectionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReport();
  }, [date]);

  const loadReport = async () => {
    setLoading(true);
    try {
      const data = await dailyCollectionApi.getReport(date);
      setReport(data);
    } catch {
      setReport(null);
    }
    setLoading(false);
  };

  const downloadXLS = () => {
    if (!report) return;
    const headers = ['Salesman', 'Branch', 'Total Sales', 'Total Amount', 'Collected', 'Outstanding'];
    const rows = (report.salesmanWise || []).map(s => [s.salesmanName, s.branchName, s.totalSales, s.totalAmount.toFixed(2), s.collected.toFixed(2), s.outstanding.toFixed(2)]);
    rows.push(['', '', '', '', '', '']);
    rows.push(['TOTAL', '', report.totalSales.toString(), report.totalAmount.toFixed(2), report.totalCollected.toFixed(2), report.outstanding.toFixed(2)]);
    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daily_collection_${date}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = report ? [
    { label: 'Total Sales', value: report.totalSales, icon: <TrendingUp size={20} />, color: '#00a651', isAmount: false },
    { label: 'Total Amount', value: `\u20B9${report.totalAmount.toLocaleString()}`, icon: <DollarSign size={20} />, color: '#3b82f6', isAmount: true },
    { label: 'Total Collected', value: `\u20B9${report.totalCollected.toLocaleString()}`, icon: <DollarSign size={20} />, color: '#16a34a', isAmount: true },
    { label: 'Outstanding', value: `\u20B9${report.outstanding.toLocaleString()}`, icon: <AlertCircle size={20} />, color: '#dc2626', isAmount: true },
  ] : [];

  const paymentMethods = report ? [
    { label: 'Cash', value: report.paymentBreakdown.cash, icon: <Banknote size={20} />, color: '#16a34a' },
    { label: 'Card', value: report.paymentBreakdown.card, icon: <CreditCard size={20} />, color: '#3b82f6' },
    { label: 'UPI', value: report.paymentBreakdown.upi, icon: <Smartphone size={20} />, color: '#8b5cf6' },
    { label: 'Credit', value: report.paymentBreakdown.credit, icon: <AlertCircle size={20} />, color: '#f97316' },
  ] : [];

  const totalPayments = paymentMethods.reduce((s, m) => s + m.value, 0) || 1;

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Daily Collection</h1>
          <p>Daily sales and collection report</p>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fff', padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db' }}>
            <Calendar size={16} color="#6b7280" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ border: 'none', fontSize: 14, fontWeight: 500, outline: 'none', background: 'transparent' }} />
          </div>
          <button onClick={downloadXLS} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00a651', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            <Download size={18} /> Download XLS
          </button>
        </div>
      </div>

      {loading ? (
        <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</p>
      ) : !report ? (
        <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <p style={{ color: '#9ca3af', fontSize: 16 }}>No data available for this date</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
            {summaryCards.map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${c.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{c.label}</p>
                    <p style={{ fontSize: c.isAmount ? 20 : 28, fontWeight: 700, color: c.color }}>{c.value}</p>
                  </div>
                  <div style={{ color: c.color }}>{c.icon}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Payment Method Breakdown */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 20, color: '#374151' }}>Payment Method Breakdown</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
              {paymentMethods.map(m => (
                <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, borderRadius: 10, background: '#f9fafb' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: `${m.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: m.color }}>{m.icon}</div>
                  <div>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>{m.label}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: m.color }}>{'\u20B9'}{m.value.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* Bar visualization */}
            <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: '#f3f4f6' }}>
              {paymentMethods.map(m => (
                <div key={m.label} style={{ width: `${(m.value / totalPayments) * 100}%`, background: m.color, transition: 'width 0.5s' }} title={`${m.label}: ${'\u20B9'}${m.value.toLocaleString()}`} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8 }}>
              {paymentMethods.map(m => (
                <span key={m.label} style={{ fontSize: 11, color: '#6b7280', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.color, display: 'inline-block' }} />{m.label} ({((m.value / totalPayments) * 100).toFixed(0)}%)
                </span>
              ))}
            </div>
          </div>

          {/* Salesman-wise Table */}
          <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
            <div style={{ padding: '16px 20px', borderBottom: '2px solid #f3f4f6' }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#374151' }}>Salesman-wise Collection</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                  {['Salesman', 'Branch', 'Sales', 'Amount', 'Collected', 'Outstanding'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(report.salesmanWise || []).length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No salesman data</td></tr>
                ) : (report.salesmanWise || []).map(s => (
                  <tr key={s.salesmanId} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>{s.salesmanName}</td>
                    <td style={{ padding: '12px 16px' }}>{s.branchName}</td>
                    <td style={{ padding: '12px 16px' }}>{s.totalSales}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 600 }}>{'\u20B9'}{s.totalAmount.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 600 }}>{'\u20B9'}{s.collected.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', color: s.outstanding > 0 ? '#dc2626' : '#16a34a', fontWeight: 600 }}>{'\u20B9'}{s.outstanding.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
