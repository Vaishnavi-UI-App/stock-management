import { useState, useEffect } from 'react';
import { Download, Filter } from 'lucide-react';
import { salesApi } from '../../services/api';
import { format } from 'date-fns';
import '../stock/Stock.css';

interface SaleData {
  id: string;
  billNumber: string;
  customerName: string;
  customerGSTIN?: string;
  customerAddress?: string;
  saleDate: string;
  totalAmount: number;
  discount: number;
  finalAmount: number;
  cgstRate: number;
  sgstRate: number;
  items: Array<{
    productName: string;
    hsnCode?: string;
    quantity: number;
    price: number;
    total: number;
  }>;
}

export function GSTReports() {
  const [sales, setSales] = useState<SaleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [reportType, setReportType] = useState<'gstr1' | 'gstr3b'>('gstr1');

  useEffect(() => {
    fetchSales();
  }, [month, year]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const data = await salesApi.getAll({
        status: 'approved'
      } as any);
      setSales(data);
    } catch {
      setSales([]);
    }
    setLoading(false);
  };

  const getGSTBreakdown = () => {
    return sales.map(sale => {
      const totalGstRate = sale.cgstRate + sale.sgstRate;
      const taxableValue = (sale.finalAmount * 100) / (100 + totalGstRate);
      const cgstAmount = (taxableValue * sale.cgstRate) / 100;
      const sgstAmount = (taxableValue * sale.sgstRate) / 100;
      const totalTax = cgstAmount + sgstAmount;
      return { ...sale, taxableValue, cgstAmount, sgstAmount, totalTax };
    });
  };

  const getTotals = () => {
    const breakdown = getGSTBreakdown();
    return {
      totalInvoices: breakdown.length,
      totalTaxableValue: breakdown.reduce((s, b) => s + b.taxableValue, 0),
      totalCGST: breakdown.reduce((s, b) => s + b.cgstAmount, 0),
      totalSGST: breakdown.reduce((s, b) => s + b.sgstAmount, 0),
      totalTax: breakdown.reduce((s, b) => s + b.totalTax, 0),
      totalInvoiceValue: breakdown.reduce((s, b) => s + b.finalAmount, 0),
    };
  };

  const downloadGSTR1 = () => {
    const breakdown = getGSTBreakdown();
    const totals = getTotals();
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    let html = `<html><head><meta charset="utf-8"></head><body>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:12px;">
        <tr><td colspan="11" style="font-size:16px;font-weight:bold;text-align:center;background:#00a651;color:white;">GSTR-1 - Outward Supplies - ${monthName}</td></tr>
        <tr><td colspan="11" style="font-size:12px;text-align:center;">Dynamic Crop Science India Pvt Ltd | GSTIN: 27AAWFD2451Q1ZN</td></tr>
        <tr style="background:#e8eaf6;font-weight:bold;">
          <td>Sr No</td><td>Invoice No</td><td>Invoice Date</td><td>Customer Name</td><td>Customer GSTIN</td>
          <td>Taxable Value</td><td>CGST Rate</td><td>CGST Amt</td><td>SGST Rate</td><td>SGST Amt</td><td>Invoice Value</td>
        </tr>`;

    breakdown.forEach((b, i) => {
      html += `<tr>
        <td>${i + 1}</td>
        <td>${b.billNumber}</td>
        <td>${format(new Date(b.saleDate), 'dd/MM/yyyy')}</td>
        <td>${b.customerName}</td>
        <td>${b.customerGSTIN || 'N/A'}</td>
        <td style="text-align:right;">${b.taxableValue.toFixed(2)}</td>
        <td style="text-align:right;">${b.cgstRate}%</td>
        <td style="text-align:right;">${b.cgstAmount.toFixed(2)}</td>
        <td style="text-align:right;">${b.sgstRate}%</td>
        <td style="text-align:right;">${b.sgstAmount.toFixed(2)}</td>
        <td style="text-align:right;">${b.finalAmount.toFixed(2)}</td>
      </tr>`;
    });

    html += `<tr style="background:#e8f5e9;font-weight:bold;">
      <td colspan="5">TOTAL</td>
      <td style="text-align:right;">${totals.totalTaxableValue.toFixed(2)}</td>
      <td></td><td style="text-align:right;">${totals.totalCGST.toFixed(2)}</td>
      <td></td><td style="text-align:right;">${totals.totalSGST.toFixed(2)}</td>
      <td style="text-align:right;">${totals.totalInvoiceValue.toFixed(2)}</td>
    </tr></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `GSTR1_${monthName.replace(' ', '_')}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadGSTR3B = () => {
    const totals = getTotals();
    const monthName = new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

    // Group by GST rate
    const breakdown = getGSTBreakdown();
    const rateGroups: { [key: string]: { taxable: number; cgst: number; sgst: number; total: number; count: number } } = {};
    breakdown.forEach(b => {
      const key = `${b.cgstRate + b.sgstRate}%`;
      if (!rateGroups[key]) rateGroups[key] = { taxable: 0, cgst: 0, sgst: 0, total: 0, count: 0 };
      rateGroups[key].taxable += b.taxableValue;
      rateGroups[key].cgst += b.cgstAmount;
      rateGroups[key].sgst += b.sgstAmount;
      rateGroups[key].total += b.finalAmount;
      rateGroups[key].count++;
    });

    let html = `<html><head><meta charset="utf-8"></head><body>
      <table border="1" cellpadding="5" cellspacing="0" style="border-collapse:collapse;font-family:Arial;font-size:12px;">
        <tr><td colspan="6" style="font-size:16px;font-weight:bold;text-align:center;background:#00a651;color:white;">GSTR-3B Summary - ${monthName}</td></tr>
        <tr><td colspan="6" style="text-align:center;">Dynamic Crop Science India Pvt Ltd | GSTIN: 27AAWFD2451Q1ZN</td></tr>
        <tr><td colspan="6"></td></tr>
        <tr><td colspan="6" style="font-weight:bold;background:#e8eaf6;">3.1 Details of Outward Supplies</td></tr>
        <tr style="font-weight:bold;background:#f5f5f5;">
          <td>Nature of Supply</td><td>Total Taxable Value</td><td>IGST</td><td>CGST</td><td>SGST</td><td>Cess</td>
        </tr>
        <tr>
          <td>(a) Outward taxable supplies (other than zero rated, nil rated and exempted)</td>
          <td style="text-align:right;">${totals.totalTaxableValue.toFixed(2)}</td>
          <td style="text-align:right;">0.00</td>
          <td style="text-align:right;">${totals.totalCGST.toFixed(2)}</td>
          <td style="text-align:right;">${totals.totalSGST.toFixed(2)}</td>
          <td style="text-align:right;">0.00</td>
        </tr>
        <tr><td colspan="6"></td></tr>
        <tr><td colspan="6" style="font-weight:bold;background:#e8eaf6;">Rate-wise Breakup</td></tr>
        <tr style="font-weight:bold;background:#f5f5f5;">
          <td>GST Rate</td><td>No. of Invoices</td><td>Taxable Value</td><td>CGST</td><td>SGST</td><td>Total Tax</td>
        </tr>`;

    Object.entries(rateGroups).forEach(([rate, data]) => {
      html += `<tr>
        <td>${rate}</td><td>${data.count}</td>
        <td style="text-align:right;">${data.taxable.toFixed(2)}</td>
        <td style="text-align:right;">${data.cgst.toFixed(2)}</td>
        <td style="text-align:right;">${data.sgst.toFixed(2)}</td>
        <td style="text-align:right;">${(data.cgst + data.sgst).toFixed(2)}</td>
      </tr>`;
    });

    html += `<tr style="background:#e8f5e9;font-weight:bold;">
      <td>TOTAL</td><td>${totals.totalInvoices}</td>
      <td style="text-align:right;">${totals.totalTaxableValue.toFixed(2)}</td>
      <td style="text-align:right;">${totals.totalCGST.toFixed(2)}</td>
      <td style="text-align:right;">${totals.totalSGST.toFixed(2)}</td>
      <td style="text-align:right;">${totals.totalTax.toFixed(2)}</td>
    </tr></table></body></html>`;

    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `GSTR3B_${monthName.replace(' ', '_')}.xls`; a.click();
    URL.revokeObjectURL(url);
  };

  const totals = getTotals();
  const breakdown = getGSTBreakdown();

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>GST Reports</h1>
          <p>Generate GSTR-1 and GSTR-3B reports</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'end' }}>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Month</label>
          <select className="form-select" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleString('en-IN', { month: 'long' })}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Year</label>
          <select className="form-select" value={year} onChange={e => setYear(Number(e.target.value))}>
            {Array.from({ length: 5 }, (_, i) => {
              const y = new Date().getFullYear() - 2 + i;
              return <option key={y} value={y}>{y}</option>;
            })}
          </select>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={`btn ${reportType === 'gstr1' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('gstr1')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} /> GSTR-1
          </button>
          <button className={`btn ${reportType === 'gstr3b' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setReportType('gstr3b')} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={16} /> GSTR-3B
          </button>
        </div>
        <button className="btn btn-success" onClick={reportType === 'gstr1' ? downloadGSTR1 : downloadGSTR3B}
          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Download size={16} /> Download {reportType === 'gstr1' ? 'GSTR-1' : 'GSTR-3B'}
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Invoices', value: totals.totalInvoices, color: '#2196f3' },
          { label: 'Taxable Value', value: `₹${totals.totalTaxableValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#ff9800' },
          { label: 'Total CGST', value: `₹${totals.totalCGST.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#4caf50' },
          { label: 'Total SGST', value: `₹${totals.totalSGST.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#4caf50' },
          { label: 'Total Tax', value: `₹${totals.totalTax.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#f44336' },
          { label: 'Invoice Value', value: `₹${totals.totalInvoiceValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: '#9c27b0' },
        ].map((card, i) => (
          <div key={i} style={{ background: 'white', borderRadius: '12px', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', borderLeft: `4px solid ${card.color}` }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>{card.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a1a' }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>Loading...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', overflow: 'auto', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left' }}>Sr</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Invoice No</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>Customer</th>
                <th style={{ padding: '12px', textAlign: 'left' }}>GSTIN</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Taxable Value</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>CGST</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>SGST</th>
                <th style={{ padding: '12px', textAlign: 'right' }}>Invoice Value</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', padding: '40px', color: '#999' }}>No sales found for this period</td></tr>
              ) : breakdown.map((b, i) => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '10px 12px' }}>{i + 1}</td>
                  <td style={{ padding: '10px 12px', fontWeight: 600 }}>{b.billNumber}</td>
                  <td style={{ padding: '10px 12px' }}>{format(new Date(b.saleDate), 'dd/MM/yyyy')}</td>
                  <td style={{ padding: '10px 12px' }}>{b.customerName}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace' }}>{b.customerGSTIN || '-'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{b.taxableValue.toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{b.cgstAmount.toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>₹{b.sgstAmount.toFixed(2)}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 600 }}>₹{b.finalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
