import { useState, useRef } from 'react';
import { Search, Eye, X, Printer, Clock, CheckCircle, XCircle, Download, Share2, Trash2, Edit2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store/useStore';
import { salesApi } from '../../services/api';
import { format } from 'date-fns';
import { TaxInvoice } from '../../components/TaxInvoice';
import type { Sale } from '../../types';
import './Sales.css';

export function MySales() {
  const { currentUser, sales, fetchSales } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [editForm, setEditForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '', customerAddress: '', customerGSTIN: '',
    discount: 0, amountPaid: 0, modeOfPayment: '', destination: '', vehicleNo: ''
  });
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

  const handleDownloadPDF = async (sale: Sale) => {
    // If not already in print view, set it and wait for render
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

  const handleDelete = async (sale: Sale) => {
    if (!window.confirm(`Delete bill ${sale.billNumber}?`)) return;
    try {
      await salesApi.delete(sale.id);
      await fetchSales({ salesmanId: currentUser?.id });
    } catch (error: any) {
      alert(error.message || 'Failed to delete bill');
    }
  };

  const handleEditOpen = (sale: Sale) => {
    setEditForm({
      customerName: sale.customerName,
      customerPhone: sale.customerPhone || '',
      customerEmail: sale.customerEmail || '',
      customerAddress: sale.customerAddress || '',
      customerGSTIN: sale.customerGSTIN || '',
      discount: sale.discount,
      amountPaid: sale.amountPaid || 0,
      modeOfPayment: sale.modeOfPayment || '',
      destination: sale.destination || '',
      vehicleNo: sale.vehicleNo || ''
    });
    setEditingSale(sale);
  };

  const handleEditSave = async () => {
    if (!editingSale) return;
    try {
      const subtotal = editingSale.items.reduce((sum, item) => sum + item.total, 0);
      const finalAmount = subtotal - editForm.discount;
      await salesApi.update(editingSale.id, {
        customerName: editForm.customerName,
        customerPhone: editForm.customerPhone,
        customerEmail: editForm.customerEmail,
        customerAddress: editForm.customerAddress,
        customerGSTIN: editForm.customerGSTIN,
        discount: editForm.discount,
        finalAmount,
        amountPaid: editForm.amountPaid,
        balanceDue: finalAmount - editForm.amountPaid,
        paymentStatus: editForm.amountPaid >= finalAmount ? 'paid' : editForm.amountPaid > 0 ? 'partial' : 'unpaid',
        modeOfPayment: editForm.modeOfPayment,
        destination: editForm.destination,
        vehicleNo: editForm.vehicleNo
      });
      await fetchSales({ salesmanId: currentUser?.id });
      setEditingSale(null);
    } catch (error: any) {
      alert(error.message || 'Failed to update bill');
    }
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
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEditOpen(sale)}
                            title="Edit Bill"
                          >
                            <Edit2 size={14} />
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
                          {sale.status === 'pending' && (
                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(sale)}
                              title="Delete Bill"
                            >
                              <Trash2 size={14} />
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

      {/* Edit Sale Modal */}
      {editingSale && (
        <div className="modal-overlay" onClick={() => setEditingSale(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Edit Bill #{editingSale.billNumber}</h3>
              <button className="modal-close" onClick={() => setEditingSale(null)}><X size={20} /></button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="form-label">Customer Name</label>
                <input className="form-input" value={editForm.customerName} onChange={e => setEditForm({ ...editForm, customerName: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input className="form-input" value={editForm.customerPhone} onChange={e => setEditForm({ ...editForm, customerPhone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-input" value={editForm.customerEmail} onChange={e => setEditForm({ ...editForm, customerEmail: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <textarea className="form-input" value={editForm.customerAddress} onChange={e => setEditForm({ ...editForm, customerAddress: e.target.value })} rows={2} />
              </div>
              <div className="form-group">
                <label className="form-label">GSTIN</label>
                <input className="form-input" value={editForm.customerGSTIN} onChange={e => setEditForm({ ...editForm, customerGSTIN: e.target.value })} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Discount (₹)</label>
                  <input type="number" className="form-input" value={editForm.discount || ''} onChange={e => setEditForm({ ...editForm, discount: parseFloat(e.target.value) || 0 })} min="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount Paid (₹)</label>
                  <input type="number" className="form-input" value={editForm.amountPaid || ''} onChange={e => setEditForm({ ...editForm, amountPaid: parseFloat(e.target.value) || 0 })} min="0" />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Mode of Payment</label>
                  <input className="form-input" value={editForm.modeOfPayment} onChange={e => setEditForm({ ...editForm, modeOfPayment: e.target.value })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Destination</label>
                  <input className="form-input" value={editForm.destination} onChange={e => setEditForm({ ...editForm, destination: e.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Vehicle No.</label>
                <input className="form-input" value={editForm.vehicleNo} onChange={e => setEditForm({ ...editForm, vehicleNo: e.target.value })} />
              </div>

              {/* Items (read only) */}
              <div style={{ marginTop: 12, padding: 12, background: '#f8f9fa', borderRadius: 8 }}>
                <h4 style={{ fontSize: 14, marginBottom: 8 }}>Items</h4>
                <table className="table" style={{ fontSize: 13 }}>
                  <thead><tr><th>Product</th><th>Qty</th><th>Rate</th><th>Amount</th></tr></thead>
                  <tbody>
                    {editingSale.items.map((item, i) => (
                      <tr key={i}><td>{item.productName}</td><td>{item.quantity}</td><td>₹{item.price}</td><td>₹{item.total}</td></tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ marginTop: 8, fontWeight: 600 }}>
                  Subtotal: ₹{editingSale.totalAmount.toLocaleString()} | After Discount: ₹{(editingSale.totalAmount - editForm.discount).toLocaleString()}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setEditingSale(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleEditSave}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

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
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => {
                        setSelectedSale(null);
                        handlePrint(viewedSale);
                      }}
                    >
                      <Printer size={16} />
                      Print
                    </button>
                    <button
                      className="btn btn-primary btn-sm"
                      onClick={() => handleDownloadPDF(viewedSale)}
                    >
                      <Download size={16} />
                      Download
                    </button>
                    <button
                      className="btn btn-success btn-sm"
                      style={{ background: '#25D366', borderColor: '#25D366' }}
                      onClick={() => handleShareWhatsApp(viewedSale)}
                    >
                      <Share2 size={16} />
                      Share
                    </button>
                  </div>
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
