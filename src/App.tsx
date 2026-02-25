import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store/useStore';
import { Layout } from './components/layout/Layout';
import { Login } from './pages/auth/Login';
import { Dashboard } from './pages/dashboard/Dashboard';
import { Products } from './pages/stock/Products';
import { CompanyStock } from './pages/stock/CompanyStock';
import { BranchStock } from './pages/stock/BranchStock';
import { Branches } from './pages/stock/Branches';
import { Users } from './pages/stock/Users';
import { TakeProduct } from './pages/sales/TakeProduct';
import { CreateBill } from './pages/sales/CreateBill';
import { MySales } from './pages/sales/MySales';
import { MyStock } from './pages/sales/MyStock';
import { MyOrders } from './pages/sales/MyOrders';
import { MyExpenditures } from './pages/sales/MyExpenditures';
import { AllSales } from './pages/sales/AllSales';
import { BranchInventory } from './pages/sales/BranchInventory';
import { Salesmen } from './pages/sales/Salesmen';
import { Reports } from './pages/reports/Reports';
import { Accounts } from './pages/accounts/Accounts';
import { CustomerLedger } from './pages/accounts/CustomerLedger';
import { Expenditures } from './pages/admin/Expenditures';
import { OrganizationMaster } from './pages/admin/OrganizationMaster';
import { AttendanceManagement } from './pages/admin/AttendanceManagement';
import { MyAttendance } from './pages/attendance/MyAttendance';
import { Profile } from './pages/profile/Profile';
import { Orders } from './pages/orders/Orders';
// New Feature Pages
import { GSTReports } from './pages/admin/GSTReports';
import { SalesReturns } from './pages/admin/SalesReturns';
import { StockAlerts } from './pages/admin/StockAlerts';
import { PayrollProcessing } from './pages/admin/PayrollProcessing';
import { Notifications } from './pages/admin/Notifications';
import { ExpiryTracking } from './pages/admin/ExpiryTracking';
import { PurchaseManagement } from './pages/admin/PurchaseManagement';
import { LanguageSettings } from './pages/admin/LanguageSettings';
import { LeaveManagement } from './pages/admin/LeaveManagement';
import { MyLeaves } from './pages/sales/MyLeaves';
import { DamageTracking } from './pages/admin/DamageTracking';
import { AuditLog } from './pages/admin/AuditLog';
import { RouteTracking } from './pages/admin/RouteTracking';
import { MyRoute } from './pages/sales/MyRoute';
import { DealerApplication } from './pages/admin/DealerApplication';
import { PaymentReceived } from './pages/accounts/PaymentReceived';
import { Meeting } from './pages/admin/Meeting';
import { StockUpdateRequests } from './pages/admin/StockUpdateRequests';
import { AllBranchStockView } from './pages/sales/AllBranchStockView';

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
    </BrowserRouter>
  );
}

export default App;
