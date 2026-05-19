import { useState, useRef } from 'react';
import { Search, Eye, X, Download, Printer, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import { TaxInvoice } from '../../components/TaxInvoice';
import type { Sale } from '../../types';
import './Sales.css';

export function AllSales() {
  const { sales, branches, getBranchById, getUserById, currentUser } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedSale, setSelectedSale] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const billRef = useRef<HTMLDivElement>(null);

  // For branch managers, only show their branch sales
  const isBranchManager = currentUser?.role === 'branch_manager';
  const branchFilter = isBranchManager ? currentUser?.branchId : selectedBranch;

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const saleDate = new Date(sale.saleDate);
    const matchesMonth = saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;
    const matchesBranch = branchFilter ? sale.branchId === branchFilter : true;
    const matchesSearch = sale.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          sale.billNumber.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesBranch && matchesSearch;
  }).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

  // Calculate stats
  const totalSales = filteredSales.length;
  const totalAmount = filteredSales.reduce((sum, s) => sum + s.finalAmount, 0);
  const avgSale = totalSales > 0 ? totalAmount / totalSales : 0;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  const viewedSale = selectedSale ? sales.find(s => s.id === selectedSale) : null;

  const handlePrint = (sale: Sale) => {
    setPrintSale(sale);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async (sale: Sale) => {
    if (!printSale || printSale.id !== sale.id) {
      setPrintSale(sale);
      await new Promise(r => setTimeout(r, 200));
    }
    const element = billRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let y = 0;
        while (y < imgHeight) {
          pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight);
          y += pageHeight;
          if (y < imgHeight) pdf.addPage();
        }
      }
      pdf.save(`Bill-${sale.billNumber}.pdf`);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try printing instead.');
    }
  };

  const handleShareWhatsApp = async (sale: Sale) => {
    if (!printSale || printSale.id !== sale.id) {
      setPrintSale(sale);
      await new Promise(r => setTimeout(r, 200));
    }
    const element = billRef.current;
    if (!element) return;
    try {
      const canvas = await html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      if (imgHeight <= pageHeight) {
        pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      } else {
        let y = 0;
        while (y < imgHeight) {
          pdf.addImage(imgData, 'PNG', 0, -y, imgWidth, imgHeight);
          y += pageHeight;
          if (y < imgHeight) pdf.addPage();
        }
      }
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], `Bill-${sale.billNumber}.pdf`, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          files: [pdfFile],
          title: `Bill #${sale.billNumber}`,
          text: `Bill #${sale.billNumber} - Amount: ₹${sale.finalAmount.toLocaleString()}`
        });
      } else {
        pdf.save(`Bill-${sale.billNumber}.pdf`);
        const text = encodeURIComponent(
          `Bill #${sale.billNumber}\nCustomer: ${sale.customerName}\nAmount: ₹${sale.finalAmount.toLocaleString()}\nBalance Due: ₹${(sale.balanceDue || 0).toLocaleString()}`
        );
        const cleanPhone = (sale.customerPhone || '').replace(/\D/g, '');
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, '_blank');
      }
    } catch (err) {
      console.error('WhatsApp share failed:', err);
      if ((err as Error)?.name !== 'AbortError') {
        const text = encodeURIComponent(
          `Bill #${sale.billNumber}\nCustomer: ${sale.customerName}\nAmount: ₹${sale.finalAmount.toLocaleString()}`
        );
        const cleanPhone = (sale.customerPhone || '').replace(/\D/g, '');
        const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${text}` : `https://wa.me/?text=${text}`;
        window.open(waUrl, '_blank');
      }
    }
  };

  // Show print/invoice view
  if (printSale) {
    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Tax Invoice</h1>
            <p>Bill #{printSale.billNumber}</p>
          </div>
          <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => handleDownloadPDF(printSale)}>
              <Download size={18} />
              Download PDF
            </button>
            <button className="btn btn-success" onClick={() => handleShareWhatsApp(printSale)} style={{ background: '#25D366', borderColor: '#25D366' }}>
              <Share2 size={18} />
              WhatsApp
            </button>
            <button className="btn btn-secondary" onClick={() => window.print()}>
              <Printer size={18} />
              Print
            </button>
            <button className="btn btn-secondary" onClick={() => setPrintSale(null)}>
              Back to {isBranchManager ? 'Branch Sales' : 'All Sales'}
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
          <h1>{isBranchManager ? 'Branch Sales' : 'All Sales'}</h1>
          <p>View sales history across all branches</p>
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
          <div className="sales-stat-label">Total Revenue</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">₹{Math.round(avgSale).toLocaleString()}</div>
          <div className="sales-stat-label">Avg. Sale</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {!isBranchManager && (
          <select
            className="form-select"
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            style={{ maxWidth: '200px' }}
          >
            <option value="">All Branches</option>
            {branches.map(branch => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
        )}
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

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Bill No</th>
                <th>Customer</th>
                {!isBranchManager && <th>Branch</th>}
                <th>Salesman</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Paid</th>
                <th>Due</th>
                <th>Payment</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const branch = getBranchById(sale.branchId);
                  const salesman = getUserById(sale.salesmanId);

                  return (
                    <tr key={sale.id}>
                      <td>
                        <span className="badge badge-primary">{sale.billNumber}</span>
                      </td>
                      <td>
                        <div>{sale.customerName}</div>
                        {sale.customerPhone && (
                          <small className="text-gray-500">{sale.customerPhone}</small>
                        )}
                      </td>
                      {!isBranchManager && (
                        <td>{branch?.name.split(' - ')[0] || 'N/A'}</td>
                      )}
                      <td>{salesman?.name || 'N/A'}</td>
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
                        <span className={`badge ${sale.paymentMethod === 'cash' ? 'badge-success' : sale.paymentMethod === 'upi' ? 'badge-primary' : 'badge-warning'}`}>
                          {sale.paymentMethod.toUpperCase()}
                        </span>
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
                            <>
                              <button
                                className="btn btn-sm btn-primary"
                                onClick={() => handleDownloadPDF(sale)}
                                title="Download PDF"
                              >
                                <Download size={14} />
                              </button>
                              <button
                                className="btn btn-sm"
                                onClick={() => handleShareWhatsApp(sale)}
                                title="Share to WhatsApp"
                                style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                              >
                                <Share2 size={14} />
                              </button>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handlePrint(sale)}
                                title="Print Bill"
                              >
                                <Printer size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={isBranchManager ? 9 : 10} className="text-center text-gray-500">
                    No sales found for this period
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
              {/* Download/Print Actions */}
              {viewedSale.status === 'approved' && (
                <div style={{
                  marginBottom: '16px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: '#d4edda',
                  color: '#155724',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px'
                }}>
                  <span style={{ fontWeight: '600' }}>Approved - Ready to Download</span>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        setSelectedSale(null);
                        handleDownloadPDF(viewedSale);
                      }}
                    >
                      <Download size={14} />
                      PDF
                    </button>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        setSelectedSale(null);
                        handleShareWhatsApp(viewedSale);
                      }}
                      style={{ background: '#25D366', color: '#fff', borderColor: '#25D366' }}
                    >
                      <Share2 size={14} />
                      WhatsApp
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        setSelectedSale(null);
                        handlePrint(viewedSale);
                      }}
                    >
                      <Printer size={14} />
                      Print
                    </button>
                  </div>
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
                  <label>Branch:</label>
                  <span>{getBranchById(viewedSale.branchId)?.name}</span>
                </div>
                <div>
                  <label>Salesman:</label>
                  <span>{getUserById(viewedSale.salesmanId)?.name}</span>
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
                {viewedSale.billLocation && (
                  <div className="bill-row" style={{ marginTop: '8px' }}>
                    <label>Location:</label>
                    <a
                      href={`https://www.google.com/maps/search/${encodeURIComponent(viewedSale.billLocation)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: '#1565c0', textDecoration: 'underline', fontSize: '12px' }}
                    >
                      📍 View on Map
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
