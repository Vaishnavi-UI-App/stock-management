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
  const { isAuthenticated } = useStore();

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
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <AllSales />
            </ProtectedRoute>
          }
        />
        <Route
          path="/accounts"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <Accounts />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customer-ledger"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <CustomerLedger />
            </ProtectedRoute>
          }
        />
        <Route
          path="/orders"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <Orders />
            </ProtectedRoute>
          }
        />
        <Route
          path="/expenditures"
          element={
            <ProtectedRoute allowedRoles={['stock_manager']}>
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
            <ProtectedRoute allowedRoles={['stock_manager']}>
              <AttendanceManagement />
            </ProtectedRoute>
          }
        />

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

        {/* Salesman Routes */}
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
