import { useState } from 'react';
import { DollarSign, Users, Download, Calculator, FileSpreadsheet, Play } from 'lucide-react';
import { payrollApi } from '../../services/api';
import '../stock/Stock.css';

export function PayrollProcessing() {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [payrollData, setPayrollData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await payrollApi.generate(month, year);
      setPayrollData(data);
      setGenerated(true);
    } catch (err: any) {
      alert(err.message || 'Failed to generate payroll');
    } finally {
      setLoading(false);
    }
  };

  const downloadXLS = () => {
    if (payrollData.length === 0) {
      alert('No data to download');
      return;
    }
    const headers = ['Employee Name', 'Employee Code', 'Designation', 'Days in Month', 'Present', 'LOP Days', 'Gross Salary', 'Prorated Salary', 'Deductions', 'Net Pay'];
    const rows = payrollData.map(emp => [
      emp.name || emp.employeeName || '',
      emp.employeeCode || emp.code || '',
      emp.designation || emp.role || '',
      emp.daysInMonth || 0,
      emp.presentDays || emp.present || 0,
      emp.lopDays || emp.lop || 0,
      emp.grossSalary || emp.gross || 0,
      emp.proratedSalary || emp.prorated || 0,
      emp.deductions || 0,
      emp.netPay || emp.net || 0,
    ]);

    let xls = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Payroll</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>';
    xls += '<tr>' + headers.map(h => `<th style="background:#00a651;color:white;font-weight:bold;padding:8px;border:1px solid #ccc">${h}</th>`).join('') + '</tr>';
    rows.forEach(row => {
      xls += '<tr>' + row.map(cell => `<td style="padding:6px;border:1px solid #e2e8f0">${cell}</td>`).join('') + '</tr>';
    });
    // Totals row
    const totalGross = payrollData.reduce((s, e) => s + (e.grossSalary || e.gross || 0), 0);
    const totalNet = payrollData.reduce((s, e) => s + (e.netPay || e.net || 0), 0);
    const totalDeductions = payrollData.reduce((s, e) => s + (e.deductions || 0), 0);
    xls += `<tr><td colspan="6" style="font-weight:bold;padding:8px;border:1px solid #e2e8f0;text-align:right">TOTAL</td><td style="font-weight:bold;padding:8px;border:1px solid #e2e8f0">${totalGross}</td><td style="padding:8px;border:1px solid #e2e8f0"></td><td style="font-weight:bold;padding:8px;border:1px solid #e2e8f0">${totalDeductions}</td><td style="font-weight:bold;padding:8px;border:1px solid #e2e8f0">${totalNet}</td></tr>`;
    xls += '</table></body></html>';

    const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long' });
    a.download = `Payroll_${monthName}_${year}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalEmployees = payrollData.length;
  const totalGross = payrollData.reduce((s, e) => s + (e.grossSalary || e.gross || 0), 0);
  const totalNet = payrollData.reduce((s, e) => s + (e.netPay || e.net || 0), 0);
  const totalDeductions = payrollData.reduce((s, e) => s + (e.deductions || 0), 0);

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Calculator size={24} color="#00a651" /> Payroll Processing
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: 4 }}>Generate and download monthly payroll</p>
        </div>
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Month</label>
          <select
            value={month}
            onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem' }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2024, i).toLocaleString('en-IN', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', marginBottom: 4 }}>Year</label>
          <select
            value={year}
            onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: '0.875rem' }}
          >
            {[2024, 2025, 2026, 2027].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginTop: 18 }}>
          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{ background: '#00a651', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, opacity: loading ? 0.7 : 1 }}
          >
            <Play size={16} /> {loading ? 'Generating...' : 'Generate Payroll'}
          </button>
          {generated && payrollData.length > 0 && (
            <button
              onClick={downloadXLS}
              style={{ background: '#1e40af', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}
            >
              <Download size={16} /> Download XLS
            </button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      {generated && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Employees', value: totalEmployees, icon: <Users size={20} />, color: '#6366f1' },
            { label: 'Total Gross', value: `₹${totalGross.toLocaleString('en-IN')}`, icon: <DollarSign size={20} />, color: '#00a651' },
            { label: 'Total Net Pay', value: `₹${totalNet.toLocaleString('en-IN')}`, icon: <FileSpreadsheet size={20} />, color: '#0ea5e9' },
            { label: 'Total Deductions', value: `₹${totalDeductions.toLocaleString('en-IN')}`, icon: <Calculator size={20} />, color: '#ef4444' },
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
      )}

      {/* Payroll Table */}
      {generated && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['#', 'Employee Name', 'Code', 'Designation', 'Days', 'Present', 'LOP', 'Gross', 'Prorated', 'Deductions', 'Net Pay'].map(h => (
                    <th key={h} style={{ padding: '12px 14px', textAlign: h === '#' ? 'center' : 'left', fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', borderBottom: '1px solid #e2e8f0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {payrollData.length === 0 ? (
                  <tr><td colSpan={11} style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No payroll data generated</td></tr>
                ) : (
                  payrollData.map((emp, idx) => (
                    <tr key={emp.id || emp.userId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 600 }}>{emp.name || emp.employeeName || '--'}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem', color: '#64748b' }}>{emp.employeeCode || emp.code || '--'}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.8rem' }}>{emp.designation || emp.role || '--'}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>{emp.daysInMonth || '--'}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#22c55e', fontWeight: 600 }}>{emp.presentDays || emp.present || 0}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: (emp.lopDays || emp.lop || 0) > 0 ? '#ef4444' : '#1e293b', fontWeight: 600 }}>{emp.lopDays || emp.lop || 0}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 600 }}>₹{(emp.grossSalary || emp.gross || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>₹{(emp.proratedSalary || emp.prorated || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#ef4444' }}>₹{(emp.deductions || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 14px', fontSize: '0.85rem', fontWeight: 700, color: '#00a651' }}>₹{(emp.netPay || emp.net || 0).toLocaleString('en-IN')}</td>
                    </tr>
                  ))
                )}
                {payrollData.length > 0 && (
                  <tr style={{ background: '#f0fdf4', fontWeight: 700 }}>
                    <td colSpan={7} style={{ padding: '12px 14px', textAlign: 'right', fontSize: '0.85rem' }}>TOTAL</td>
                    <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}>₹{totalGross.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', fontSize: '0.85rem' }}></td>
                    <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#ef4444' }}>₹{totalDeductions.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px 14px', fontSize: '0.85rem', color: '#00a651' }}>₹{totalNet.toLocaleString('en-IN')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!generated && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0' }}>
          <FileSpreadsheet size={48} color="#cbd5e1" />
          <p style={{ color: '#94a3b8', marginTop: 16, fontSize: '0.95rem' }}>Select a month and year, then click Generate Payroll to view data</p>
        </div>
      )}
    </div>
  );
}
