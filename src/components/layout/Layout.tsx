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
  Clock,
  // New feature icons
  RotateCcw,
  AlertTriangle,
  DollarSign,
  Bell,
  CalendarClock,
  ShoppingBag,
  Globe,
  CalendarDays,
  Trash2,
  ScrollText,
  Navigation,
  Handshake,
  CircleDollarSign,
  Video,
  MessageSquare
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../i18n/useLanguage';
import './Layout.css';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser, logout, getBranchById } = useStore();
  const { t } = useLanguage();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getMenuItems = () => {
    const baseItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: t.dashboard },
      { path: '/profile', icon: UserCircle, label: t.profile },
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
        // New Features
        { path: '/gst-reports', icon: FileText, label: 'GST Reports' },
        { path: '/sales-returns', icon: RotateCcw, label: 'Sales Returns' },
        { path: '/stock-alerts', icon: AlertTriangle, label: 'Stock Alerts' },
        { path: '/payroll', icon: DollarSign, label: 'Payroll' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/expiry-tracking', icon: CalendarClock, label: 'Expiry Tracking' },
        { path: '/purchases', icon: ShoppingBag, label: 'Purchases' },
        { path: '/leave-management', icon: CalendarDays, label: 'Leave Mgmt' },
        { path: '/damage-tracking', icon: Trash2, label: 'Damage Tracking' },
        { path: '/audit-log', icon: ScrollText, label: 'Audit Log' },
        { path: '/route-tracking', icon: Navigation, label: 'Route Tracking' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
        { path: '/payment-received', icon: CircleDollarSign, label: 'Payment Received' },
        { path: '/meeting', icon: Video, label: 'Meeting' },
        { path: '/chat', icon: MessageSquare, label: 'Chat' },
        { path: '/dealer-application', icon: Handshake, label: 'Dealer Application' },
        { path: '/language-settings', icon: Globe, label: 'Language' },
      ];
    }

    if (currentUser?.role === 'account_manager') {
      return [
        ...baseItems,
        { path: '/my-attendance', icon: Clock, label: 'Attendance' },
        { path: '/payment-received', icon: CircleDollarSign, label: 'Payment Received' },
        { path: '/expenditures', icon: Receipt, label: 'Expenditures' },
        { path: '/accounts', icon: Calculator, label: 'Accounts' },
        { path: '/customer-ledger', icon: Wallet, label: 'Customer Ledger' },
        { path: '/dealer-application', icon: Handshake, label: 'Dealer Application' },
        { path: '/attendance-management', icon: Clock, label: 'Attendance Mgmt' },
        { path: '/damage-tracking', icon: Trash2, label: 'Damage Tracking' },
        { path: '/leave-management', icon: CalendarDays, label: 'Leave Mgmt' },
        { path: '/meeting', icon: Video, label: 'Meeting' },
        { path: '/chat', icon: MessageSquare, label: 'Chat' },
        { path: '/payroll', icon: DollarSign, label: 'Payroll' },
        { path: '/gst-reports', icon: FileText, label: 'GST Reports' },
        { path: '/all-sales', icon: ShoppingCart, label: 'All Sales' },
        { path: '/reports', icon: BarChart3, label: 'Reports' },
      ];
    }

    if (currentUser?.role === 'branch_manager') {
      return [
        ...baseItems,
        { path: '/branch-inventory', icon: Package, label: 'Branch Inventory' },
        { path: '/all-branch-stock', icon: Truck, label: 'All Branch Stock' },
        { path: '/stock-requests', icon: ClipboardList, label: 'Stock Requests' },
        { path: '/my-attendance', icon: Clock, label: 'Attendance' },
        { path: '/branch-expenditures', icon: Receipt, label: 'Expenditures' },
        { path: '/branch-leaves', icon: CalendarDays, label: 'Leave Mgmt' },
        { path: '/branch-damages', icon: Trash2, label: 'Damage Tracking' },
        { path: '/branch-stock-alerts', icon: AlertTriangle, label: 'Stock Alerts' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/meeting', icon: Video, label: 'Meeting' },
        { path: '/chat', icon: MessageSquare, label: 'Chat' },
        { path: '/dealer-application', icon: Handshake, label: 'Dealer Application' },
        { path: '/reports', icon: BarChart3, label: t.reports },
      ];
    }

    if (currentUser?.role === 'salesman') {
      return [
        ...baseItems,
        { path: '/my-attendance', icon: Clock, label: t.attendance },
        { path: '/my-route', icon: Navigation, label: t.myRoute },
        { path: '/my-stock', icon: Package, label: t.myStock },
        { path: '/take-product', icon: Truck, label: t.takeProduct },
        { path: '/create-bill', icon: FileText, label: t.createBill },
        { path: '/my-orders', icon: ClipboardList, label: t.myOrders },
        { path: '/my-sales', icon: ShoppingCart, label: t.mySales },
        { path: '/payment-received', icon: CircleDollarSign, label: 'Payment Received' },
        { path: '/meeting', icon: Video, label: 'Meeting' },
        { path: '/chat', icon: MessageSquare, label: 'Chat' },
        { path: '/dealer-application', icon: Handshake, label: 'Dealer Application' },
        { path: '/my-expenditures', icon: Receipt, label: t.expenditures },
        { path: '/my-leaves', icon: CalendarDays, label: t.myLeaves },
        { path: '/language-settings', icon: Globe, label: t.languageSettings },
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
          <h1>DynamicIndia</h1>
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
            <img src="/logo.png" alt="DynamicIndia" className="sidebar-logo-img" />
            <div>
              <h2>DynamicIndia</h2>
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
              {currentUser?.role === 'account_manager' && 'Account Manager'}
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
            <span>{t.logout}</span>
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
