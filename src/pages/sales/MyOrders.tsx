import { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Minus, Trash2, Printer, Clock, Send, ShoppingBag, Eye, MapPin, Edit2, Download, Share2, Filter } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store/useStore';
import { ordersApi } from '../../services/api';
import type { OrderItem, Order } from '../../types';
import { PurchaseInvoice } from '../../components/PurchaseInvoice';
import { format } from 'date-fns';
import './Sales.css';

export function MyOrders() {
  const {
    currentUser,
    products,
    getProductById
  } = useStore();

  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [orderFilterStatus, setOrderFilterStatus] = useState<string>('all');
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [orderFromDate, setOrderFromDate] = useState('');
  const [orderToDate, setOrderToDate] = useState('');

  // Create order form state
  const [searchTerm, setSearchTerm] = useState('');
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  const [orderLocation, setOrderLocation] = useState('');
  const [orderCoords, setOrderCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [orderSubmitted, setOrderSubmitted] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderDetail, setShowOrderDetail] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  // branchId is required by the schema; when the current user has none (e.g. an
  // admin placing an order), the server picks a fallback branch on create.
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
  const finalAmount = subtotal;

  const handleCreateOrder = async () => {
    if (!customerName.trim()) {
      alert('Please enter customer name');
      return;
    }

    if (!customerPhone.trim()) {
      alert('Please enter customer phone number');
      return;
    }

    if (cart.length === 0) {
      alert('Please add items to cart');
      return;
    }

    try {
      const payload = {
        salesmanId: currentUser?.id || '',
        branchId: branchId || undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        customerEmail: customerEmail.trim(),
        items: cart,
        totalAmount: subtotal,
        finalAmount,
        // Not collected in this simplified order-request form — required by
        // the schema but not meaningful until the order is approved/billed.
        paymentMethod: 'cash',
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

  const filteredOrders = orders.filter((order) => {
    const matchesStatus = orderFilterStatus === 'all' || order.orderStatus === orderFilterStatus;
    const matchesSearch = orderSearchTerm === '' ||
      order.orderNumber.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      order.customerPhone?.includes(orderSearchTerm);
    const orderDate = new Date(order.orderDate);
    const matchesFrom = !orderFromDate || orderDate >= new Date(orderFromDate);
    const matchesTo = !orderToDate || orderDate <= new Date(`${orderToDate}T23:59:59`);
    return matchesStatus && matchesSearch && matchesFrom && matchesTo;
  });

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
            <button className="btn btn-success" onClick={handleShareWhatsApp} style={{ background: '#25D366', borderColor: '#25D366' }}>
              <Share2 size={18} />
              Share
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
          {orders.length > 0 && (
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '16px' }}>
              <div className="search-bar" style={{ flex: '1', margin: 0, minWidth: '220px' }}>
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search my orders..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="form-input"
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={18} />
                <select
                  className="form-select"
                  value={orderFilterStatus}
                  onChange={(e) => setOrderFilterStatus(e.target.value)}
                  style={{ minWidth: '150px' }}
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="converted">Converted</option>
                </select>
              </div>
              <input
                type="date"
                className="form-input"
                value={orderFromDate}
                onChange={(e) => setOrderFromDate(e.target.value)}
                style={{ maxWidth: '160px' }}
                title="From date"
              />
              <input
                type="date"
                className="form-input"
                value={orderToDate}
                onChange={(e) => setOrderToDate(e.target.value)}
                style={{ maxWidth: '160px' }}
                title="To date"
              />
            </div>
          )}
          <div className="table-container">
            {isLoading ? (
              <div className="loading">Loading orders...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={48} className="empty-state-icon" />
                <p>No orders yet. Create your first order!</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={48} className="empty-state-icon" />
                <p>No orders match your filters.</p>
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
                  {filteredOrders.map((order) => (
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
                            <input
                              type="text"
                              value={cartItem.unit || ''}
                              onChange={(e) => updateCartItem(product.id, { unit: e.target.value })}
                              placeholder="Unit"
                              style={{
                                width: '80px',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid #d1d5db',
                                fontSize: '12px',
                              }}
                            />
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
            </div>

            <div className="cart-items">
              {cart.length > 0 ? (
                cart.map((item) => (
                  <div className="cart-item" key={item.productId}>
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.productName}</div>
                      <div className="cart-item-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(120px, 1fr))', gap: '6px', marginTop: '6px' }}>
                        <input type="number" className="form-input" value={item.quantity} min="1" onChange={(e) => updateCartItemQty(item.productId, parseInt(e.target.value) || 0)} placeholder="Quantity" />
                        <input type="text" className="form-input" value={item.unit || ''} onChange={(e) => updateCartItem(item.productId, { unit: e.target.value })} placeholder="Unit" />
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
              <div className="bill-row total">
                <label>Total:</label>
                <span>₹{finalAmount.toLocaleString()}</span>
              </div>
            </div>

            <button
              className="btn btn-success btn-block btn-lg"
              onClick={handleCreateOrder}
              disabled={cart.length === 0 || !customerName.trim() || !customerPhone.trim()}
            >
              <Send size={20} />
              {editingOrderId ? 'Update Order' : 'Send Order for Verification'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
