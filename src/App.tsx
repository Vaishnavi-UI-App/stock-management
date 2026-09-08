import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { SetPassword } from './pages/auth/SetPassword';

// Lazily load each page so a user only downloads the code for the pages their
// role can reach. Helper maps named exports to the default export lazy() wants.
const page = <T extends Record<string, React.ComponentType<any>>>(
  loader: () => Promise<T>,
  name: keyof T,
) => lazy(() => loader().then((m) => ({ default: m[name] })));

const Dashboard = page(() => import('./pages/dashboard/Dashboard'), 'Dashboard');
const ProductsHub = page(() => import('./pages/stock/ProductsHub'), 'ProductsHub');
const BranchStock = page(() => import('./pages/stock/BranchStock'), 'BranchStock');
const Branches = page(() => import('./pages/stock/Branches'), 'Branches');
const Users = page(() => import('./pages/stock/Users'), 'Users');
const TakeProduct = page(() => import('./pages/sales/TakeProduct'), 'TakeProduct');
const CreateBill = page(() => import('./pages/sales/CreateBill'), 'CreateBill');
const MySales = page(() => import('./pages/sales/MySales'), 'MySales');
const MyStock = page(() => import('./pages/sales/MyStock'), 'MyStock');
const OrdersHub = page(() => import('./pages/sales/OrdersHub'), 'OrdersHub');
const MyExpenditures = page(() => import('./pages/sales/MyExpenditures'), 'MyExpenditures');
const AllSales = page(() => import('./pages/sales/AllSales'), 'AllSales');
const BranchInventory = page(() => import('./pages/sales/BranchInventory'), 'BranchInventory');
const Salesmen = page(() => import('./pages/sales/Salesmen'), 'Salesmen');
const AccountsHub = page(() => import('./pages/accounts/AccountsHub'), 'AccountsHub');
const CustomerLedger = page(() => import('./pages/accounts/CustomerLedger'), 'CustomerLedger');
const Expenditures = page(() => import('./pages/admin/Expenditures'), 'Expenditures');
const AttendanceManagement = page(() => import('./pages/admin/AttendanceManagement'), 'AttendanceManagement');
const AttendanceHub = page(() => import('./pages/admin/AttendanceHub'), 'AttendanceHub');
const Orders = page(() => import('./pages/orders/Orders'), 'Orders');
const Chat = page(() => import('./pages/chat/Chat'), 'Chat');
// New Feature Pages
const StockAlerts = page(() => import('./pages/admin/StockAlerts'), 'StockAlerts');
const PayrollProcessing = page(() => import('./pages/admin/PayrollProcessing'), 'PayrollProcessing');
const Notifications = page(() => import('./pages/admin/Notifications'), 'Notifications');
const PurchaseManagement = page(() => import('./pages/admin/PurchaseManagement'), 'PurchaseManagement');
const LeaveManagement = page(() => import('./pages/admin/LeaveManagement'), 'LeaveManagement');
const MyLeaves = page(() => import('./pages/sales/MyLeaves'), 'MyLeaves');
const DamageTracking = page(() => import('./pages/admin/DamageTracking'), 'DamageTracking');
const AuditLog = page(() => import('./pages/admin/AuditLog'), 'AuditLog');
const RouteTracking = page(() => import('./pages/admin/RouteTracking'), 'RouteTracking');
const MyRoute = page(() => import('./pages/sales/MyRoute'), 'MyRoute');
const DealerApplication = page(() => import('./pages/admin/DealerApplication'), 'DealerApplication');
const Meeting = page(() => import('./pages/admin/Meeting'), 'Meeting');
const StockUpdateRequests = page(() => import('./pages/admin/StockUpdateRequests'), 'StockUpdateRequests');
const AllBranchStockView = page(() => import('./pages/sales/AllBranchStockView'), 'AllBranchStockView');
const Settings = page(() => import('./pages/admin/Settings'), 'Settings');

// Protected Route Component
function ProtectedRoute({
  children,
  requiredPermission,
}: {
  children: React.ReactNode;
  requiredPermission?: { module: string; action: 'view' | 'create' | 'edit' | 'delete' };
}) {
  const { isAuthenticated, currentUser } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (
    requiredPermission &&
    !currentUser?.permissions?.[requiredPermission.module]?.[requiredPermission.action]
  ) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Layout>{children}</Layout>;
}

function App() {
  const { isAuthenticated, fetchAllData } = useStore();

  // Re-fetch all data when the app loads and user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchAllData();
    }
  }, [isAuthenticated, fetchAllData]);

  return (
    <BrowserRouter>
      <Suspense fallback={<div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>Loading…</div>}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />}
        />
        <Route
          path="/forgot-password"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <ForgotPassword />}
        />
        <Route path="/set-password/:token" element={<SetPassword />} />

        {/* Protected Routes - All Users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route path="/profile" element={<Navigate to="/settings" replace />} />

        {/* Stock Manager Routes */}
        <Route
          path="/products"
          element={
            <ProtectedRoute>
              <ProductsHub />
            </ProtectedRoute>
          }
        />
        <Route path="/company-stock" element={<Navigate to="/products" replace />} />
        <Route
          path="/branch-stock"
          element={
            <ProtectedRoute requiredPermission={{ module: 'branchStock', action: 'view' }}>
              <BranchStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branches"
          element={
            <ProtectedRoute requiredPermission={{ module: 'branches', action: 'view' }}>
              <Branches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route path="/roles" element={<Navigate to="/settings" replace />} />
        <Route
          path="/all-sales"
          element={
            <ProtectedRoute requiredPermission={{ module: 'sales', action: 'view' }}>
              <AllSales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute>
              <AccountsHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-ledger"
          element={
            <ProtectedRoute requiredPermission={{ module: 'customerLedger', action: 'view' }}>
              <CustomerLedger />
            </ProtectedRoute>
          }
        />
        <Route path="/orders" element={<Navigate to="/my-orders" replace />} />
        <Route
          path="/expenditures"
          element={
            <ProtectedRoute requiredPermission={{ module: 'expenditures', action: 'view' }}>
              <Expenditures />
            </ProtectedRoute>
          }
        />
        <Route path="/organization" element={<Navigate to="/settings" replace />} />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance-management"
          element={
            <ProtectedRoute>
              <AttendanceHub />
            </ProtectedRoute>
          }
        />

        {/* New Feature Routes - Stock Manager */}
        <Route path="/gst-reports" element={<Navigate to="/accounts" replace />} />
        <Route path="/sales-returns" element={<Navigate to="/accounts" replace />} />
        <Route path="/stock-alerts" element={<Navigate to="/products" replace />} />
        <Route path="/payroll" element={<ProtectedRoute requiredPermission={{ module: 'payroll', action: 'view' }}><PayrollProcessing /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute requiredPermission={{ module: 'notifications', action: 'view' }}><Notifications /></ProtectedRoute>} />
        <Route path="/expiry-tracking" element={<Navigate to="/products" replace />} />
        <Route path="/purchases" element={<ProtectedRoute requiredPermission={{ module: 'purchases', action: 'view' }}><PurchaseManagement /></ProtectedRoute>} />
        <Route path="/language-settings" element={<Navigate to="/settings" replace />} />
        <Route path="/leave-management" element={<Navigate to="/attendance-management" replace />} />
        <Route path="/damage-tracking" element={<Navigate to="/products" replace />} />
        <Route path="/audit-log" element={<ProtectedRoute requiredPermission={{ module: 'auditLog', action: 'view' }}><AuditLog /></ProtectedRoute>} />
        <Route path="/route-tracking" element={<ProtectedRoute requiredPermission={{ module: 'routeTracking', action: 'view' }}><RouteTracking /></ProtectedRoute>} />
        <Route path="/stock-requests" element={<ProtectedRoute requiredPermission={{ module: 'stockRequests', action: 'view' }}><StockUpdateRequests /></ProtectedRoute>} />
        <Route path="/dealer-application" element={<ProtectedRoute requiredPermission={{ module: 'dealerApplication', action: 'view' }}><DealerApplication /></ProtectedRoute>} />
        <Route path="/payment-received" element={<Navigate to="/accounts" replace />} />
        <Route path="/meeting" element={<ProtectedRoute requiredPermission={{ module: 'meeting', action: 'view' }}><Meeting /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute requiredPermission={{ module: 'chat', action: 'view' }}><Chat /></ProtectedRoute>} />

        {/* Attendance - All Users */}
        <Route path="/my-attendance" element={<Navigate to="/attendance-management" replace />} />

        {/* Branch Manager Routes */}
        <Route
          path="/branch-inventory"
          element={
            <ProtectedRoute requiredPermission={{ module: 'branchStock', action: 'view' }}>
              <BranchInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salesmen"
          element={
            <ProtectedRoute requiredPermission={{ module: 'users', action: 'view' }}>
              <Salesmen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch-sales"
          element={
            <ProtectedRoute requiredPermission={{ module: 'sales', action: 'view' }}>
              <AllSales />
            </ProtectedRoute>
          }
        />
        <Route path="/all-branch-stock" element={<ProtectedRoute requiredPermission={{ module: 'branchStock', action: 'view' }}><AllBranchStockView /></ProtectedRoute>} />
        <Route path="/branch-orders" element={<ProtectedRoute requiredPermission={{ module: 'orders', action: 'view' }}><Orders /></ProtectedRoute>} />
        <Route path="/branch-attendance" element={<ProtectedRoute requiredPermission={{ module: 'attendanceManagement', action: 'view' }}><AttendanceManagement /></ProtectedRoute>} />
        <Route path="/branch-expenditures" element={<ProtectedRoute requiredPermission={{ module: 'expenditures', action: 'view' }}><Expenditures /></ProtectedRoute>} />
        <Route path="/branch-leaves" element={<ProtectedRoute requiredPermission={{ module: 'leaveManagement', action: 'view' }}><LeaveManagement /></ProtectedRoute>} />
        <Route path="/branch-damages" element={<ProtectedRoute requiredPermission={{ module: 'damageTracking', action: 'view' }}><DamageTracking /></ProtectedRoute>} />
        <Route path="/branch-stock-alerts" element={<ProtectedRoute requiredPermission={{ module: 'stockAlerts', action: 'view' }}><StockAlerts /></ProtectedRoute>} />

        {/* Salesman Routes */}
        {/* Self-service — operates only on the logged-in user's own location/
            check-ins, so any authenticated user can reach it. It used to
            require the 'routeTracking' permission (the ADMIN dashboard's
            permission for viewing every salesman's location), which blocked
            every salesman from ever reaching their own tracking page. */}
        <Route
          path="/my-route"
          element={
            <ProtectedRoute>
              <MyRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-stock"
          element={
            <ProtectedRoute requiredPermission={{ module: 'salesmanStock', action: 'view' }}>
              <MyStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/take-product"
          element={
            <ProtectedRoute requiredPermission={{ module: 'salesmanStock', action: 'view' }}>
              <TakeProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-bill"
          element={
            <ProtectedRoute requiredPermission={{ module: 'sales', action: 'view' }}>
              <CreateBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-sales"
          element={
            <ProtectedRoute requiredPermission={{ module: 'sales', action: 'view' }}>
              <MySales />
            </ProtectedRoute>
          }
        />
        {/* Self-service: creating/viewing your own orders needs no permission,
            matching the backend (POST /api/orders is unguarded, GET /api/orders
            self-scopes to the caller without orders.view). Approving/viewing
            everyone's orders — the separate /orders page — stays permission-gated. */}
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute>
              <OrdersHub />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-expenditures"
          element={
            <ProtectedRoute requiredPermission={{ module: 'expenditures', action: 'view' }}>
              <MyExpenditures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-leaves"
          element={
            <ProtectedRoute requiredPermission={{ module: 'leaveManagement', action: 'view' }}>
              <MyLeaves />
            </ProtectedRoute>
          }
        />

        <Route path="/reports" element={<Navigate to="/accounts" replace />} />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
