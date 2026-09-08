import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Calculator,
  Wallet,
  Receipt,
  Clock,
  Settings as SettingsIcon,
  // New feature icons
  DollarSign,
  ShoppingBag,
  Send,
  Navigation,
  Handshake,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../i18n/useLanguage';
import './Layout.css';

// Union of every menu item that used to be hardcoded per-role. Filtered at
// render time by `currentUser.permissions[item.module].view`. One canonical
// path is listed per module — some modules are reachable via several role-
// specific URLs (see src/constants/modules.ts / rbac-module-map), all of
// which remain valid routes, just not all individually listed here.
interface MenuItemDef {
  path: string;
  icon: LucideIcon;
  label: string;
  module: string;
  // Pages that fold multiple modules into one sidebar entry (e.g. Attendance
  // Mgmt hosts both Attendance and Leave Management as tabs) are visible if
  // the user has view access to ANY of these, not just `module`.
  anyModule?: string[];
}

const ALL_MENU_ITEMS: MenuItemDef[] = [
  { path: '/products', icon: Package, label: 'Products', module: 'products', anyModule: ['products', 'companyStock', 'stockAlerts', 'expiryTracking', 'damageTracking'] },
  { path: '/users', icon: Users, label: 'Employee', module: 'users' },
  { path: '/expenditures', icon: Receipt, label: 'Expenditures', module: 'expenditures' },
  { path: '/customer-ledger', icon: Wallet, label: 'Customer Ledger', module: 'customerLedger' },
  { path: '/accounts', icon: Calculator, label: 'Accounts', module: 'accounts', anyModule: ['accounts', 'gstReports', 'reports', 'paymentReceived', 'purchases', 'salesReturns'] },
  { path: '/all-sales', icon: ShoppingCart, label: 'Sales', module: 'sales' },
  { path: '/payroll', icon: DollarSign, label: 'Payroll', module: 'payroll' },
  { path: '/purchases', icon: ShoppingBag, label: 'Purchases', module: 'purchases' },
  { path: '/route-tracking', icon: Navigation, label: 'Route Tracking', module: 'routeTracking' },
  { path: '/dealer-application', icon: Handshake, label: 'Dealer Application', module: 'dealerApplication' },
];

// Always visible for any authenticated user, regardless of permissions —
// same treatment dashboard/profile already had. Personal account features
// only, not business modules — those are all in ALL_MENU_ITEMS above now.
const ALWAYS_VISIBLE_ITEMS: MenuItemDef[] = [
  { path: '/attendance-management', icon: Clock, label: 'Attendance Mgmt', module: '' },
  // No permission needed — every user gets self-service order creation. The
  // Orders tab inside this page (permission-gated approve/manage-all view)
  // only shows for users with 'orders' view access.
  { path: '/my-orders', icon: Send, label: 'My Orders', module: '' },
];

// Visible only for roles marked "Field staff" (Role.isFieldStaff) — self
// check-in/location tracking, not gated by a module permission since it only
// ever touches the current user's own data.
const FIELD_STAFF_ITEMS: MenuItemDef[] = [
  { path: '/my-route', icon: Navigation, label: 'My Route', module: '' },
];

// Always the last item in the sidebar, after every permission-gated entry.
const SETTINGS_ITEM: MenuItemDef = { path: '/settings', icon: SettingsIcon, label: 'Settings', module: '' };

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
    const baseItems: MenuItemDef[] = [
      { path: '/dashboard', icon: LayoutDashboard, label: t.dashboard, module: '' },
    ];

    const permittedItems = ALL_MENU_ITEMS.filter((item) =>
      item.anyModule
        ? item.anyModule.some((m) => currentUser?.permissions?.[m]?.view)
        : currentUser?.permissions?.[item.module]?.view
    );

    const fieldStaffItems = currentUser?.isFieldStaff ? FIELD_STAFF_ITEMS : [];

    return [...baseItems, ...ALWAYS_VISIBLE_ITEMS, ...fieldStaffItems, ...permittedItems, SETTINGS_ITEM];
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
              {currentUser?.roleName || 'No role assigned'}
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
