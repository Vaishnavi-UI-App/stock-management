import { useState, useEffect, useRef } from 'react';
import { ShoppingBag, Eye, CheckCircle, XCircle, Printer, Clock, Filter, Search } from 'lucide-react';
import { ordersApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import type { Order } from '../../types';
import { PurchaseInvoice } from '../../components/PurchaseInvoice';
// TaxInvoice available if needed

import { format } from 'date-fns';
import '../sales/Sales.css';

export function Orders() {
  const { getUserById, getBranchById, currentUser } = useStore();
  const isBranchManager = currentUser?.role === 'branch_manager';
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [orderToReject, setOrderToReject] = useState<Order | null>(null);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const filters: { branchId?: string } = {};
      if (isBranchManager && currentUser?.branchId) {
        filters.branchId = currentUser.branchId;
      }
      const data = await ordersApi.getAll(filters);
      setOrders(data);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (order: Order) => {
    if (!confirm(`Are you sure you want to approve order #${order.orderNumber}? This will convert it to a Tax Invoice.`)) {
      return;
    }

    try {
      await ordersApi.approveOrder(order.id);
      alert('Order approved and converted to Tax Invoice successfully!');
      fetchOrders();
      if (selectedOrder?.id === order.id) {
        setSelectedOrder(null);
        setViewMode('list');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to approve order');
    }
  };

  const handleReject = async () => {
    if (!orderToReject) return;

    try {
      await ordersApi.rejectOrder(orderToReject.id, rejectReason || 'No reason provided');
      alert('Order rejected successfully!');
      setShowRejectModal(false);
      setRejectReason('');
      setOrderToReject(null);
      fetchOrders();
      if (selectedOrder?.id === orderToReject.id) {
        setSelectedOrder(null);
        setViewMode('list');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to reject order');
    }
  };

  const openRejectModal = (order: Order) => {
    setOrderToReject(order);
    setShowRejectModal(true);
  };

  const handlePrint = () => {
    window.print();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-badge" style={{ background: '#fff3cd', color: '#856404', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Pending</span>;
      case 'approved':
        return <span className="status-badge" style={{ background: '#d4edda', color: '#155724', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Approved</span>;
      case 'rejected':
        return <span className="status-badge" style={{ background: '#f8d7da', color: '#721c24', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Rejected</span>;
      case 'converted':
        return <span className="status-badge" style={{ background: '#cce5ff', color: '#004085', padding: '4px 8px', borderRadius: '4px', fontSize: '12px' }}>Converted</span>;
      default:
        return <span className="status-badge">{status}</span>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesStatus = filterStatus === 'all' || order.orderStatus === filterStatus;
    const matchesSearch = searchTerm === '' ||
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm);
    return matchesStatus && matchesSearch;
  });

  const pendingCount = orders.filter(o => o.orderStatus === 'pending').length;

  // Detail view
  if (viewMode === 'detail' && selectedOrder) {
    const salesman = getUserById(selectedOrder.salesmanId);
    const branch = getBranchById(selectedOrder.branchId);

    return (
      <div className="sales-page">
        <div className="page-header no-print">
          <div>
            <h1>Order Details</h1>
            <p>Order #{selectedOrder.orderNumber}</p>
            <div style={{ marginTop: '8px' }}>
              {getStatusBadge(selectedOrder.orderStatus)}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={handlePrint}>
              <Printer size={18} />
              Print
            </button>
            {selectedOrder.orderStatus === 'pending' && (
              <>
                <button className="btn btn-success" onClick={() => handleApprove(selectedOrder)}>
                  <CheckCircle size={18} />
                  Approve
                </button>
                <button className="btn btn-danger" onClick={() => openRejectModal(selectedOrder)}>
                  <XCircle size={18} />
                  Reject
                </button>
              </>
            )}
            <button className="btn btn-secondary" onClick={() => { setViewMode('list'); setSelectedOrder(null); }}>
              Back to List
            </button>
          </div>
        </div>

        {/* Order Info Summary */}
        <div className="no-print" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '20px' }}>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Salesman</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{salesman?.name || 'N/A'}</div>
          </div>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Branch</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{branch?.name || 'N/A'}</div>
          </div>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Customer</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>{selectedOrder.customerName}</div>
          </div>
          <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: '#6c757d' }}>Amount</div>
            <div style={{ fontSize: '14px', fontWeight: '600' }}>₹{selectedOrder.finalAmount.toLocaleString()}</div>
          </div>
        </div>

        {/* Items with availability status */}
        <div className="no-print" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '12px' }}>Order Items</h3>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Price</th>
                  <th>Total</th>
                  <th>Availability</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder.items.map((item, index) => (
                  <tr key={index} style={item.availability === 'not_available' ? { background: '#fff3cd' } : undefined}>
                    <td>{index + 1}</td>
                    <td>{item.productName}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>₹{item.price}</td>
                    <td>₹{item.total.toLocaleString()}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        background: item.availability === 'available' ? '#d4edda' : '#f8d7da',
                        color: item.availability === 'available' ? '#155724' : '#721c24'
                      }}>
                        {item.availability === 'available' ? 'Available' : 'Not Available'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Rejection reason if rejected */}
        {selectedOrder.orderStatus === 'rejected' && selectedOrder.rejectionReason && (
          <div className="no-print" style={{ padding: '16px', background: '#f8d7da', borderRadius: '8px', marginBottom: '20px' }}>
            <strong>Rejection Reason:</strong> {selectedOrder.rejectionReason}
          </div>
        )}

        {/* Purchase Invoice */}
        <PurchaseInvoice ref={invoiceRef} order={selectedOrder} />
      </div>
    );
  }

  // List view
  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>Orders Management</h1>
          <p>Review and approve purchase invoices from salesmen</p>
        </div>
        {pendingCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fff3cd', borderRadius: '8px' }}>
            <Clock size={20} style={{ color: '#856404' }} />
            <span style={{ fontWeight: '600', color: '#856404' }}>{pendingCount} Pending Approval</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="search-bar" style={{ flex: '1', margin: 0, minWidth: '250px' }}>
            <Search size={20} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} />
            <select
              className="form-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{ minWidth: '150px' }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="converted">Converted</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="card">
        <div className="table-container">
          {isLoading ? (
            <div className="loading" style={{ padding: '40px', textAlign: 'center' }}>Loading orders...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px', textAlign: 'center' }}>
              <ShoppingBag size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
              <p style={{ color: '#6b7280' }}>No orders found</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Salesman</th>
                  <th>Branch</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const salesman = getUserById(order.salesmanId);
                  const branch = getBranchById(order.branchId);
                  const unavailableItems = order.items.filter(i => i.availability === 'not_available').length;

                  return (
                    <tr key={order.id}>
                      <td><strong>{order.orderNumber}</strong></td>
                      <td>
                        <div>{order.customerName}</div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{order.customerPhone}</div>
                      </td>
                      <td>{salesman?.name || 'N/A'}</td>
                      <td>{branch?.name || 'N/A'}</td>
                      <td>
                        <span>{order.items.length} items</span>
                        {unavailableItems > 0 && (
                          <span style={{ marginLeft: '8px', padding: '2px 6px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '10px' }}>
                            {unavailableItems} N/A
                          </span>
                        )}
                      </td>
                      <td>₹{order.finalAmount.toLocaleString()}</td>
                      <td>{getStatusBadge(order.orderStatus)}</td>
                      <td>{format(new Date(order.orderDate), 'dd MMM yyyy')}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => { setSelectedOrder(order); setViewMode('detail'); }}
                          >
                            <Eye size={14} />
                          </button>
                          {order.orderStatus === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm btn-success"
                                onClick={() => handleApprove(order)}
                                title="Approve"
                              >
                                <CheckCircle size={14} />
                              </button>
                              <button
                                className="btn btn-sm btn-danger"
                                onClick={() => openRejectModal(order)}
                                title="Reject"
                              >
                                <XCircle size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectModal && orderToReject && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="modal" style={{
            background: '#fff',
            padding: '24px',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginBottom: '16px' }}>Reject Order #{orderToReject.orderNumber}</h3>
            <div className="form-group">
              <label className="form-label">Rejection Reason</label>
              <textarea
                className="form-input"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={4}
              />
            </div>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button className="btn btn-secondary" onClick={() => { setShowRejectModal(false); setRejectReason(''); setOrderToReject(null); }}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleReject}>
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
