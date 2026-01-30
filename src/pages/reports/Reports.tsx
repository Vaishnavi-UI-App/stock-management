import { useState } from 'react';
import { BarChart3, TrendingUp, Package, Users, Building2, IndianRupee } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Reports.css';

export function Reports() {
  const {
    currentUser,
    sales,
    branches,
    getProductById,
    getBranchById,
    getUserById
  } = useStore();

  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const isStockManager = currentUser?.role === 'stock_manager';
  const isBranchManager = currentUser?.role === 'branch_manager';
  const isSalesman = currentUser?.role === 'salesman';

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const years = [2024, 2025, 2026];

  // Filter sales based on role and filters
  const getFilteredSales = () => {
    return sales.filter(sale => {
      const saleDate = new Date(sale.saleDate);
      const matchesMonth = saleDate.getMonth() === selectedMonth && saleDate.getFullYear() === selectedYear;

      if (isSalesman) {
        return matchesMonth && sale.salesmanId === currentUser?.id;
      }

      if (isBranchManager) {
        return matchesMonth && sale.branchId === currentUser?.branchId;
      }

      // Stock manager
      const matchesBranch = selectedBranch ? sale.branchId === selectedBranch : true;
      return matchesMonth && matchesBranch;
    });
  };

  const filteredSales = getFilteredSales();

  // Calculate overall stats
  const totalSales = filteredSales.length;
  const totalRevenue = filteredSales.reduce((sum, s) => sum + s.finalAmount, 0);
  const totalDiscount = filteredSales.reduce((sum, s) => sum + s.discount, 0);
  const avgSaleValue = totalSales > 0 ? totalRevenue / totalSales : 0;

  // Product-wise sales
  const productSales: Record<string, { name: string; qty: number; amount: number; category: string }> = {};
  filteredSales.forEach(sale => {
    sale.items.forEach(item => {
      const product = getProductById(item.productId);
      if (productSales[item.productId]) {
        productSales[item.productId].qty += item.quantity;
        productSales[item.productId].amount += item.total;
      } else {
        productSales[item.productId] = {
          name: item.productName,
          qty: item.quantity,
          amount: item.total,
          category: product?.category || 'Other'
        };
      }
    });
  });

  const topProducts = Object.values(productSales)
    .sort((a, b) => b.amount - a.amount);

  // Category-wise sales
  const categorySales: Record<string, { qty: number; amount: number }> = {};
  Object.values(productSales).forEach(product => {
    if (categorySales[product.category]) {
      categorySales[product.category].qty += product.qty;
      categorySales[product.category].amount += product.amount;
    } else {
      categorySales[product.category] = { qty: product.qty, amount: product.amount };
    }
  });

  // Branch-wise sales (for stock manager)
  const branchSales: Record<string, { name: string; count: number; amount: number }> = {};
  if (isStockManager && !selectedBranch) {
    filteredSales.forEach(sale => {
      const branch = getBranchById(sale.branchId);
      if (branchSales[sale.branchId]) {
        branchSales[sale.branchId].count += 1;
        branchSales[sale.branchId].amount += sale.finalAmount;
      } else {
        branchSales[sale.branchId] = {
          name: branch?.name || 'Unknown',
          count: 1,
          amount: sale.finalAmount
        };
      }
    });
  }

  // Salesman-wise sales (for branch manager)
  const salesmanSales: Record<string, { name: string; count: number; amount: number }> = {};
  if (isBranchManager) {
    filteredSales.forEach(sale => {
      const salesman = getUserById(sale.salesmanId);
      if (salesmanSales[sale.salesmanId]) {
        salesmanSales[sale.salesmanId].count += 1;
        salesmanSales[sale.salesmanId].amount += sale.finalAmount;
      } else {
        salesmanSales[sale.salesmanId] = {
          name: salesman?.name || 'Unknown',
          count: 1,
          amount: sale.finalAmount
        };
      }
    });
  }

  // Payment method breakdown
  const paymentBreakdown: Record<string, { count: number; amount: number }> = {
    cash: { count: 0, amount: 0 },
    card: { count: 0, amount: 0 },
    upi: { count: 0, amount: 0 },
    credit: { count: 0, amount: 0 }
  };
  filteredSales.forEach(sale => {
    paymentBreakdown[sale.paymentMethod].count += 1;
    paymentBreakdown[sale.paymentMethod].amount += sale.finalAmount;
  });

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Sales analytics and insights</p>
        </div>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        {isStockManager && (
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

      {/* Main Stats */}
      <div className="stats-grid mb-4" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <BarChart3 size={24} />
          </div>
          <div className="stat-card-value">{totalSales}</div>
          <div className="stat-card-label">Total Sales</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <IndianRupee size={24} />
          </div>
          <div className="stat-card-value">₹{totalRevenue.toLocaleString()}</div>
          <div className="stat-card-label">Total Revenue</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
            <TrendingUp size={24} />
          </div>
          <div className="stat-card-value">₹{Math.round(avgSaleValue).toLocaleString()}</div>
          <div className="stat-card-label">Avg. Sale Value</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
            <IndianRupee size={24} />
          </div>
          <div className="stat-card-value">₹{totalDiscount.toLocaleString()}</div>
          <div className="stat-card-label">Total Discount</div>
        </div>
      </div>

      <div className="reports-grid">
        {/* Top Products */}
        <div className="card">
          <h3 className="card-title">
            <Package size={20} />
            Top Selling Products
          </h3>
          {topProducts.length > 0 ? (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Qty Sold</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.slice(0, 10).map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td>
                        <span className="badge badge-primary">{product.category}</span>
                      </td>
                      <td>{product.qty}</td>
                      <td>₹{product.amount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-gray-500">No sales data for this period</p>
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="card">
          <h3 className="card-title">
            <BarChart3 size={20} />
            Category-wise Sales
          </h3>
          {Object.keys(categorySales).length > 0 ? (
            <div className="category-bars">
              {Object.entries(categorySales)
                .sort((a, b) => b[1].amount - a[1].amount)
                .map(([category, data]) => {
                  const maxAmount = Math.max(...Object.values(categorySales).map(c => c.amount));
                  const percentage = (data.amount / maxAmount) * 100;

                  return (
                    <div className="category-bar-item" key={category}>
                      <div className="category-bar-header">
                        <span className="category-name">{category}</span>
                        <span className="category-amount">₹{data.amount.toLocaleString()}</span>
                      </div>
                      <div className="category-bar-track">
                        <div
                          className="category-bar-fill"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="category-bar-footer">
                        <span>{data.qty} units sold</span>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="empty-state">
              <p className="text-gray-500">No sales data</p>
            </div>
          )}
        </div>

        {/* Branch Performance (Stock Manager only) */}
        {isStockManager && !selectedBranch && (
          <div className="card">
            <h3 className="card-title">
              <Building2 size={20} />
              Branch Performance
            </h3>
            {Object.keys(branchSales).length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Branch</th>
                      <th>Sales</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(branchSales)
                      .sort((a, b) => b[1].amount - a[1].amount)
                      .map(([branchId, data]) => (
                        <tr key={branchId}>
                          <td>{data.name.split(' - ')[0]}</td>
                          <td>{data.count}</td>
                          <td>₹{data.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-gray-500">No sales data</p>
              </div>
            )}
          </div>
        )}

        {/* Salesman Performance (Branch Manager only) */}
        {isBranchManager && (
          <div className="card">
            <h3 className="card-title">
              <Users size={20} />
              Salesman Performance
            </h3>
            {Object.keys(salesmanSales).length > 0 ? (
              <div className="table-container">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Salesman</th>
                      <th>Sales</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(salesmanSales)
                      .sort((a, b) => b[1].amount - a[1].amount)
                      .map(([salesmanId, data]) => (
                        <tr key={salesmanId}>
                          <td>{data.name}</td>
                          <td>{data.count}</td>
                          <td>₹{data.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <p className="text-gray-500">No sales data</p>
              </div>
            )}
          </div>
        )}

        {/* Payment Methods */}
        <div className="card">
          <h3 className="card-title">
            <IndianRupee size={20} />
            Payment Methods
          </h3>
          <div className="payment-grid">
            {Object.entries(paymentBreakdown).map(([method, data]) => (
              <div className="payment-card" key={method}>
                <div className="payment-method">{method.toUpperCase()}</div>
                <div className="payment-count">{data.count} sales</div>
                <div className="payment-amount">₹{data.amount.toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
