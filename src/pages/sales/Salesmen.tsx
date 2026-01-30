import { useState } from 'react';
import { User, Phone, Mail, Eye, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { format } from 'date-fns';
import './Sales.css';

export function Salesmen() {
  const { currentUser, users, sales, salesmanStock, getProductById, getBranchById } = useStore();
  const [selectedSalesman, setSelectedSalesman] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const branchId = currentUser?.branchId || '';
  const branch = getBranchById(branchId);

  // Get salesmen for this branch
  const branchSalesmen = users.filter(u => u.role === 'salesman' && u.branchId === branchId);

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  // Get salesman stats
  const getSalesmanStats = (salesmanId: string) => {
    const salesmanSales = sales.filter(s => {
      const saleDate = new Date(s.saleDate);
      return s.salesmanId === salesmanId &&
             saleDate.getMonth() === selectedMonth &&
             saleDate.getFullYear() === selectedYear;
    });

    const totalSales = salesmanSales.length;
    const totalAmount = salesmanSales.reduce((sum, s) => sum + s.finalAmount, 0);
    const stock = salesmanStock.filter(ss => ss.salesmanId === salesmanId);
    const stockCount = stock.reduce((sum, ss) => sum + ss.quantity, 0);

    return { totalSales, totalAmount, stockCount, stock };
  };

  const selectedSalesmanData = selectedSalesman ? users.find(u => u.id === selectedSalesman) : null;
  const selectedStats = selectedSalesman ? getSalesmanStats(selectedSalesman) : null;
  const selectedSalesmanSales = selectedSalesman ? sales.filter(s => {
    const saleDate = new Date(s.saleDate);
    return s.salesmanId === selectedSalesman &&
           saleDate.getMonth() === selectedMonth &&
           saleDate.getFullYear() === selectedYear;
  }) : [];

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>Salesmen</h1>
          <p>{branch?.name}</p>
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

      {/* Salesmen Grid */}
      <div className="grid grid-cols-3">
        {branchSalesmen.map((salesman) => {
          const stats = getSalesmanStats(salesman.id);

          return (
            <div className="entity-card" key={salesman.id} style={{ flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                <div className="entity-avatar">
                  {salesman.name.charAt(0).toUpperCase()}
                </div>
                <div className="entity-info">
                  <div className="entity-name">{salesman.name}</div>
                  <div className="entity-detail" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={14} />
                    {salesman.email}
                  </div>
                  <div className="entity-detail" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} />
                    {salesman.phone}
                  </div>
                </div>
              </div>

              <div className="sales-stats" style={{ marginBottom: '16px' }}>
                <div className="sales-stat">
                  <div className="sales-stat-value">{stats.totalSales}</div>
                  <div className="sales-stat-label">Sales</div>
                </div>
                <div className="sales-stat">
                  <div className="sales-stat-value">₹{stats.totalAmount.toLocaleString()}</div>
                  <div className="sales-stat-label">Revenue</div>
                </div>
                <div className="sales-stat">
                  <div className="sales-stat-value">{stats.stockCount}</div>
                  <div className="sales-stat-label">Stock</div>
                </div>
              </div>

              <button
                className="btn btn-primary btn-block"
                onClick={() => setSelectedSalesman(salesman.id)}
              >
                <Eye size={16} />
                View Details
              </button>
            </div>
          );
        })}
      </div>

      {branchSalesmen.length === 0 && (
        <div className="card">
          <div className="empty-state">
            <User size={64} className="empty-state-icon" />
            <h3 className="empty-state-title">No Salesmen</h3>
            <p className="empty-state-text">
              No salesmen assigned to this branch yet
            </p>
          </div>
        </div>
      )}

      {/* Salesman Details Modal */}
      {selectedSalesmanData && selectedStats && (
        <div className="modal-overlay" onClick={() => setSelectedSalesman(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px' }}>
            <div className="modal-header">
              <h3 className="modal-title">{selectedSalesmanData.name}</h3>
              <button className="modal-close" onClick={() => setSelectedSalesman(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              {/* Stats */}
              <div className="sales-stats mb-4">
                <div className="sales-stat">
                  <div className="sales-stat-value">{selectedStats.totalSales}</div>
                  <div className="sales-stat-label">Total Sales</div>
                </div>
                <div className="sales-stat">
                  <div className="sales-stat-value">₹{selectedStats.totalAmount.toLocaleString()}</div>
                  <div className="sales-stat-label">Total Revenue</div>
                </div>
                <div className="sales-stat">
                  <div className="sales-stat-value">{selectedStats.stockCount}</div>
                  <div className="sales-stat-label">Items with Salesman</div>
                </div>
              </div>

              {/* Current Stock */}
              <h4 className="mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>Current Stock</h4>
              {selectedStats.stock.length > 0 ? (
                <div className="my-stock-grid mb-4">
                  {selectedStats.stock.map((ss) => {
                    const product = getProductById(ss.productId);
                    return (
                      <div className="my-stock-item" key={ss.id}>
                        <div className="my-stock-info">
                          <span className="my-stock-name">{product?.name}</span>
                          <span className="my-stock-price">₹{product?.price}</span>
                        </div>
                        <div className="my-stock-qty">{ss.quantity}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-500 mb-4">No products with this salesman</p>
              )}

              {/* Recent Sales */}
              <h4 className="mb-2" style={{ fontSize: '14px', fontWeight: '600' }}>
                Sales in {months[selectedMonth]} {selectedYear}
              </h4>
              {selectedSalesmanSales.length > 0 ? (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bill No</th>
                        <th>Customer</th>
                        <th>Date</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSalesmanSales.slice(0, 10).map((sale) => (
                        <tr key={sale.id}>
                          <td>
                            <span className="badge badge-primary">{sale.billNumber}</span>
                          </td>
                          <td>{sale.customerName}</td>
                          <td>{format(new Date(sale.saleDate), 'dd MMM')}</td>
                          <td>₹{sale.finalAmount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No sales this month</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
