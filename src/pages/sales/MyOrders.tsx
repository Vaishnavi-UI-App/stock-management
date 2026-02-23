import { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Minus, Trash2, Printer, Clock, Send, ShoppingBag, Eye, MapPin, Edit2, Download, Share2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store/useStore';
import { ordersApi } from '../../services/api';
import type { OrderItem, Order } from '../../types';
import { PurchaseInvoice } from '../../components/PurchaseInvoice';
import { format } from 'date-fns';
import './Sales.css';

// GST Rate options (half values - CGST and SGST are equal)
const GST_RATES = [2.5, 9];

export function MyOrders() {
  const {
    currentUser,
    products,
    getProductById
  } = useStore();

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Create order form state
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerGSTIN, setCustomerGSTIN] = useState('');
  const [discount, setDiscount] = useState(0);
  const [cgstRate, setCgstRate] = useState(2.5);
  const [sgstRate, setSgstRate] = useState(2.5);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi' | 'credit' | 'check'>('cash');
  const [amountPaid, setAmountPaid] = useState(0);

  // Delivery Details
  const [modeOfPayment, setModeOfPayment] = useState('');
  const [destination, setDestination] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [checkNumber, setCheckNumber] = useState('');
  const [checkPhotoName, setCheckPhotoName] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [orderLocation, setOrderLocation] = useState('');
  const [orderCoords, setOrderCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  const branchId = currentUser?.branchId || '';

  // Capture current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          setOrderCoords({ lat: latitude, lng: longitude });
          try {
            const resp = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
              { headers: { 'Accept-Language': 'en' } }
            );
            const data = await resp.json();
            setOrderLocation(data?.display_name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          } catch {
            setOrderLocation(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        },
        () => setOrderLocation('Location unavailable'),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  // Fetch orders
  useEffect(() => {
    if (currentUser?.id) {
      fetchOrders();
    }
  }, [currentUser?.id]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const data = await ordersApi.getAll({ salesmanId: currentUser?.id });
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = (productId: string) => {
    const product = getProductById(productId);
    if (!product) return;

    const existingItem = cart.find(item => item.productId === productId);

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
        unit: product.unit,
        availability: 'available'
      }]);
    }
  };

  const updateCartItemQty = (productId: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: qty, total: qty * item.price }
        : item
    ));
  };

  const updateCartItemAvailability = (productId: string, availability: 'available' | 'not_available') => {
    setCart(cart.map(item =>
      item.productId === productId
        ? { ...item, availability }
        : item
    ));
  };

  const updateCartItem = (productId: string, patch: Partial<OrderItem>) => {
    setCart(cart.map((item) => {
      if (item.productId !== productId) return item;
      const next = { ...item, ...patch };
      return { ...next, total: next.quantity * next.price };
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.productId !== productId));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.total, 0);
  const finalAmount = subtotal - discount;

  const handleCreateOrder = async () => {
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
    if (paymentMethod === 'check' && !checkPhotoName) {
      alert('Check photo is compulsory for check payment.');
      return;
    }

    try {
      // Calculate balance due and payment status
      const balanceDue = Math.max(0, finalAmount - amountPaid);
      let paymentStatus: 'paid' | 'partial' | 'unpaid' = 'unpaid';
      if (balanceDue <= 0) {
        paymentStatus = 'paid';
      } else if (amountPaid > 0) {
        paymentStatus = 'partial';
      }

      const payload = {
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
        balanceDue,
        paymentStatus,
        cgstRate,
        sgstRate,
        paymentMethod: paymentMethod === 'check' ? 'credit' : paymentMethod,
        modeOfPayment: paymentMethod === 'check'
          ? `${modeOfPayment || 'Check'}${checkNumber ? ` (No: ${checkNumber})` : ''}${checkPhotoName ? ` [Photo: ${checkPhotoName}]` : ''}`
          : modeOfPayment,
        destination,
        vehicleNo,
        orderLocation: orderLocation || undefined,
        orderDate: new Date()
      };
      const order = editingOrderId
        ? await ordersApi.update(editingOrderId, payload)
        : await ordersApi.create(payload);

      setCreatedOrder(order);
      setOrderSubmitted(true);
      setEditingOrderId(null);
      fetchOrders();
    } catch (error: any) {
      alert(error.message || 'Failed to create order');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    const element = invoiceRef.current;
    if (!element || !createdOrder) return;
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
    pdf.save(`Order-${createdOrder.orderNumber}.pdf`);
  };

  const handleShareWhatsApp = async () => {
    if (!createdOrder) return;
    const text = encodeURIComponent(`Purchase Invoice ${createdOrder.orderNumber}\nCustomer: ${createdOrder.customerName}\nAmount: ₹${createdOrder.finalAmount.toLocaleString()}`);
    const phone = (createdOrder.customerPhone || '').replace(/\D/g, '');
    const waUrl = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(waUrl, '_blank');
  };

  const handleNewOrder = () => {
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
    setModeOfPayment('');
    setDestination('');
    setVehicleNo('');
    setCheckNumber('');
    setCheckPhotoName('');
    setEditingOrderId(null);
    setOrderSubmitted(false);
    setCreatedOrder(null);
  };

  const handleEditOrder = (order: Order) => {
    if (order.orderStatus !== 'pending') {
      alert('Only pending orders can be edited');
      return;
    }
    setEditingOrderId(order.id);
    setActiveTab('create');
    setCustomerName(order.customerName);
    setCustomerPhone(order.customerPhone || '');
    setCustomerEmail(order.customerEmail || '');
    setCustomerAddress(order.customerAddress || '');
    setCustomerGSTIN(order.customerGSTIN || '');
    setDiscount(order.discount || 0);
    setCgstRate(order.cgstRate || 2.5);
    setSgstRate(order.sgstRate || 2.5);
    setPaymentMethod(order.paymentMethod as typeof paymentMethod);
    setAmountPaid(order.amountPaid || 0);
    setModeOfPayment(order.modeOfPayment || '');
    setDestination(order.destination || '');
    setVehicleNo(order.vehicleNo || '');
    setCart(order.items.map((i) => ({ ...i })));
  };

  const handleDeleteOrder = async (order: Order) => {
    if (!window.confirm(`Delete ${order.orderNumber}?`)) return;
    try {
      await ordersApi.delete(order.id);
      await fetchOrders();
    } catch (error: any) {
      alert(error.message || 'Failed to delete order');
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge" style={{ background: '#fff3cd', color: '#856404' }}>Pending</span>;
      case 'approved':
        return <span className="status-badge" style={{ background: '#d4edda', color: '#155724' }}>Approved</span>;
      case 'rejected':
        return <span className="status-badge" style={{ background: '#f8d7da', color: '#721c24' }}>Rejected</span>;
      case 'converted':
        return <span className="status-badge" style={{ background: '#cce5ff', color: '#004085' }}>Converted to Invoice</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  // Show order submitted for approval
  if (orderSubmitted && createdOrder) {
    const isPending = createdOrder.orderStatus === 'pending';
    const isConverted = createdOrder.orderStatus === 'converted';
    const isRejected = createdOrder.orderStatus === 'rejected';

    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Purchase Invoice {isPending ? 'Submitted for Approval' : isConverted ? 'Approved & Converted' : 'Rejected'}</h1>
            <p>Order #{createdOrder.orderNumber}</p>
            {isPending && (
              <div className="status-badge pending" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#fff3cd', color: '#856404', borderRadius: '4px', fontSize: '14px' }}>
                <Clock size={16} />
                Waiting for Admin Approval
              </div>
            )}
            {isRejected && createdOrder.rejectionReason && (
              <div className="status-badge rejected" style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
                Rejection Reason: {createdOrder.rejectionReason}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {(isPending || isConverted) && (
              <button className="btn btn-primary" onClick={handlePrint}>
                <Printer size={18} />
                Print Invoice
              </button>
            )}
            {(isPending || isConverted) && (
              <>
                <button className="btn btn-secondary" onClick={handleDownloadPDF}>
                  <Download size={18} />
                  Download PDF
                </button>
                <button className="btn btn-success" onClick={handleShareWhatsApp} style={{ background: '#25D366', borderColor: '#25D366' }}>
                  <Share2 size={18} />
                  WhatsApp
                </button>
              </>
            )}
            <button className="btn btn-success" onClick={handleNewOrder}>
              <Plus size={18} />
              New Order
            </button>
          </div>
        </div>

        <PurchaseInvoice ref={invoiceRef} order={createdOrder} />
      </div>
    );
  }

  // Show order detail view
  if (showOrderDetail && selectedOrder) {
    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Order Details</h1>
            <p>Order #{selectedOrder.orderNumber}</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} />
              Print Invoice
            </button>
            <button className="btn btn-secondary" onClick={handleDownloadPDF}>
              <Download size={18} />
              Download PDF
            </button>
            <button className="btn btn-secondary" onClick={() => { setShowOrderDetail(false); setSelectedOrder(null); }}>
              Back to List
            </button>
          </div>
        </div>

        <PurchaseInvoice ref={invoiceRef} order={selectedOrder} />
      </div>
    );
  }

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>My Orders</h1>
          <p>Create purchase invoices and track orders</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" style={{ display: 'flex', gap: '0', marginBottom: '20px', borderBottom: '2px solid #e5e7eb' }}>
        <button
          className={`tab-btn ${activeTab === 'create' ? 'active' : ''}`}
          onClick={() => setActiveTab('create')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'create' ? '#4f46e5' : 'transparent',
            color: activeTab === 'create' ? '#fff' : '#6b7280',
            fontWeight: '600',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s'
          }}
        >
          <Plus size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          Create Order
        </button>
        <button
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
          style={{
            padding: '12px 24px',
            border: 'none',
            background: activeTab === 'list' ? '#4f46e5' : 'transparent',
            color: activeTab === 'list' ? '#fff' : '#6b7280',
            fontWeight: '600',
            cursor: 'pointer',
            borderRadius: '8px 8px 0 0',
            transition: 'all 0.2s'
          }}
        >
          <ShoppingBag size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          My Orders ({orders.length})
        </button>
      </div>

      {/* Orders List Tab */}
      {activeTab === 'list' && (
        <div className="card">
          <div className="table-container">
            {isLoading ? (
              <div className="loading">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={48} className="empty-state-icon" />
                <p>No orders yet. Create your first order!</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td><strong>{order.orderNumber}</strong></td>
                      <td>
                        <div>{order.customerName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{order.customerPhone}</div>
                      </td>
                      <td>₹{order.finalAmount.toLocaleString()}</td>
                      <td>{getStatusBadge(order.orderStatus)}</td>
                      <td>{format(new Date(order.orderDate), 'dd MMM yyyy')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => { setSelectedOrder(order); setCreatedOrder(order); setShowOrderDetail(true); }}
                          >
                            <Eye size={14} />
                            View
                          </button>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => handleEditOrder(order)}
                            disabled={order.orderStatus !== 'pending'}
                            title={order.orderStatus !== 'pending' ? 'Only pending order can be edited' : 'Edit'}
                          >
                            <Edit2 size={14} />
                            Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDeleteOrder(order)}
                            disabled={order.orderStatus !== 'pending'}
                            title={order.orderStatus !== 'pending' ? 'Only pending order can be deleted' : 'Delete'}
                          >
                            <Trash2 size={14} />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Create Order Tab */}
      {activeTab === 'create' && (
        <div className="bill-container">
          <div className="bill-products">
            <div className="search-bar" style={{ margin: 0, marginBottom: '16px' }}>
              <Search size={20} />
              <input
                type="text"
                placeholder="Search all products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
            </div>

            <div className="product-list">
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => {
                  const cartItem = cart.find(item => item.productId === product.id);

                  return (
                    <div className="product-list-item" key={product.id}>
                      <div className="product-list-info">
                        <Package size={24} className="product-list-icon" />
                        <div>
                          <div className="product-list-name">{product.name}</div>
                          <div className="product-list-meta">
                            {product.sku} • ₹{product.price} per {product.unit}
                          </div>
                        </div>
                      </div>
                      <div className="product-list-actions">
                        {cartItem ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div className="quantity-input">
                              <button
                                className="qty-btn"
                                onClick={() => updateCartItemQty(product.id, cartItem.quantity - 1)}
                              >
                                <Minus size={16} />
                              </button>
                              <input
                                type="number"
                                value={cartItem.quantity}
                                onChange={(e) => updateCartItemQty(product.id, parseInt(e.target.value) || 0)}
                              />
                              <button
                                className="qty-btn"
                                onClick={() => updateCartItemQty(product.id, cartItem.quantity + 1)}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                            <select
                              value={cartItem.availability}
                              onChange={(e) => updateCartItemAvailability(product.id, e.target.value as 'available' | 'not_available')}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db',
                                fontSize: '12px',
                                background: cartItem.availability === 'available' ? '#d4edda' : '#f8d7da',
                                color: cartItem.availability === 'available' ? '#155724' : '#721c24'
                              }}
                            >
                              <option value="available">Available</option>
                              <option value="not_available">Not Available</option>
                            </select>
                          </div>
                        ) : (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => addToCart(product.id)}
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
                  <p>No products found.</p>
                </div>
              )}
            </div>
          </div>

          <div className="bill-summary">
            <h3>Order Summary</h3>

            <div className="customer-form">
              {/* Salesman Info */}
              <div style={{ padding: '10px 12px', background: '#e3f2fd', borderRadius: '6px', marginBottom: '12px' }}>
                <div style={{ fontSize: '12px', color: '#1565c0' }}>Created By</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: '#0d47a1' }}>{currentUser?.name || 'Unknown'}</div>
              </div>

              {orderLocation && (
                <div style={{ padding: '10px 12px', background: '#e8f5e9', borderRadius: '6px', marginBottom: '12px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                  <MapPin size={16} style={{ color: '#2e7d32', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <div style={{ fontSize: '12px', color: '#2e7d32' }}>Invoice Location</div>
                    {orderCoords ? (
                      <a
                        href={`https://www.google.com/maps?q=${orderCoords.lat},${orderCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '12px', color: '#1565c0', textDecoration: 'underline', wordBreak: 'break-word' }}
                      >
                        {orderLocation}
                      </a>
                    ) : (
                      <div style={{ fontSize: '12px', color: '#333' }}>{orderLocation}</div>
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
                      <div className="cart-item-name">
                        {item.productName}
                        {item.availability === 'not_available' && (
                          <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '10px' }}>
                            Not Available
                          </span>
                        )}
                      </div>
                      <div className="cart-item-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '6px', marginTop: '6px' }}>
                        <input type="number" className="form-input" value={item.price} min="0" step="0.01" onChange={(e) => updateCartItem(item.productId, { price: parseFloat(e.target.value) || 0 })} placeholder="Rate" />
                        <input type="text" className="form-input" value={item.batchNo || ''} onChange={(e) => updateCartItem(item.productId, { batchNo: e.target.value })} placeholder="Batch No" />
                        <input type="date" className="form-input" value={item.mfgDate || ''} onChange={(e) => updateCartItem(item.productId, { mfgDate: e.target.value })} placeholder="MFG Date" />
                        <input type="date" className="form-input" value={item.expDate || ''} onChange={(e) => updateCartItem(item.productId, { expDate: e.target.value })} placeholder="EXP Date" />
                      </div>
                    </div>
                    <span className="cart-item-total">₹{(item.quantity * item.price).toFixed(2)}</span>
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
                <option value="check">Check</option>
              </select>
            </div>
            {paymentMethod === 'check' && (
              <div style={{ marginTop: '8px', padding: '10px', borderRadius: '8px', background: '#fff7ed', border: '1px solid #fed7aa' }}>
                <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Check Number</label>
                    <input className="form-input" value={checkNumber} onChange={(e) => setCheckNumber(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Check Photo (Compulsory)</label>
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => setCheckPhotoName(e.target.files?.[0]?.name || '')} />
                    {checkPhotoName && <div style={{ fontSize: 12, marginTop: 4 }}>{checkPhotoName}</div>}
                  </div>
                </div>
              </div>
            )}

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

              {/* Balance Due / Fully Paid */}
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: amountPaid >= finalAmount ? '#e8f5e9' : '#ffebee', borderRadius: '4px', marginTop: '8px' }}>
                <span style={{ fontSize: '13px', color: amountPaid >= finalAmount ? '#2e7d32' : '#c62828' }}>
                  {amountPaid >= finalAmount ? 'Fully Paid' : 'Balance Due (Outstanding)'}
                </span>
                <span style={{ fontSize: '14px', fontWeight: '600', color: amountPaid >= finalAmount ? '#2e7d32' : '#c62828' }}>
                  ₹{Math.max(0, finalAmount - amountPaid).toLocaleString()}
                </span>
              </div>

              {/* Advance Amount if paid more than total */}
              {amountPaid > finalAmount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px', background: '#e3f2fd', borderRadius: '4px', marginTop: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#1565c0' }}>Advance Amount</span>
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1565c0' }}>
                    ₹{(amountPaid - finalAmount).toLocaleString()}
                  </span>
                </div>
              )}

              {/* Payment Summary */}
              <div style={{ marginTop: '12px', padding: '10px', background: '#f5f5f5', borderRadius: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>Total Amount:</span>
                  <span style={{ fontSize: '13px', fontWeight: '600' }}>₹{finalAmount.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '12px', color: '#666' }}>Amount Paid:</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#2e7d32' }}>₹{amountPaid.toLocaleString()}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #ddd', paddingTop: '4px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: amountPaid >= finalAmount ? '#1565c0' : '#c62828' }}>
                    {amountPaid >= finalAmount ? 'Advance:' : 'Outstanding:'}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: '700', color: amountPaid >= finalAmount ? '#1565c0' : '#c62828' }}>
                    ₹{Math.abs(finalAmount - amountPaid).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <button
              className="btn btn-success btn-block btn-lg"
              onClick={handleCreateOrder}
              disabled={cart.length === 0 || !customerName.trim() || !customerPhone.trim() || !customerGSTIN.trim() || !modeOfPayment.trim() || !destination.trim() || !vehicleNo.trim() || (paymentMethod === 'check' && !checkPhotoName)}
            >
              <Send size={20} />
              {editingOrderId ? 'Update Purchase Invoice' : 'Generate Purchase Invoice'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
