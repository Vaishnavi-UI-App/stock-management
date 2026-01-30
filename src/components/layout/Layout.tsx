import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Users,
  Building2,
  ShoppingCart,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Truck,
  Calculator,
  UserCircle,
  Wallet,
  ClipboardList,
  Receipt,
  Landmark,
  Clock
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, getBranchById } = useStore();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const baseItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/profile', icon: UserCircle, label: 'Profile' },
    ];

    if (currentUser?.role === 'stock_manager') {
      return [
        ...baseItems,
        { path: '/organization', icon: Landmark, label: 'Organization' },
        { path: '/products', icon: Package, label: 'Products' },
        { path: '/company-stock', icon: Package, label: 'Company Stock' },
        { path: '/branches', icon: Building2, label: 'Branches' },
        { path: '/branch-stock', icon: Truck, label: 'Branch Stock' },
        { path: '/users', icon: Users, label: 'Employee' },
        { path: '/attendance-management', icon: Clock, label: 'Attendance Mgmt' },
        { path: '/orders', icon: ClipboardList, label: 'Orders' },
        { path: '/expenditures', icon: Receipt, label: 'Expenditures' },
        { path: '/customer-ledger', icon: Wallet, label: 'Customer Ledger' },
        { path: '/accounts', icon: Calculator, label: 'Accounts' },
        { path: '/all-sales', icon: ShoppingCart, label: 'All Sales' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
      ];
    }

    if (currentUser?.role === 'branch_manager') {
      return [
        ...baseItems,
        { path: '/branch-inventory', icon: Package, label: 'Branch Inventory' },
        { path: '/salesmen', icon: Users, label: 'Salesmen' },
        { path: '/branch-sales', icon: ShoppingCart, label: 'Branch Sales' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
      ];
    }

    if (currentUser?.role === 'salesman') {
      return [
        ...baseItems,
        { path: '/my-attendance', icon: Clock, label: 'Attendance' },
        { path: '/my-stock', icon: Package, label: 'My Stock' },
        { path: '/take-product', icon: Truck, label: 'Take Product' },
        { path: '/create-bill', icon: FileText, label: 'Create Bill' },
        { path: '/my-orders', icon: ClipboardList, label: 'My Orders' },
        { path: '/my-sales', icon: ShoppingCart, label: 'My Sales' },
        { path: '/my-expenditures', icon: Receipt, label: 'Expenditures' },
      ];
    }

    return baseItems;
  };

  const menuItems = getMenuItems();
  const branchName = currentUser?.branchId ? getBranchById(currentUser.branchId)?.name : null;

  return (
    <div className="layout">
      {/* Mobile Header */}
      <header className="mobile-header">
        <button className="menu-toggle" onClick={() => setSidebarOpen(true)}>
          <Menu size={24} />
        </button>
        <div className="mobile-header-title">
          <h1>DynamicCrop ERP</h1>
        </div>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            <Package size={32} />
            <div>
              <h2>DynamicCrop</h2>
              <span>ERP System</span>
            </div>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
            <X size={24} />
          </button>
        </div>

        <div className="sidebar-user">
          <div
            className="user-avatar"
            style={currentUser?.profilePhoto ? {
              backgroundImage: `url(${currentUser.profilePhoto})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center'
            } : undefined}
          >
            {!currentUser?.profilePhoto && currentUser?.name.charAt(0).toUpperCase()}
          </div>
          <div className="user-info">
            <span className="user-name">{currentUser?.name}</span>
            <span className="user-role">
              {currentUser?.role === 'stock_manager' && 'Stock Manager'}
              {currentUser?.role === 'branch_manager' && 'Branch Manager'}
              {currentUser?.role === 'salesman' && 'Salesman'}
            </span>
            {branchName && <span className="user-branch">{branchName}</span>}
          </div>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              <ChevronRight size={16} className="nav-arrow" />
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
