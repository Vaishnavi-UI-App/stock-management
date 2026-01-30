import { useState, useRef } from 'react';
import { Search, Eye, X, Printer, Clock, CheckCircle, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { TaxInvoice } from '../../components/TaxInvoice';
import type { Sale } from '../../types';
import './Sales.css';

export function MySales() {
  const { currentUser, sales } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  const mySales = sales.filter(s => s.salesmanId === currentUser?.id);

  // Filter by month/year
  const filteredSales = mySales.filter(sale => {
    const saleDate = new Date(sale.saleDate);
    const matchesMonth = saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
    const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesSearch;
  }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  // Calculate stats
  const totalSales = filteredSales.length;
  const totalAmount = filteredSales.reduce((sum, s) => sum + s.finalAmount, 0);
  const avgSale = totalSales > 0 ? totalAmount / totalSales : 0;

  // Product wise sales
  const productSales: Record<string, { name: string; qty: number; amount: number }> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      if (productSales[item.productId]) {
        productSales[item.productId].qty += item.quantity;
        productSales[item.productId].amount += item.total;
      } else {
        productSales[item.productId] = {
          name: item.productName,
          qty: item.quantity,
          amount: item.total
        };
      }
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  const viewedSale = selectedSale ? mySales.find(s => s.id === selectedSale) : null;

  // Handle print
  const handlePrint = (sale: Sale) => {
    setPrintSale(sale);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><CheckCircle size={12} /> Approved</span>;
      case 'rejected':
        return <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><XCircle size={12} /> Rejected</span>;
      default:
        return <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}><Clock size={12} /> Pending</span>;
    }
  };

  // Show print view
  if (printSale) {
    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Tax Invoice</h1>
            <p>Bill #{printSale.billNumber}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={() => window.print()}>
              <Printer size={18} />
              Print
            </button>
            <button className="btn btn-secondary" onClick={() => setPrintSale(null)}>
              Back to My Sales
            </button>
          </div>
        </div>
        <TaxInvoice ref={billRef} sale={printSale} />
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>My Sales</h1>
          <p>View your sales history and performance</p>
        </div>
      </div>

      {/* Stats */}
      <div className="sales-stats">
        <div className="sales-stat">
          <div className="sales-stat-value">{totalSales}</div>
          <div className="sales-stat-label">Total Bills</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">₹{totalAmount.toLocaleString()}</div>
          <div className="sales-stat-label">Total Sales</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">₹{Math.round(avgSale).toLocaleString()}</div>
          <div className="sales-stat-label">Avg. Sale</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
          style={{ maxWidth: '150px' }}
        >
          {months.map((month, index) => (
            <option key={index} value={index}>{month}</option>
          ))}
        </select>
        <select
          className="form-select"
          value={selectedYear}
          onChange={(e) => setSelectedYear(parseInt(e.target.value))}
          style={{ maxWidth: '100px' }}
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search by customer or bill number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
        />
      </div>

      <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Sales List */}
        <div className="card">
          <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: '600' }}>
            Sales History - {months[selectedMonth]} {selectedYear}
          </h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Bill No</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.length > 0 ? (
                  filteredSales.map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <span className="badge badge-primary">{sale.billNumber}</span>
                      </td>
                      <td>{sale.customerName}</td>
                      <td>{format(new Date(sale.saleDate), 'dd MMM yyyy')}</td>
                      <td>
                        <strong>₹{sale.finalAmount.toLocaleString()}</strong>
                      </td>
                      <td style={{ color: '#22863a', fontWeight: 500 }}>
                        ₹{(sale.amountPaid || 0).toLocaleString()}
                      </td>
                      <td>
                        {(sale.balanceDue || 0) > 0 ? (
                          <span style={{ color: '#c62828', fontWeight: 600 }}>₹{(sale.balanceDue || 0).toLocaleString()}</span>
                        ) : (
                          <span className="badge badge-success">Paid</span>
                        )}
                      </td>
                      <td>
                        {getStatusBadge(sale.status || 'pending')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => setSelectedSale(sale.id)}
                            title="View Details"
                          >
                            <Eye size={14} />
                          </button>
                          {sale.status === 'approved' && (
                            <button
                              className="btn btn-sm btn-success"
                              onClick={() => handlePrint(sale)}
                              title="Print Bill"
                            >
                              <Printer size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center text-gray-500">
                      No sales found for this period
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Products */}
        <div className="card">
          <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: '600' }}>
            Top Selling Products
          </h3>
          {topProducts.length > 0 ? (
            <div className="stock-list">
              {topProducts.map((product, index) => (
                <div className="stock-item" key={index}>
                  <div className="stock-info">
                    <span className="stock-name">{product.name}</span>
                    <span className="stock-location">{product.qty} units sold</span>
                  </div>
                  <div className="stock-qty">₹{product.amount.toLocaleString()}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-gray-500">No sales data</p>
            </div>
          )}
        </div>
      </div>

      {/* View Sale Modal */}
      {viewedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Bill #{viewedSale.billNumber}</h3>
              <button className="modal-close" onClick={() => setSelectedSale(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Status Banner */}
              <div style={{
                marginBottom: '16px',
                padding: '12px',
                borderRadius: '8px',
                background: viewedSale.status === 'approved' ? '#d4edda' : viewedSale.status === 'rejected' ? '#f8d7da' : '#fff3cd',
                color: viewedSale.status === 'approved' ? '#155724' : viewedSale.status === 'rejected' ? '#721c24' : '#856404',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {viewedSale.status === 'approved' ? <CheckCircle size={20} /> : viewedSale.status === 'rejected' ? <XCircle size={20} /> : <Clock size={20} />}
                  <span style={{ fontWeight: '600' }}>
                    {viewedSale.status === 'approved' ? 'Bill Approved - Ready to Print' : viewedSale.status === 'rejected' ? 'Bill Rejected' : 'Pending Admin Approval'}
                  </span>
                </div>
                {viewedSale.status === 'approved' && (
                  <button
                    className="btn btn-success btn-sm"
                    onClick={() => {
                      setSelectedSale(null);
                      handlePrint(viewedSale);
                    }}
                  >
                    <Printer size={16} />
                    Print Bill
                  </button>
                )}
              </div>

              {viewedSale.status === 'rejected' && viewedSale.rejectionReason && (
                <div style={{ marginBottom: '16px', padding: '10px', background: '#fff', border: '1px solid #f5c6cb', borderRadius: '6px' }}>
                  <strong>Rejection Reason:</strong> {viewedSale.rejectionReason}
                </div>
              )}

              <div className="bill-preview-info" style={{ marginBottom: '20px' }}>
                <div>
                  <label>Customer:</label>
                  <span>{viewedSale.customerName}</span>
                </div>
                <div>
                  <label>Date:</label>
                  <span>{format(new Date(viewedSale.saleDate), 'dd/MM/yyyy hh:mm a')}</span>
                </div>
                <div>
                  <label>Phone:</label>
                  <span>{viewedSale.customerPhone || 'N/A'}</span>
                </div>
                <div>
                  <label>Payment:</label>
                  <span style={{ textTransform: 'uppercase' }}>{viewedSale.paymentMethod}</span>
                </div>
              </div>

              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Rate</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {viewedSale.items.map((item, index) => (
                    <tr key={index}>
                      <td>{item.productName}</td>
                      <td>{item.quantity}</td>
                      <td>₹{item.price}</td>
                      <td>₹{item.total}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="bill-preview-totals mt-4">
                <div className="bill-row">
                  <label>Subtotal:</label>
                  <span>₹{viewedSale.totalAmount.toLocaleString()}</span>
                </div>
                {viewedSale.discount > 0 && (
                  <div className="bill-row">
                    <label>Discount:</label>
                    <span>-₹{viewedSale.discount.toLocaleString()}</span>
                  </div>
                )}
                <div className="bill-row">
                  <label>GST ({(viewedSale.cgstRate || 2.5) + (viewedSale.sgstRate || 2.5)}%):</label>
                  <span>Included</span>
                </div>
                <div className="bill-row total">
                  <label>Total:</label>
                  <span>₹{viewedSale.finalAmount.toLocaleString()}</span>
                </div>
                <div className="bill-row" style={{ color: '#22863a' }}>
                  <label>Amount Paid:</label>
                  <span>₹{(viewedSale.amountPaid || 0).toLocaleString()}</span>
                </div>
                <div className="bill-row" style={{ color: (viewedSale.balanceDue || 0) > 0 ? '#c62828' : '#22863a', fontWeight: 600 }}>
                  <label>{(viewedSale.balanceDue || 0) > 0 ? 'Balance Due:' : 'Status:'}</label>
                  <span>{(viewedSale.balanceDue || 0) > 0 ? `₹${(viewedSale.balanceDue || 0).toLocaleString()}` : 'Fully Paid'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
