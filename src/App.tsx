import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';

// Lazily load each page so a user only downloads the code for the pages their
// role can reach. Helper maps named exports to the default export lazy() wants.
const page = <T extends Record<string, React.ComponentType<any>>>(
  loader: () => Promise<T>,
  name: keyof T,
) => lazy(() => loader().then((m) => ({ default: m[name] })));

const Dashboard = page(() => import('./pages/dashboard/Dashboard'), 'Dashboard');
const Products = page(() => import('./pages/stock/Products'), 'Products');
const CompanyStock = page(() => import('./pages/stock/CompanyStock'), 'CompanyStock');
const BranchStock = page(() => import('./pages/stock/BranchStock'), 'BranchStock');
const Branches = page(() => import('./pages/stock/Branches'), 'Branches');
const Users = page(() => import('./pages/stock/Users'), 'Users');
const TakeProduct = page(() => import('./pages/sales/TakeProduct'), 'TakeProduct');
const CreateBill = page(() => import('./pages/sales/CreateBill'), 'CreateBill');
const MySales = page(() => import('./pages/sales/MySales'), 'MySales');
const MyStock = page(() => import('./pages/sales/MyStock'), 'MyStock');
const MyOrders = page(() => import('./pages/sales/MyOrders'), 'MyOrders');
const MyExpenditures = page(() => import('./pages/sales/MyExpenditures'), 'MyExpenditures');
const AllSales = page(() => import('./pages/sales/AllSales'), 'AllSales');
const BranchInventory = page(() => import('./pages/sales/BranchInventory'), 'BranchInventory');
const Salesmen = page(() => import('./pages/sales/Salesmen'), 'Salesmen');
const Reports = page(() => import('./pages/reports/Reports'), 'Reports');
const Accounts = page(() => import('./pages/accounts/Accounts'), 'Accounts');
const CustomerLedger = page(() => import('./pages/accounts/CustomerLedger'), 'CustomerLedger');
const Expenditures = page(() => import('./pages/admin/Expenditures'), 'Expenditures');
const OrganizationMaster = page(() => import('./pages/admin/OrganizationMaster'), 'OrganizationMaster');
const AttendanceManagement = page(() => import('./pages/admin/AttendanceManagement'), 'AttendanceManagement');
const MyAttendance = page(() => import('./pages/attendance/MyAttendance'), 'MyAttendance');
const Profile = page(() => import('./pages/profile/Profile'), 'Profile');
const Orders = page(() => import('./pages/orders/Orders'), 'Orders');
const Chat = page(() => import('./pages/chat/Chat'), 'Chat');
// New Feature Pages
const GSTReports = page(() => import('./pages/admin/GSTReports'), 'GSTReports');
const SalesReturns = page(() => import('./pages/admin/SalesReturns'), 'SalesReturns');
const StockAlerts = page(() => import('./pages/admin/StockAlerts'), 'StockAlerts');
const PayrollProcessing = page(() => import('./pages/admin/PayrollProcessing'), 'PayrollProcessing');
const Notifications = page(() => import('./pages/admin/Notifications'), 'Notifications');
const ExpiryTracking = page(() => import('./pages/admin/ExpiryTracking'), 'ExpiryTracking');
const PurchaseManagement = page(() => import('./pages/admin/PurchaseManagement'), 'PurchaseManagement');
const LanguageSettings = page(() => import('./pages/admin/LanguageSettings'), 'LanguageSettings');
const LeaveManagement = page(() => import('./pages/admin/LeaveManagement'), 'LeaveManagement');
const MyLeaves = page(() => import('./pages/sales/MyLeaves'), 'MyLeaves');
const DamageTracking = page(() => import('./pages/admin/DamageTracking'), 'DamageTracking');
const AuditLog = page(() => import('./pages/admin/AuditLog'), 'AuditLog');
const RouteTracking = page(() => import('./pages/admin/RouteTracking'), 'RouteTracking');
const MyRoute = page(() => import('./pages/sales/MyRoute'), 'MyRoute');
const DealerApplication = page(() => import('./pages/admin/DealerApplication'), 'DealerApplication');
const PaymentReceived = page(() => import('./pages/accounts/PaymentReceived'), 'PaymentReceived');
const Meeting = page(() => import('./pages/admin/Meeting'), 'Meeting');
const StockUpdateRequests = page(() => import('./pages/admin/StockUpdateRequests'), 'StockUpdateRequests');
const AllBranchStockView = page(() => import('./pages/sales/AllBranchStockView'), 'AllBranchStockView');

// Protected Route Component
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, currentUser } = useStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && currentUser && !allowedRoles.includes(currentUser.role)) {
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

        {/* Protected Routes - All Users */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        {/* Stock Manager Routes */}
        <Route
          path="/products"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <Products />
            </ProtectedRoute>
          }
        />
        <Route
          path="/company-stock"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <CompanyStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch-stock"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <BranchStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branches"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <Branches />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="/all-sales"
          element={
            <ProtectedRoute allowedRoles={['stock_manager', 'account_manager']}>
              <AllSales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={['stock_manager', 'account_manager']}>
              <Accounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-ledger"
          element={
            <ProtectedRoute allowedRoles={['stock_manager', 'account_manager']}>
              <CustomerLedger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={['stock_manager', 'branch_manager']}>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenditures"
          element={
            <ProtectedRoute allowedRoles={['stock_manager', 'account_manager', 'branch_manager']}>
              <Expenditures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/organization"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <OrganizationMaster />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attendance-management"
          element={
            <ProtectedRoute allowedRoles={['stock_manager', 'account_manager', 'branch_manager']}>
              <AttendanceManagement />
            </ProtectedRoute>
          }
        />

        {/* New Feature Routes - Stock Manager */}
        <Route path="/gst-reports" element={<ProtectedRoute allowedRoles={['stock_manager', 'account_manager']}><GSTReports /></ProtectedRoute>} />
        <Route path="/sales-returns" element={<ProtectedRoute allowedRoles={['stock_manager']}><SalesReturns /></ProtectedRoute>} />
        <Route path="/stock-alerts" element={<ProtectedRoute allowedRoles={['stock_manager', 'branch_manager']}><StockAlerts /></ProtectedRoute>} />
        <Route path="/payroll" element={<ProtectedRoute allowedRoles={['stock_manager', 'account_manager']}><PayrollProcessing /></ProtectedRoute>} />
        <Route path="/notifications" element={<ProtectedRoute allowedRoles={['stock_manager', 'branch_manager']}><Notifications /></ProtectedRoute>} />
        <Route path="/expiry-tracking" element={<ProtectedRoute allowedRoles={['stock_manager']}><ExpiryTracking /></ProtectedRoute>} />
        <Route path="/purchases" element={<ProtectedRoute allowedRoles={['stock_manager']}><PurchaseManagement /></ProtectedRoute>} />
        <Route path="/language-settings" element={<ProtectedRoute><LanguageSettings /></ProtectedRoute>} />
        <Route path="/leave-management" element={<ProtectedRoute allowedRoles={['stock_manager', 'account_manager', 'branch_manager']}><LeaveManagement /></ProtectedRoute>} />
        <Route path="/damage-tracking" element={<ProtectedRoute allowedRoles={['stock_manager', 'account_manager', 'branch_manager']}><DamageTracking /></ProtectedRoute>} />
        <Route path="/audit-log" element={<ProtectedRoute allowedRoles={['stock_manager']}><AuditLog /></ProtectedRoute>} />
        <Route path="/route-tracking" element={<ProtectedRoute allowedRoles={['stock_manager']}><RouteTracking /></ProtectedRoute>} />
        <Route path="/stock-requests" element={<ProtectedRoute allowedRoles={['stock_manager', 'branch_manager']}><StockUpdateRequests /></ProtectedRoute>} />
        <Route path="/dealer-application" element={<ProtectedRoute><DealerApplication /></ProtectedRoute>} />
        <Route path="/payment-received" element={<ProtectedRoute><PaymentReceived /></ProtectedRoute>} />
        <Route path="/meeting" element={<ProtectedRoute><Meeting /></ProtectedRoute>} />
        <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />

        {/* Attendance - All Users */}
        <Route
          path="/my-attendance"
          element={
            <ProtectedRoute>
              <MyAttendance />
            </ProtectedRoute>
          }
        />

        {/* Branch Manager Routes */}
        <Route
          path="/branch-inventory"
          element={
            <ProtectedRoute allowedRoles={['branch_manager']}>
              <BranchInventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/salesmen"
          element={
            <ProtectedRoute allowedRoles={['branch_manager']}>
              <Salesmen />
            </ProtectedRoute>
          }
        />
        <Route
          path="/branch-sales"
          element={
            <ProtectedRoute allowedRoles={['branch_manager']}>
              <AllSales />
            </ProtectedRoute>
          }
        />
        <Route path="/all-branch-stock" element={<ProtectedRoute allowedRoles={['branch_manager']}><AllBranchStockView /></ProtectedRoute>} />
        <Route path="/branch-orders" element={<ProtectedRoute allowedRoles={['branch_manager']}><Orders /></ProtectedRoute>} />
        <Route path="/branch-attendance" element={<ProtectedRoute allowedRoles={['branch_manager']}><AttendanceManagement /></ProtectedRoute>} />
        <Route path="/branch-expenditures" element={<ProtectedRoute allowedRoles={['branch_manager']}><Expenditures /></ProtectedRoute>} />
        <Route path="/branch-leaves" element={<ProtectedRoute allowedRoles={['branch_manager']}><LeaveManagement /></ProtectedRoute>} />
        <Route path="/branch-damages" element={<ProtectedRoute allowedRoles={['branch_manager']}><DamageTracking /></ProtectedRoute>} />
        <Route path="/branch-stock-alerts" element={<ProtectedRoute allowedRoles={['branch_manager']}><StockAlerts /></ProtectedRoute>} />

        {/* Salesman Routes */}
        <Route
          path="/my-route"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <MyRoute />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-stock"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <MyStock />
            </ProtectedRoute>
          }
        />
        <Route
          path="/take-product"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <TakeProduct />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-bill"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <CreateBill />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-sales"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <MySales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-orders"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <MyOrders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-expenditures"
          element={
            <ProtectedRoute allowedRoles={['salesman']}>
              <MyExpenditures />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-leaves"
          element={
            <ProtectedRoute allowedRoles={['salesman', 'branch_manager']}>
              <MyLeaves />
            </ProtectedRoute>
          }
        />

        {/* Reports - All Roles */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Reports />
            </ProtectedRoute>
          }
        />

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
