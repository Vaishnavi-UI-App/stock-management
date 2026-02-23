import { useState, useEffect } from 'react';
import { Trophy, Download, Users, DollarSign, TrendingUp, Calendar } from 'lucide-react';
import { performanceApi } from '../../services/api';
import '../stock/Stock.css';

interface PerformanceData {
  salesmanId: string;
  salesmanName: string;
  branchName: string;
  totalSales: number;
  totalAmount: number;
  collected: number;
  outstanding: number;
  presentDays: number;
  avgSalePerDay: number;
}

export function SalesmanPerformance() {
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, [month, year]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await performanceApi.getSalesmanPerformance(month, year);
      const sorted = (res || []).sort((a: any, b: any) => b.totalAmount - a.totalAmount);
      setData(sorted);
    } catch {
      setData([]);
    }
    setLoading(false);
  };

  const maxAmount = Math.max(...data.map(d => d.totalAmount), 1);
  const totalRevenue = data.reduce((s, d) => s + d.totalAmount, 0);
  const bestPerformer = data.length > 0 ? data[0].salesmanName : '-';
  const avgPerSalesman = data.length > 0 ? totalRevenue / data.length : 0;

  const getMedal = (rank: number) => {
    if (rank === 1) return '\u{1F947}';
    if (rank === 2) return '\u{1F948}';
    if (rank === 3) return '\u{1F949}';
    return `#${rank}`;
  };

  const downloadXLS = () => {
    const headers = ['Rank', 'Salesman', 'Branch', 'Total Sales', 'Total Amount', 'Collected', 'Outstanding', 'Present Days', 'Avg Sale/Day'];
    const rows = data.map((d, i) => [i + 1, d.salesmanName, d.branchName, d.totalSales, d.totalAmount.toFixed(2), d.collected.toFixed(2), d.outstanding.toFixed(2), d.presentDays, d.avgSalePerDay.toFixed(2)]);
    const csv = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([csv], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `salesman_performance_${month}_${year}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const summaryCards = [
    { label: 'Total Salesmen', value: data.length, icon: <Users size={20} />, color: '#00a651' },
    { label: 'Best Performer', value: bestPerformer, icon: <Trophy size={20} />, color: '#f59e0b' },
    { label: 'Total Revenue', value: `\u20B9${totalRevenue.toLocaleString()}`, icon: <DollarSign size={20} />, color: '#3b82f6' },
    { label: 'Avg Per Salesman', value: `\u20B9${avgPerSalesman.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: <TrendingUp size={20} />, color: '#8b5cf6' },
  ];

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Salesman Performance</h1>
          <p>Track and compare salesman performance</p>
        </div>
        <button onClick={downloadXLS} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#00a651', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
          <Download size={18} /> Download XLS
        </button>
      </div>

      {/* Month/Year Filter */}
      <div className="filter-bar" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar size={16} color="#6b7280" />
        </div>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('default', { month: 'long' })}</option>
          ))}
        </select>
        <select value={year} onChange={e => setYear(Number(e.target.value))} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}>
          {Array.from({ length: 5 }, (_, i) => {
            const y = new Date().getFullYear() - 2 + i;
            return <option key={y} value={y}>{y}</option>;
          })}
        </select>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {summaryCards.map(c => (
          <div key={c.label} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: `4px solid ${c.color}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>{c.label}</p>
                <p style={{ fontSize: typeof c.value === 'number' ? 28 : 18, fontWeight: 700, color: c.color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }}>{c.value}</p>
              </div>
              <div style={{ color: c.color }}>{c.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Bar Chart Simulation */}
      {data.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: '#374151' }}>Sales Comparison</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {data.slice(0, 10).map((d, i) => (
              <div key={d.salesmanId} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ minWidth: 120, fontSize: 13, fontWeight: 500, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.salesmanName}</span>
                <div style={{ flex: 1, background: '#f3f4f6', borderRadius: 6, height: 28, position: 'relative' }}>
                  <div style={{ width: `${(d.totalAmount / maxAmount) * 100}%`, background: i === 0 ? '#00a651' : i === 1 ? '#3b82f6' : i === 2 ? '#f59e0b' : '#9ca3af', height: '100%', borderRadius: 6, transition: 'width 0.5s' }} />
                </div>
                <span style={{ minWidth: 90, fontSize: 13, fontWeight: 600, color: '#374151', textAlign: 'right' }}>{'\u20B9'}{d.totalAmount.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'auto' }}>
        {loading ? (
          <p style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>Loading...</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f3f4f6' }}>
                {['Rank', 'Salesman', 'Branch', 'Total Sales', 'Total Amount', 'Collected', 'Outstanding', 'Present Days', 'Avg Sale/Day'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#6b7280', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#9ca3af' }}>No data found</td></tr>
              ) : data.map((d, i) => (
                <tr key={d.salesmanId} style={{ borderBottom: '1px solid #f3f4f6', background: i < 3 ? '#fefce8' : 'transparent' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 700, fontSize: 16 }}>{getMedal(i + 1)}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 500 }}>{d.salesmanName}</td>
                  <td style={{ padding: '12px 16px' }}>{d.branchName}</td>
                  <td style={{ padding: '12px 16px' }}>{d.totalSales}</td>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#00a651' }}>{'\u20B9'}{d.totalAmount.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#16a34a' }}>{'\u20B9'}{d.collected.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px', color: '#dc2626' }}>{'\u20B9'}{d.outstanding.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}>{d.presentDays}</td>
                  <td style={{ padding: '12px 16px' }}>{'\u20B9'}{d.avgSalePerDay.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
