// Canonical RBAC module keys — single source of truth.
//
// Both `src/components/layout/Layout.tsx` (sidebar visibility) and
// `src/pages/stock/Roles.tsx` (permission matrix) derive from this list.
// Do not invent new keys or rename existing ones — the backend
// (`server/src/index.js`, `/api/roles` module validation) uses these exact
// camelCase strings too.
//
// 'branches', 'branchStock', 'chat', 'meeting', 'stockRequests' intentionally
// removed — company operates without a branch tier now (direct company ->
// customer flow). Their pages/routes/code stay in the repo, just no longer
// grantable via any role, so they're unreachable in the running app.
export const MODULE_KEYS = [
  'organization',
  'products',
  'companyStock',
  'users',
  'roles',
  'attendanceManagement',
  'orders',
  'expenditures',
  'customerLedger',
  'accounts',
  'sales',
  'gstReports',
  'salesReturns',
  'stockAlerts',
  'payroll',
  'notifications',
  'expiryTracking',
  'purchases',
  'leaveManagement',
  'damageTracking',
  'auditLog',
  'routeTracking',
  'salesmanStock',
  'dealerApplication',
  'paymentReceived',
  'reports',
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

// Human-readable labels for each module — used in the Roles permission
// matrix and anywhere else a friendly name is needed for a module key.
export const MODULE_LABELS: Record<string, string> = {
  organization: 'Organization',
  products: 'Products',
  companyStock: 'Company Stock',
  users: 'Employees',
  roles: 'Roles',
  attendanceManagement: 'Attendance Management',
  orders: 'Orders',
  expenditures: 'Expenditures',
  customerLedger: 'Customer Ledger',
  accounts: 'Accounts',
  sales: 'Sales',
  gstReports: 'GST Reports',
  salesReturns: 'Sales Returns',
  stockAlerts: 'Stock Alerts',
  payroll: 'Payroll',
  notifications: 'Notifications',
  expiryTracking: 'Expiry Tracking',
  purchases: 'Purchases',
  leaveManagement: 'Leave Management',
  damageTracking: 'Damage Tracking',
  auditLog: 'Audit Log',
  routeTracking: 'Route Tracking',
  salesmanStock: 'Salesman Stock',
  dealerApplication: 'Dealer Application',
  paymentReceived: 'Payment Received',
  reports: 'Reports',
};
