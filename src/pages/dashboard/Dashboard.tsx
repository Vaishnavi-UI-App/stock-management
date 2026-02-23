import { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Building2,
  Users,
  ShoppingCart,
  TrendingUp,
  IndianRupee,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  Sun,
  Moon,
  Sunrise
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { paymentsApi } from '../../services/api';
import { format } from 'date-fns';
import { useLanguage } from '../../i18n/useLanguage';
import './Dashboard.css';

function getGreeting(): { text: string; icon: typeof Sun } {
  const hour = new Date().getHours();
  if (hour < 12) return { text: 'Good Morning', icon: Sunrise };
  if (hour < 17) return { text: 'Good Afternoon', icon: Sun };
  return { text: 'Good Evening', icon: Moon };
}

export function Dashboard() {
  const {
    currentUser,
    products,
    branches,
    users,
    companyStock,
    branchStock,
    sales,
    salesmanStock,
    getProductById,
    getBranchById,
    getUserById
  } = useStore();
  const { t } = useLanguage();

  const role = currentUser?.role;
  const greeting = useMemo(() => getGreeting(), []);

  // Payment summary state for admin
  const [paymentSummary, setPaymentSummary] = useState({
    totalOutstanding: 0,
    totalAdvance: 0,
    customersWithOutstanding: 0,
    customersWithAdvance: 0,
    todayCollections: 0
  });

  useEffect(() => {
    if (role === 'stock_manager') {
      paymentsApi.getSummary()
        .then(data => setPaymentSummary(data))
        .catch(err => console.error('Failed to fetch payment summary:', err));
    }
  }, [role]);

  // Calculate stats based on role
  const getStats = () => {
    if (role === 'stock_manager') {
      const totalCompanyStock = companyStock.reduce((sum, cs) => sum + cs.quantity, 0);
      const totalSalesAmount = sales.reduce((sum, s) => sum + s.finalAmount, 0);
      const thisMonthSales = sales.filter(s => {
        const saleDate = new Date(s.saleDate);
        const now = new Date();
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      });
      const thisMonthAmount = thisMonthSales.reduce((sum, s) => sum + s.finalAmount, 0);

      return [
        {
          label: 'Total Products',
          value: products.length,
          icon: Package,
          color: '#2563eb',
          bgColor: 'rgba(37, 99, 235, 0.1)',
        },
        {
          label: 'Company Stock',
          value: totalCompanyStock,
          icon: Package,
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.1)',
        },
        {
          label: 'Total Branches',
          value: branches.length,
          icon: Building2,
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.1)',
        },
        {
          label: 'Total Users',
          value: users.length,
          icon: Users,
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
        },
        {
          label: 'Total Sales',
          value: `₹${totalSalesAmount.toLocaleString()}`,
          icon: IndianRupee,
          color: '#06b6d4',
          bgColor: 'rgba(6, 182, 212, 0.1)',
        },
        {
          label: 'This Month',
          value: `₹${thisMonthAmount.toLocaleString()}`,
          icon: TrendingUp,
          color: '#ec4899',
          bgColor: 'rgba(236, 72, 153, 0.1)',
        },
      ];
    }

    if (role === 'branch_manager') {
      const branchId = currentUser?.branchId;
      const myBranchStock = branchStock.filter(bs => bs.branchId === branchId);
      const totalStock = myBranchStock.reduce((sum, bs) => sum + bs.quantity, 0);
      const branchSalesmen = users.filter(u => u.role === 'salesman' && u.branchId === branchId);
      const branchSalesData = sales.filter(s => s.branchId === branchId);
      const totalSalesAmount = branchSalesData.reduce((sum, s) => sum + s.finalAmount, 0);

      return [
        {
          label: 'Products in Stock',
          value: myBranchStock.filter(bs => bs.quantity > 0).length,
          icon: Package,
          color: '#2563eb',
          bgColor: 'rgba(37, 99, 235, 0.1)',
        },
        {
          label: 'Total Stock Qty',
          value: totalStock,
          icon: Package,
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.1)',
        },
        {
          label: 'Salesmen',
          value: branchSalesmen.length,
          icon: Users,
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.1)',
        },
        {
          label: 'Total Sales',
          value: `₹${totalSalesAmount.toLocaleString()}`,
          icon: IndianRupee,
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
        },
      ];
    }

    if (role === 'salesman') {
      const myStock = salesmanStock.filter(ss => ss.salesmanId === currentUser?.id);
      const totalItems = myStock.reduce((sum, ss) => sum + ss.quantity, 0);
      const mySales = sales.filter(s => s.salesmanId === currentUser?.id);
      const totalSalesAmount = mySales.reduce((sum, s) => sum + s.finalAmount, 0);
      const thisMonthSales = mySales.filter(s => {
        const saleDate = new Date(s.saleDate);
        const now = new Date();
        return saleDate.getMonth() === now.getMonth() && saleDate.getFullYear() === now.getFullYear();
      });
      const thisMonthAmount = thisMonthSales.reduce((sum, s) => sum + s.finalAmount, 0);

      return [
        {
          label: t.productsWithMe,
          value: myStock.length,
          icon: Package,
          color: '#2563eb',
          bgColor: 'rgba(37, 99, 235, 0.1)',
        },
        {
          label: t.totalItems,
          value: totalItems,
          icon: Package,
          color: '#8b5cf6',
          bgColor: 'rgba(139, 92, 246, 0.1)',
        },
        {
          label: t.totalSales,
          value: `₹${totalSalesAmount.toLocaleString()}`,
          icon: IndianRupee,
          color: '#22c55e',
          bgColor: 'rgba(34, 197, 94, 0.1)',
        },
        {
          label: t.thisMonth,
          value: `₹${thisMonthAmount.toLocaleString()}`,
          icon: TrendingUp,
          color: '#f59e0b',
          bgColor: 'rgba(245, 158, 11, 0.1)',
        },
      ];
    }

    return [];
  };

  const getRecentSales = () => {
    let filteredSales = [...sales];

    if (role === 'branch_manager') {
      filteredSales = sales.filter(s => s.branchId === currentUser?.branchId);
    } else if (role === 'salesman') {
      filteredSales = sales.filter(s => s.salesmanId === currentUser?.id);
    }

    return filteredSales
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime())
      .slice(0, 5);
  };

  const getLowStockItems = () => {
    if (role === 'stock_manager') {
      return companyStock
        .filter(cs => cs.quantity < 50)
        .map(cs => ({
          product: getProductById(cs.productId),
          quantity: cs.quantity,
          location: 'Company Warehouse'
        }))
        .filter(item => item.product);
    }

    if (role === 'branch_manager') {
      const branchId = currentUser?.branchId;
      return branchStock
        .filter(bs => bs.branchId === branchId && bs.quantity < 10)
        .map(bs => ({
          product: getProductById(bs.productId),
          quantity: bs.quantity,
          location: 'Branch Stock'
        }))
        .filter(item => item.product);
    }

    return [];
  };

  const stats = getStats();
  const recentSales = getRecentSales();
  const lowStockItems = getLowStockItems();
  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>{greeting.text}, {currentUser?.name}!</h1>
        <p>{t.dashboard} - {format(new Date(), 'EEEE, dd MMMM yyyy')}</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div className="stat-card" key={index}>
            <div
              className="stat-card-icon"
              style={{ background: stat.bgColor, color: stat.color }}
            >
              <stat.icon size={24} />
            </div>
            <div className="stat-card-value">{stat.value}</div>
            <div className="stat-card-label">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card recent-sales">
          <div className="card-header">
            <h3>{t.recentSales}</h3>
            <ShoppingCart size={20} />
          </div>
          {recentSales.length > 0 ? (
            <div className="sales-list">
              {recentSales.map((sale) => {
                const salesman = getUserById(sale.salesmanId);
                const branch = getBranchById(sale.branchId);
                return (
                  <div className="sale-item" key={sale.id}>
                    <div className="sale-info">
                      <span className="sale-customer">{sale.customerName}</span>
                      <span className="sale-meta">
                        {salesman?.name} • {branch?.name}
                      </span>
                    </div>
                    <div className="sale-details">
                      <span className="sale-amount">₹{sale.finalAmount.toLocaleString()}</span>
                      <span className="sale-date">
                        {format(new Date(sale.saleDate), 'dd MMM yyyy')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-state">
              <p>{t.noRecentSales}</p>
            </div>
          )}
        </div>

        {(role === 'stock_manager' || role === 'branch_manager') && (
          <div className="card low-stock">
            <div className="card-header">
              <h3>Low Stock Alert</h3>
              <ArrowDownRight size={20} className="text-danger" />
            </div>
            {lowStockItems.length > 0 ? (
              <div className="stock-list">
                {lowStockItems.map((item, index) => (
                  <div className="stock-item" key={index}>
                    <div className="stock-info">
                      <span className="stock-name">{item.product?.name}</span>
                      <span className="stock-location">{item.location}</span>
                    </div>
                    <div className={`stock-qty ${item.quantity < 10 ? 'critical' : 'warning'}`}>
                      {item.quantity} {item.product?.unit}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>All stock levels are good!</p>
              </div>
            )}
          </div>
        )}

        {role === 'salesman' && (
          <div className="card my-stock">
            <div className="card-header">
              <h3>{t.myCurrentStock}</h3>
              <Package size={20} />
            </div>
            {salesmanStock.filter(ss => ss.salesmanId === currentUser?.id).length > 0 ? (
              <div className="stock-list">
                {salesmanStock
                  .filter(ss => ss.salesmanId === currentUser?.id)
                  .map((ss) => {
                    const product = getProductById(ss.productId);
                    return (
                      <div className="stock-item" key={ss.id}>
                        <div className="stock-info">
                          <span className="stock-name">{product?.name}</span>
                          <span className="stock-location">₹{product?.price} {t.perUnit} {product?.unit}</span>
                        </div>
                        <div className="stock-qty">
                          {ss.quantity} {product?.unit}
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <div className="empty-state">
                <p>{t.noProductsWithYou}. {t.takeProductsFromBranch}.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {role === 'stock_manager' && (
        <>
        {/* Payment Summary Section */}
        <div className="stats-grid" style={{ marginTop: '24px' }}>
          <div className="stat-card" style={{ borderLeft: '4px solid #c62828' }}>
            <div
              className="stat-card-icon"
              style={{ background: 'rgba(198, 40, 40, 0.1)', color: '#c62828' }}
            >
              <AlertTriangle size={24} />
            </div>
            <div className="stat-card-value" style={{ color: '#c62828' }}>
              ₹{paymentSummary.totalOutstanding.toLocaleString()}
            </div>
            <div className="stat-card-label">Total Outstanding</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {paymentSummary.customersWithOutstanding} customers
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #1565c0' }}>
            <div
              className="stat-card-icon"
              style={{ background: 'rgba(21, 101, 192, 0.1)', color: '#1565c0' }}
            >
              <Wallet size={24} />
            </div>
            <div className="stat-card-value" style={{ color: '#1565c0' }}>
              ₹{paymentSummary.totalAdvance.toLocaleString()}
            </div>
            <div className="stat-card-label">Total Advance</div>
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {paymentSummary.customersWithAdvance} customers
            </div>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #2e7d32' }}>
            <div
              className="stat-card-icon"
              style={{ background: 'rgba(46, 125, 50, 0.1)', color: '#2e7d32' }}
            >
              <IndianRupee size={24} />
            </div>
            <div className="stat-card-value" style={{ color: '#2e7d32' }}>
              ₹{paymentSummary.todayCollections.toLocaleString()}
            </div>
            <div className="stat-card-label">Today's Collection</div>
          </div>
        </div>

        <div className="card mt-4">
          <div className="card-header">
            <h3>Branch Performance</h3>
            <ArrowUpRight size={20} className="text-success" />
          </div>
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Manager</th>
                  <th>Salesmen</th>
                  <th>Total Sales</th>
                  <th>Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((branch) => {
                  const manager = getUserById(branch.managerId || '');
                  const branchSalesmen = users.filter(u => u.role === 'salesman' && u.branchId === branch.id);
                  const branchSalesData = sales.filter(s => s.branchId === branch.id);
                  const totalSales = branchSalesData.reduce((sum, s) => sum + s.finalAmount, 0);
                  const branchStockData = branchStock.filter(bs => bs.branchId === branch.id);
                  const stockValue = branchStockData.reduce((sum, bs) => {
                    const product = getProductById(bs.productId);
                    return sum + (product?.price || 0) * bs.quantity;
                  }, 0);

                  return (
                    <tr key={branch.id}>
                      <td>
                        <strong>{branch.name}</strong>
                      </td>
                      <td>{manager?.name || 'Not Assigned'}</td>
                      <td>{branchSalesmen.length}</td>
                      <td>₹{totalSales.toLocaleString()}</td>
                      <td>₹{stockValue.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
