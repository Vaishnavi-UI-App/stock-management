import { useState, useRef, useEffect } from 'react';
import { Package, Search, Plus, Minus, Trash2, Printer, Clock, Send, MapPin } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { SaleItem } from '../../types';
import { TaxInvoice } from '../../components/TaxInvoice';
import './Sales.css';

// GST Rate options (half values - CGST and SGST are equal)
const GST_RATES = [2.5, 9];

export function CreateBill() {
  const {
    currentUser,
    salesmanStock,
    createSale,
    getProductById
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGSTIN, setCustomerGSTIN] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);

  // Delivery Details
  const [deliveryNote, setDeliveryNote] = useState('');
  const [modeOfPayment, setModeOfPayment] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [otherReferences, setOtherReferences] = useState('');
  const [buyersOrderNo, setBuyersOrderNo] = useState('');
  const [buyersOrderDate, setBuyersOrderDate] = useState('');
  const [dispatchDocNo, setDispatchDocNo] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [poNumber, setPoNumber] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');

  const [showBill, setShowBill] = useState(false);
  const [createdSale, setCreatedSale] = useState<Awaited<ReturnType<typeof createSale>> | null>(null);
  const [billSubmitted, setBillSubmitted] = useState(false);
  const billRef = useRef<HTMLDivElement>(null);
  const [billLocation, setBillLocation] = useState('');
  const [billCoords, setBillCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    // Capture current location on page load
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setBillCoords({ lat: latitude, lng: longitude });
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await resp.json();
            if (data?.display_name) {
              setBillLocation(data.display_name);
            } else {
              setBillLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } catch {
            setBillLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        },
        () => setBillLocation('Location unavailable'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const mySalesmanStock = salesmanStock.filter(ss => ss.salesmanId === currentUser?.id);
  const branchId = currentUser?.branchId || '';

  const addToCart = (productId: string) => {
    const product = getProductById(productId);
    if (!product) return;

    const stockItem = mySalesmanStock.find(ss => ss.productId === productId);
    if (!stockItem) return;

    const existingItem = cart.find(item => item.productId === productId);
    const currentQty = existingItem?.quantity || 0;

    if (currentQty >= stockItem.quantity) {
      alert('Cannot add more than available stock');
      return;
    }

    if (existingItem) {
      setCart(cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price }
          : item
      ));
    } else {
      setCart([...cart, {
        productId,
        productName: product.name,
        quantity: 1,
        price: product.price,
        total: product.price,
        hsnCode: product.sku,
        unit: product.unit
      }]);
    }
  };

  const updateCartItemQty = (productId: string, qty: number) => {
    const stockItem = mySalesmanStock.find(ss => ss.productId === productId);
    if (!stockItem) return;

    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    if (qty > stockItem.quantity) {
      alert('Cannot add more than available stock');
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: qty, total: qty * item.price }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const finalAmount = subtotal - discount;

  const handleCreateBill = async () => {
    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (!customerPhone.trim()) {
      alert('Please enter customer phone number');
      return;
    }

    if (!modeOfPayment.trim()) {
      alert('Please enter mode/terms of payment');
      return;
    }

    if (!destination.trim()) {
      alert('Please enter destination');
      return;
    }

    if (!vehicleNo.trim()) {
      alert('Please enter vehicle number');
      return;
    }

    if (!customerGSTIN.trim()) {
      alert('Please enter customer GSTIN');
      return;
    }

    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    try {
      const sale = await createSale({
        salesmanId: currentUser?.id || '',
        branchId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        customerAddress: customerAddress.trim(),
        customerGSTIN: customerGSTIN.trim(),
        items: cart,
        totalAmount: subtotal,
        discount,
        finalAmount,
        amountPaid,
        cgstRate,
        sgstRate,
        paymentMethod,
        // Delivery Details
        deliveryNote,
        modeOfPayment,
        referenceNo,
        otherReferences,
        buyersOrderNo,
        buyersOrderDate,
        dispatchDocNo,
        deliveryNoteDate,
        dispatchedThrough,
        destination,
        poNumber,
        vehicleNo,
        billLocation: billLocation || undefined,
        saleDate: new Date(),
        balanceDue: finalAmount - amountPaid,
        paymentStatus: amountPaid >= finalAmount ? 'paid' : amountPaid > 0 ? 'partial' : 'unpaid'
      });

      setCreatedSale(sale);
      setBillSubmitted(true);
    } catch (error: any) {
      alert(error.message || 'Failed to create bill');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleNewBill = () => {
    setCart([]);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerAddress('');
    setCustomerGSTIN('');
    setDiscount(0);
    setCgstRate(2.5);
    setSgstRate(2.5);
    setPaymentMethod('cash');
    setAmountPaid(0);
    // Reset delivery details
    setDeliveryNote('');
    setModeOfPayment('');
    setReferenceNo('');
    setOtherReferences('');
    setBuyersOrderNo('');
    setBuyersOrderDate('');
    setDispatchDocNo('');
    setDeliveryNoteDate('');
    setDispatchedThrough('');
    setDestination('');
    setPoNumber('');
    setVehicleNo('');
    setShowBill(false);
    setBillSubmitted(false);
    setCreatedSale(null);
  };

  const filteredStock = mySalesmanStock.filter(ss => {
    const product = getProductById(ss.productId);
    return product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Show bill submitted for approval
  if (billSubmitted && createdSale) {
    const isApproved = createdSale.status === 'approved';
    const isPending = createdSale.status === 'pending';
    const isRejected = createdSale.status === 'rejected';

    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Bill {isPending ? 'Submitted for Approval' : isApproved ? 'Approved' : 'Rejected'}</h1>
            <p>Bill #{createdSale.billNumber}</p>
            {isPending && (
              <div className="status-badge pending" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '14px' }}>
                <Clock size={16} />
                Waiting for Admin Approval
              </div>
            )}
            {isRejected && createdSale.rejectionReason && (
              <div className="status-badge rejected" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
                Rejection Reason: {createdSale.rejectionReason}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {isApproved && (
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={18} />
                Print Bill
              </button>
            )}
            <button className="btn btn-success" onClick={handleNewBill}>
              <Plus size={18} />
              New Bill
            </button>
          </div>
        </div>

        {isApproved ? (
          <TaxInvoice ref={billRef} sale={createdSale} />
        ) : (
          <div className="bill-preview-pending" style={{ background: '#f8f9fa', padding: '40px', borderRadius: '8px', textAlign: 'center', marginTop: '20px' }}>
            <Clock size={64} style={{ color: '#6c757d', marginBottom: '16px' }} />
            <h2 style={{ color: '#495057', marginBottom: '8px' }}>Bill Pending Approval</h2>
            <p style={{ color: '#6c757d' }}>Your bill has been submitted to admin for approval. You will be able to print it once approved.</p>
            <div style={{ marginTop: '24px', padding: '16px', background: '#fff', borderRadius: '8px', maxWidth: '400px', margin: '24px auto 0' }}>
              <p><strong>Bill Number:</strong> {createdSale.billNumber}</p>
              <p><strong>Customer:</strong> {createdSale.customerName}</p>
              <p><strong>Amount:</strong> ₹{createdSale.finalAmount.toLocaleString()}</p>
              <p><strong>Amount Paid:</strong> ₹{(createdSale.amountPaid || 0).toLocaleString()}</p>
              <p><strong>Balance Due:</strong> ₹{(createdSale.balanceDue || 0).toLocaleString()}</p>
              <p><strong>Payment Status:</strong> <span style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                background: createdSale.paymentStatus === 'paid' ? '#e8f5e9' : createdSale.paymentStatus === 'partial' ? '#fff3e0' : '#ffebee',
                color: createdSale.paymentStatus === 'paid' ? '#2e7d32' : createdSale.paymentStatus === 'partial' ? '#ef6c00' : '#c62828'
              }}>{createdSale.paymentStatus?.toUpperCase() || 'UNPAID'}</span></p>
              <p><strong>CGST Rate:</strong> {createdSale.cgstRate}%</p>
              <p><strong>SGST Rate:</strong> {createdSale.sgstRate}%</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (showBill && createdSale) {
    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Bill Created</h1>
            <p>Bill #{createdSale.billNumber}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} />
              Print Bill
            </button>
            <button className="btn btn-success" onClick={handleNewBill}>
              <Plus size={18} />
              New Bill
            </button>
          </div>
        </div>

        <TaxInvoice ref={billRef} sale={createdSale} />
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>Create Bill</h1>
          <p>Create new invoice for customers</p>
        </div>
      </div>

      <div className="bill-container">
        <div className="bill-products">
          <div className="search-bar" style={{ margin: 0, marginBottom: '16px' }}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="product-list">
            {filteredStock.length > 0 ? (
              filteredStock.map((ss) => {
                const product = getProductById(ss.productId);
                if (!product) return null;

                const cartItem = cart.find(item => item.productId === ss.productId);

                return (
                  <div className="product-list-item" key={ss.id}>
                    <div className="product-list-info">
                      <Package size={24} className="product-list-icon" />
                      <div>
                        <div className="product-list-name">{product.name}</div>
                        <div className="product-list-meta">
                          {product.sku} • ₹{product.price} per {product.unit}
                        </div>
                      </div>
                    </div>
                    <div className="product-list-stock">
                      <div className="stock-info-box">
                        <span className="stock-label">Available</span>
                        <span className="stock-value">{ss.quantity}</span>
                      </div>
                    </div>
                    <div className="product-list-actions">
                      {cartItem ? (
                        <div className="quantity-input">
                          <button
                            className="qty-btn"
                            onClick={() => updateCartItemQty(ss.productId, cartItem.quantity - 1)}
                          >
                            <Minus size={16} />
                          </button>
                          <input
                            type="number"
                            value={cartItem.quantity}
                            onChange={(e) => updateCartItemQty(ss.productId, parseInt(e.target.value) || 0)}
                          />
                          <button
                            className="qty-btn"
                            onClick={() => updateCartItemQty(ss.productId, cartItem.quantity + 1)}
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => addToCart(ss.productId)}
                        >
                          <Plus size={14} />
                          Add
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="empty-state">
                <Package size={48} className="empty-state-icon" />
                <p>No products available. Take products from branch first.</p>
              </div>
            )}
          </div>
        </div>

        <div className="bill-summary">
          <h3>Bill Summary</h3>

          <div className="customer-form">
            {/* Salesman Info */}
            <div style={{ padding: '10px 12px', background: '#e3f2fd', borderRadius: '6px', marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#1565c0' }}>Created By</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d47a1' }}>{currentUser?.name || 'Unknown'}</div>
            </div>

            {billLocation && (
              <div style={{ padding: '10px 12px', background: '#e8f5e9', borderRadius: '6px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                <MapPin size={16} style={{ color: '#2e7d32', flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <div style={{ fontSize: '12px', color: '#2e7d32' }}>Bill Location</div>
                  {billCoords ? (
                    <a
                      href={`https://www.google.com/maps?q=${billCoords.lat},${billCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: '12px', color: '#1565c0', textDecoration: 'underline', wordBreak: 'break-word' }}
                    >
                      {billLocation}
                    </a>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#333' }}>{billLocation}</div>
                  )}
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Customer Name *</label>
              <input
                type="text"
                className="form-input"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter customer name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone *</label>
              <input
                type="tel"
                className="form-input"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="Customer phone"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email (Optional)</label>
              <input
                type="email"
                className="form-input"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                placeholder="Customer email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Address (Optional)</label>
              <textarea
                className="form-input"
                value={customerAddress}
                onChange={(e) => setCustomerAddress(e.target.value)}
                placeholder="Customer address"
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label">GSTIN *</label>
              <input
                type="text"
                className="form-input"
                value={customerGSTIN}
                onChange={(e) => setCustomerGSTIN(e.target.value)}
                placeholder="Customer GSTIN"
              />
            </div>
            <div className="form-row" style={{ display: 'flex', gap: '12px' }}>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">CGST Rate (%)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  {GST_RATES.map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setCgstRate(rate)}
                      style={{
                        padding: '4px 12px',
                        border: cgstRate === rate ? '2px solid #4f46e5' : '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: cgstRate === rate ? '#e0e7ff' : '#fff',
                        color: cgstRate === rate ? '#4f46e5' : '#374151',
                        fontWeight: cgstRate === rate ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={cgstRate}
                  onChange={(e) => setCgstRate(parseFloat(e.target.value) || 0)}
                  placeholder="Or enter custom rate"
                  min="0"
                  max="50"
                  step="0.5"
                  style={{ fontSize: '13px' }}
                />
              </div>
              <div className="form-group" style={{ flex: 1 }}>
                <label className="form-label">SGST Rate (%)</label>
                <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                  {GST_RATES.map(rate => (
                    <button
                      key={rate}
                      type="button"
                      onClick={() => setSgstRate(rate)}
                      style={{
                        padding: '4px 12px',
                        border: sgstRate === rate ? '2px solid #4f46e5' : '1px solid #d1d5db',
                        borderRadius: '4px',
                        background: sgstRate === rate ? '#e0e7ff' : '#fff',
                        color: sgstRate === rate ? '#4f46e5' : '#374151',
                        fontWeight: sgstRate === rate ? '600' : '400',
                        cursor: 'pointer',
                        fontSize: '13px'
                      }}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  className="form-input"
                  value={sgstRate}
                  onChange={(e) => setSgstRate(parseFloat(e.target.value) || 0)}
                  placeholder="Or enter custom rate"
                  min="0"
                  max="50"
                  step="0.5"
                  style={{ fontSize: '13px' }}
                />
              </div>
            </div>
            <div className="gst-total-info" style={{ padding: '8px 12px', background: '#e8f5e9', borderRadius: '4px', fontSize: '13px', color: '#2e7d32' }}>
              Total GST: {cgstRate + sgstRate}% (CGST {cgstRate}% + SGST {sgstRate}%)
            </div>

            {/* Delivery Details Section */}
            <div style={{ marginTop: '16px', padding: '12px', background: '#f8f9fa', borderRadius: '8px', border: '1px solid #e9ecef' }}>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#495057' }}>Delivery Details</h4>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Delivery Note</label>
                  <input
                    type="text"
                    className="form-input"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Mode/Terms of Payment *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={modeOfPayment}
                    onChange={(e) => setModeOfPayment(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Reference No. & Date</label>
                  <input
                    type="text"
                    className="form-input"
                    value={referenceNo}
                    onChange={(e) => setReferenceNo(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Other References</label>
                  <input
                    type="text"
                    className="form-input"
                    value={otherReferences}
                    onChange={(e) => setOtherReferences(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Buyer's Order No.</label>
                  <input
                    type="text"
                    className="form-input"
                    value={buyersOrderNo}
                    onChange={(e) => setBuyersOrderNo(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Dated</label>
                  <input
                    type="date"
                    className="form-input"
                    value={buyersOrderDate}
                    onChange={(e) => setBuyersOrderDate(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Dispatch Doc No.</label>
                  <input
                    type="text"
                    className="form-input"
                    value={dispatchDocNo}
                    onChange={(e) => setDispatchDocNo(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Delivery Note Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={deliveryNoteDate}
                    onChange={(e) => setDeliveryNoteDate(e.target.value)}
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Dispatched through</label>
                  <input
                    type="text"
                    className="form-input"
                    value={dispatchedThrough}
                    onChange={(e) => setDispatchedThrough(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Destination *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
              </div>

              <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>PO Number</label>
                  <input
                    type="text"
                    className="form-input"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '12px' }}>Vehicle No. *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={vehicleNo}
                    onChange={(e) => setVehicleNo(e.target.value)}
                    placeholder=""
                    style={{ padding: '6px 10px', fontSize: '13px' }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="cart-items">
            {cart.length > 0 ? (
              cart.map((item) => (
                <div className="cart-item" key={item.productId}>
                  <div className="cart-item-info">
                    <div className="cart-item-name">{item.productName}</div>
                    <div className="cart-item-details">
                      {item.quantity} x ₹{item.price}
                    </div>
                  </div>
                  <span className="cart-item-total">₹{item.total}</span>
                  <button
                    className="cart-item-remove"
                    onClick={() => removeFromCart(item.productId)}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p className="text-gray-500">No items in cart</p>
              </div>
            )}
          </div>

          <div className="bill-totals">
            <div className="bill-row">
              <label>Subtotal:</label>
              <span>₹{subtotal.toLocaleString()}</span>
            </div>
            <div className="bill-row">
              <label>Discount:</label>
              <input
                type="number"
                className="form-input"
                style={{ width: '100px', padding: '6px 10px' }}
                value={discount || ''}
                onChange={(e) => setDiscount(parseInt(e.target.value) || 0)}
                placeholder="0"
                min="0"
                max={subtotal}
              />
            </div>
            <div className="bill-row total">
              <label>Total:</label>
              <span>₹{finalAmount.toLocaleString()}</span>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Payment Method</label>
            <select
              className="form-select"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI</option>
              <option value="credit">Credit</option>
            </select>
          </div>

          {/* Amount Received Section */}
          <div style={{ marginTop: '16px', padding: '12px', background: '#fff8e1', borderRadius: '8px', border: '1px solid #ffecb3' }}>
            <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#f57c00' }}>Payment Details</h4>
            <div className="form-group" style={{ marginBottom: '8px' }}>
              <label className="form-label" style={{ fontSize: '12px' }}>Amount Received (₹)</label>
              <input
                type="number"
                className="form-input"
                value={amountPaid || ''}
                onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                placeholder="0"
                min="0"
                max={finalAmount + 10000}
                style={{ fontSize: '16px', fontWeight: '600' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: amountPaid >= finalAmount ? '#e8f5e9' : '#ffebee', borderRadius: '4px', marginTop: '8px' }}>
              <span style={{ fontSize: '13px', color: amountPaid >= finalAmount ? '#2e7d32' : '#c62828' }}>
                {amountPaid >= finalAmount ? 'Fully Paid' : 'Balance Due'}
              </span>
              <span style={{ fontSize: '14px', fontWeight: '600', color: amountPaid >= finalAmount ? '#2e7d32' : '#c62828' }}>
                ₹{Math.max(0, finalAmount - amountPaid).toLocaleString()}
              </span>
            </div>
            {amountPaid > finalAmount && (
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#e3f2fd', borderRadius: '4px', marginTop: '8px' }}>
                <span style={{ fontSize: '13px', color: '#1565c0' }}>Advance Amount</span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#1565c0' }}>
                  ₹{(amountPaid - finalAmount).toLocaleString()}
                </span>
              </div>
            )}
          </div>

          <button
            className="btn btn-success btn-block btn-lg"
            onClick={handleCreateBill}
            disabled={cart.length === 0 || !customerName.trim() || !customerPhone.trim() || !customerGSTIN.trim() || !modeOfPayment.trim() || !destination.trim() || !vehicleNo.trim()}
          >
            <Send size={20} />
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
