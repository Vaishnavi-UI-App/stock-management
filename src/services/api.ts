const API_URL = import.meta.env.VITE_API_URL || '/api';

// Get token from localStorage
const getToken = () => localStorage.getItem('token');

// Clear the persisted session and send the user back to login.
// Called when the server rejects our token (expired / invalid). Because auth
// state is persisted client-side, the UI can otherwise look "logged in" with a
// dead token and every authenticated request fails with "Invalid token".
let handlingExpiredSession = false;
const handleExpiredSession = () => {
  if (handlingExpiredSession) return;
  handlingExpiredSession = true;
  localStorage.removeItem('token');
  localStorage.removeItem('stock-management-store');
  localStorage.removeItem('gps-tracking-state');
  // Full reload drops all in-memory state and lands on the login screen.
  window.location.href = '/login';
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  };

  const response = await fetch(`${API_URL}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    // Session is no longer valid on the server — force a clean re-login so the
    // user gets a fresh token instead of repeatedly hitting "Invalid token".
    if (response.status === 401) {
      handleExpiredSession();
      throw new Error(error.error || 'Your session has expired. Please log in again.');
    }
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// ==================== AUTH API ====================

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<{ user: any; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getCurrentUser: () => apiRequest<any>('/auth/me'),
};

// ==================== USERS API ====================

export const usersApi = {
  getAll: () => apiRequest<any[]>('/users'),

  create: (userData: any) =>
    apiRequest<any>('/users', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  update: (id: string, userData: any) =>
    apiRequest<any>(`/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(userData),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/users/${id}`, { method: 'DELETE' }),
};

// ==================== BRANCHES API ====================

export const branchesApi = {
  getAll: () => apiRequest<any[]>('/branches'),

  create: (branchData: any) =>
    apiRequest<any>('/branches', {
      method: 'POST',
      body: JSON.stringify(branchData),
    }),

  update: (id: string, branchData: any) =>
    apiRequest<any>(`/branches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(branchData),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/branches/${id}`, { method: 'DELETE' }),
};

// ==================== PRODUCTS API ====================

export const productsApi = {
  getAll: () => apiRequest<any[]>('/products'),

  create: (productData: any) =>
    apiRequest<any>('/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),

  update: (id: string, productData: any) =>
    apiRequest<any>(`/products/${id}`, {
      method: 'PUT',
      body: JSON.stringify(productData),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/products/${id}`, { method: 'DELETE' }),
};

// ==================== COMPANY STOCK API ====================

export const companyStockApi = {
  getAll: () => apiRequest<any[]>('/company-stock'),

  update: (productId: string, quantity: number) =>
    apiRequest<any>(`/company-stock/${productId}`, {
      method: 'PUT',
      body: JSON.stringify({ quantity }),
    }),
};

// ==================== BRANCH STOCK API ====================

export const branchStockApi = {
  getAll: (branchId?: string) =>
    apiRequest<any[]>(`/branch-stock${branchId ? `?branchId=${branchId}` : ''}`),

  update: (branchId: string, productId: string, quantity: number) =>
    apiRequest<any>('/branch-stock', {
      method: 'PUT',
      body: JSON.stringify({ branchId, productId, quantity }),
    }),
};

// ==================== SALESMAN STOCK API ====================

export const salesmanStockApi = {
  getAll: (salesmanId?: string) =>
    apiRequest<any[]>(`/salesman-stock${salesmanId ? `?salesmanId=${salesmanId}` : ''}`),

  takeStock: (data: {
    salesmanId: string;
    branchId: string;
    productId: string;
    quantity: number;
  }) =>
    apiRequest<any>('/salesman-stock/take', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  returnStock: (data: {
    salesmanId: string;
    branchId: string;
    productId: string;
    quantity: number;
  }) =>
    apiRequest<any>('/salesman-stock/return', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

// ==================== STOCK TRANSFER API ====================

export const stockTransferApi = {
  transferToBranch: (data: {
    productId: string;
    toBranchId: string;
    quantity: number;
    transferredBy: string;
  }) =>
    apiRequest<any>('/stock-transfer/to-branch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  transferBranchToBranch: (data: {
    productId: string;
    fromBranchId: string;
    toBranchId: string;
    quantity: number;
    transferredBy: string;
  }) =>
    apiRequest<any>('/stock-transfer/branch-to-branch', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  getTransferHistory: (branchId?: string, productId?: string) => {
    const params = new URLSearchParams();
    if (branchId) params.append('branchId', branchId);
    if (productId) params.append('productId', productId);
    const query = params.toString();
    return apiRequest<any[]>(`/stock-transfers${query ? `?${query}` : ''}`);
  },
};

// ==================== SALES API ====================

export const salesApi = {
  getAll: (filters?: { salesmanId?: string; branchId?: string; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.salesmanId) params.append('salesmanId', filters.salesmanId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return apiRequest<any[]>(`/sales${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiRequest<any>(`/sales/${id}`),

  create: (saleData: any) =>
    apiRequest<any>('/sales', {
      method: 'POST',
      body: JSON.stringify(saleData),
    }),

  update: (id: string, saleData: any) =>
    apiRequest<any>(`/sales/${id}`, {
      method: 'PUT',
      body: JSON.stringify(saleData),
    }),

  delete: (id: string, reason: string) =>
    apiRequest<void>(`/sales/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),

  getPendingSales: () => apiRequest<any[]>('/sales/pending/all'),

  approveSale: (id: string) =>
    apiRequest<any>(`/sales/${id}/approve`, {
      method: 'PUT',
    }),

  rejectSale: (id: string, rejectionReason: string) =>
    apiRequest<any>(`/sales/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }),
};

// ==================== CUSTOMERS API ====================

export const customersApi = {
  getAll: () => apiRequest<any[]>('/customers'),

  search: (q: string, limit = 10) => {
    const params = new URLSearchParams({ q, limit: String(limit) });
    return apiRequest<any[]>(`/customers?${params.toString()}`);
  },

  getById: (id: string) => apiRequest<any>(`/customers/${id}`),

  getByPhone: (phone: string) => apiRequest<any>(`/customers/phone/${phone}`),

  create: (customerData: any) =>
    apiRequest<any>('/customers', {
      method: 'POST',
      body: JSON.stringify(customerData),
    }),

  update: (id: string, customerData: any) =>
    apiRequest<any>(`/customers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(customerData),
    }),

  getLedger: (id: string, filters?: { startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const query = params.toString();
    return apiRequest<any[]>(`/customers/${id}/ledger${query ? `?${query}` : ''}`);
  },

  getOutstanding: () => apiRequest<any[]>('/customers/outstanding/all'),

  getWithAdvance: () => apiRequest<any[]>('/customers/advance/all'),
};

// ==================== PAYMENTS API ====================

export const paymentsApi = {
  getAll: (filters?: { customerId?: string; startDate?: string; endDate?: string }) => {
    const params = new URLSearchParams();
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    const query = params.toString();
    return apiRequest<any[]>(`/payments${query ? `?${query}` : ''}`);
  },

  create: (paymentData: {
    customerId: string;
    saleId?: string;
    amount: number;
    paymentMethod: string;
    referenceNo?: string;
    notes?: string;
    isAdvance?: boolean;
  }) =>
    apiRequest<any>('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),

  update: (id: string, paymentData: {
    amount?: number;
    paymentMethod?: string;
    referenceNo?: string;
    notes?: string;
    paymentDate?: string;
  }) =>
    apiRequest<any>(`/payments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(paymentData),
    }),

  getSummary: () => apiRequest<{
    totalOutstanding: number;
    totalAdvance: number;
    customersWithOutstanding: number;
    customersWithAdvance: number;
    todayCollections: number;
  }>('/payments/summary'),
};

// ==================== ORDERS API (Purchase Invoice) ====================

export const ordersApi = {
  getAll: (filters?: { salesmanId?: string; branchId?: string; orderStatus?: string }) => {
    const params = new URLSearchParams();
    if (filters?.salesmanId) params.append('salesmanId', filters.salesmanId);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.orderStatus) params.append('orderStatus', filters.orderStatus);
    const query = params.toString();
    return apiRequest<any[]>(`/orders${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiRequest<any>(`/orders/${id}`),

  create: (orderData: any) =>
    apiRequest<any>('/orders', {
      method: 'POST',
      body: JSON.stringify(orderData),
    }),

  update: (id: string, orderData: any) =>
    apiRequest<any>(`/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(orderData),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/orders/${id}`, { method: 'DELETE' }),

  getPendingOrders: () => apiRequest<any[]>('/orders/pending/all'),

  approveOrder: (id: string) =>
    apiRequest<any>(`/orders/${id}/approve`, {
      method: 'PUT',
    }),

  rejectOrder: (id: string, rejectionReason: string) =>
    apiRequest<any>(`/orders/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }),
};

// ==================== EXPENDITURES API ====================

export const expendituresApi = {
  getAll: (filters?: { userId?: string; status?: string; month?: number; year?: number }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const query = params.toString();
    return apiRequest<any[]>(`/expenditures${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiRequest<any>(`/expenditures/${id}`),

  create: (data: {
    date: string;
    description: string;
    amount: number;
    evidenceFile?: string;
    evidenceType?: string;
    evidenceName?: string;
  }) =>
    apiRequest<any>('/expenditures', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: {
    date?: string;
    description?: string;
    amount?: number;
    evidenceFile?: string;
    evidenceType?: string;
    evidenceName?: string;
  }) =>
    apiRequest<any>(`/expenditures/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/expenditures/${id}`, { method: 'DELETE' }),

  getPending: () => apiRequest<any[]>('/expenditures/pending/all'),

  approve: (id: string) =>
    apiRequest<any>(`/expenditures/${id}/approve`, {
      method: 'PUT',
    }),

  reject: (id: string, rejectionReason: string) =>
    apiRequest<any>(`/expenditures/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }),

  getSummary: (filters?: { userId?: string; month?: number; year?: number }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    const query = params.toString();
    return apiRequest<{
      pending: { count: number; amount: number };
      approved: { count: number; amount: number };
      rejected: { count: number; amount: number };
      total: { count: number; amount: number };
    }>(`/expenditures/summary${query ? `?${query}` : ''}`);
  },
};

// ==================== REPORTS API ====================

export const reportsApi = {
  getSalesReport: (filters?: {
    startDate?: string;
    endDate?: string;
    branchId?: string;
    salesmanId?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    if (filters?.salesmanId) params.append('salesmanId', filters.salesmanId);
    const query = params.toString();
    return apiRequest<any>(`/reports/sales${query ? `?${query}` : ''}`);
  },
};

// ==================== ORGANIZATION API ====================

export const organizationApi = {
  get: () => apiRequest<any>('/organization'),

  save: (data: any) =>
    apiRequest<any>('/organization', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  uploadDocument: (orgId: string, data: {
    documentName: string;
    documentType: string;
    fileData: string;
    fileName: string;
    fileType: string;
  }) =>
    apiRequest<any>(`/organization/${orgId}/documents`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deleteDocument: (docId: string) =>
    apiRequest<void>(`/organization/documents/${docId}`, { method: 'DELETE' }),
};

// ==================== ATTENDANCE API ====================

export const attendanceApi = {
  checkIn: (data: { photo?: string; location?: string; device?: string }) =>
    apiRequest<any>('/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  checkOut: (data: { photo?: string; location?: string; device?: string }) =>
    apiRequest<any>('/attendance/check-out', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getToday: () => apiRequest<any>('/attendance/today'),

  getMyHistory: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const query = params.toString();
    return apiRequest<any[]>(`/attendance/my-history${query ? `?${query}` : ''}`);
  },

  getAll: (filters?: { userId?: string; date?: string; month?: number; year?: number; approvalStatus?: string }) => {
    const params = new URLSearchParams();
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.approvalStatus) params.append('approvalStatus', filters.approvalStatus);
    const query = params.toString();
    return apiRequest<any[]>(`/attendance/all${query ? `?${query}` : ''}`);
  },

  getPending: () => apiRequest<any[]>('/attendance/pending'),

  approve: (id: string) =>
    apiRequest<any>(`/attendance/${id}/approve`, { method: 'PUT' }),

  reject: (id: string, notes?: string) =>
    apiRequest<any>(`/attendance/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    }),

  getSummary: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    const query = params.toString();
    return apiRequest<any>(`/attendance/summary${query ? `?${query}` : ''}`);
  },
};

// ==================== NEW FEATURE APIS ====================

// Feature 2: Sales Returns
export const salesReturnsApi = {
  getAll: () => apiRequest<any[]>('/sales-returns'),
  create: (data: any) => apiRequest<any>('/sales-returns', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string) => apiRequest<any>(`/sales-returns/${id}/approve`, { method: 'PUT' }),
  reject: (id: string) => apiRequest<any>(`/sales-returns/${id}/reject`, { method: 'PUT' }),
};

// Feature 3: Stock Alerts
export const stockAlertsApi = {
  getAlerts: () => apiRequest<any[]>('/stock-alerts'),
  setReorderPoint: (productId: string, reorderPoint: number) =>
    apiRequest<any>(`/products/${productId}/reorder-point`, { method: 'PUT', body: JSON.stringify({ reorderPoint }) }),
};

// Feature 4: Payroll
export const payrollApi = {
  generate: (month: number, year: number) =>
    apiRequest<any[]>('/payroll/generate', { method: 'POST', body: JSON.stringify({ month, year }) }),
};

// Feature 6: Product Batches
export const batchesApi = {
  getAll: (daysToExpiry?: number) => {
    const q = daysToExpiry ? `?daysToExpiry=${daysToExpiry}` : '';
    return apiRequest<any[]>(`/product-batches${q}`);
  },
  create: (data: any) => apiRequest<any>('/product-batches', { method: 'POST', body: JSON.stringify(data) }),
};

// Feature 7: Salesman Performance
export const performanceApi = {
  getSalesmanPerformance: (month?: number, year?: number) => {
    const params = new URLSearchParams();
    if (month) params.append('month', month.toString());
    if (year) params.append('year', year.toString());
    return apiRequest<any[]>(`/performance/salesman?${params.toString()}`);
  },
};

// Feature 8: Suppliers & Purchases
export const suppliersApi = {
  getAll: () => apiRequest<any[]>('/suppliers'),
  create: (data: any) => apiRequest<any>('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) => apiRequest<any>(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => apiRequest<any>(`/suppliers/${id}`, { method: 'DELETE' }),
};

export const purchasesApi = {
  getAll: () => apiRequest<any[]>('/purchases'),
  create: (data: any) => apiRequest<any>('/purchases', { method: 'POST', body: JSON.stringify(data) }),
};

// Feature 10: Daily Collection
export const dailyCollectionApi = {
  getReport: (date?: string) => {
    const q = date ? `?date=${date}` : '';
    return apiRequest<any>(`/reports/daily-collection${q}`);
  },
};

// Feature 12: Leave Management
export const leavesApi = {
  getAll: (status?: string) => {
    const q = status ? `?status=${status}` : '';
    return apiRequest<any[]>(`/leaves${q}`);
  },
  create: (data: any) => apiRequest<any>('/leaves', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string) => apiRequest<any>(`/leaves/${id}/approve`, { method: 'PUT' }),
  reject: (id: string, reason: string) => apiRequest<any>(`/leaves/${id}/reject`, { method: 'PUT', body: JSON.stringify({ reason }) }),
};

// Feature 13: Damage Tracking
export const damagesApi = {
  getAll: () => apiRequest<any[]>('/damages'),
  create: (data: any) => apiRequest<any>('/damages', { method: 'POST', body: JSON.stringify(data) }),
  approve: (id: string) => apiRequest<any>(`/damages/${id}/approve`, { method: 'PUT' }),
};

// Feature 14: Credit Limit
export const creditApi = {
  setCreditLimit: (customerId: string, creditLimit: number) =>
    apiRequest<any>(`/customers/${customerId}/credit-limit`, { method: 'PUT', body: JSON.stringify({ creditLimit }) }),
  checkCredit: (customerId: string) => apiRequest<any>(`/customers/credit-check/${customerId}`),
};

// Feature 15: Audit Logs
export const auditApi = {
  getLogs: (filters?: { entity?: string; action?: string; userId?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (filters?.entity) params.append('entity', filters.entity);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.userId) params.append('userId', filters.userId);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    return apiRequest<any[]>(`/audit-logs?${params.toString()}`);
  },
};

// ==================== DEALER APPLICATIONS API ====================

export const dealerApplicationsApi = {
  getAll: (filters?: { status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    const query = params.toString();
    return apiRequest<any[]>(`/dealer-applications${query ? `?${query}` : ''}`);
  },

  getById: (id: string) => apiRequest<any>(`/dealer-applications/${id}`),

  create: (data: any) =>
    apiRequest<any>('/dealer-applications', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiRequest<any>(`/dealer-applications/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiRequest<void>(`/dealer-applications/${id}`, { method: 'DELETE' }),

  approve: (id: string) =>
    apiRequest<any>(`/dealer-applications/${id}/approve`, {
      method: 'PUT',
    }),

  reject: (id: string, rejectionReason: string) =>
    apiRequest<any>(`/dealer-applications/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }),
};

// ==================== GPS TRACKING API ====================

export interface SalesmanLocation {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number;
  heading?: number;
  altitude?: number;
  batteryLevel?: number;
  address?: string;
  timestamp: string;
}

export interface CustomerVisit {
  id: string;
  userId: string;
  customerId?: string;
  customerName?: string;
  checkInTime: string;
  checkInLat: number;
  checkInLng: number;
  checkInAddress?: string;
  checkInPhoto?: string;
  checkOutTime?: string;
  checkOutLat?: number;
  checkOutLng?: number;
  checkOutAddress?: string;
  durationMinutes?: number;
  distanceFromCustomer?: number;
  visitPurpose?: string;
  outcome?: string;
  notes?: string;
  orderId?: string;
  saleId?: string;
  amountCollected?: number;
  visitDate: string;
  customer?: any;
}

export interface DailyRouteSummary {
  id: string;
  userId: string;
  date: string;
  startTime?: string;
  endTime?: string;
  totalDistanceKm: number;
  totalCustomersPlanned: number;
  totalCustomersVisited: number;
  totalOrdersTaken: number;
  totalAmountCollected: number;
  productiveHours: number;
  idleTimeMinutes: number;
}

export interface LiveTrackingData {
  salesman: {
    id: string;
    name: string;
    phone: string;
    employeeCode?: string;
    branch?: any;
  };
  lastLocation?: SalesmanLocation;
  lastSeen?: string;
  isOnline: boolean;
  todayStats: {
    customersVisited: number;
    distanceKm: number;
    startTime?: string;
    endTime?: string;
    totalHours?: number;
    productiveHours?: number;
  };
}

export const gpsApi = {
  // Record current location
  recordLocation: (data: {
    latitude: number;
    longitude: number;
    accuracy?: number;
    speed?: number;
    heading?: number;
    altitude?: number;
    batteryLevel?: number;
    address?: string;
  }) => apiRequest<SalesmanLocation>('/gps/location', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Get location history for a user
  getLocationHistory: (userId: string, date?: string) => {
    const q = date ? `?date=${date}` : '';
    return apiRequest<SalesmanLocation[]>(`/gps/history/${userId}${q}`);
  },

  // Get live tracking data (admin)
  getLiveTracking: () => apiRequest<LiveTrackingData[]>('/gps/live-tracking'),

  // Customer Visit - Check In
  visitCheckIn: (data: {
    customerId?: string;
    customerName?: string;
    latitude: number;
    longitude: number;
    address?: string;
    photo?: string;
    visitPurpose?: string;
  }) => apiRequest<CustomerVisit>('/gps/visit/check-in', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Customer Visit - Check Out
  visitCheckOut: (visitId: string, data: {
    latitude: number;
    longitude: number;
    address?: string;
    outcome?: string;
    notes?: string;
    orderId?: string;
    saleId?: string;
    amountCollected?: number;
  }) => apiRequest<CustomerVisit>(`/gps/visit/${visitId}/check-out`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // Get visits for a user
  getVisits: (userId: string, date?: string) => {
    const q = date ? `?date=${date}` : '';
    return apiRequest<CustomerVisit[]>(`/gps/visits/${userId}${q}`);
  },

  // Get daily route summary
  getRouteSummary: (userId: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const q = params.toString();
    return apiRequest<DailyRouteSummary[]>(`/gps/summary/${userId}${q ? `?${q}` : ''}`);
  },

  // Save customer location for geofencing
  saveCustomerLocation: (data: {
    customerId: string;
    latitude: number;
    longitude: number;
    address?: string;
    geofenceRadius?: number;
  }) => apiRequest<any>('/gps/customer-location', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // Get customer location
  getCustomerLocation: (customerId: string) =>
    apiRequest<any>(`/gps/customer-location/${customerId}`),

  // Get all customer locations
  getAllCustomerLocations: () =>
    apiRequest<any[]>('/gps/customer-locations'),

  // Update distance traveled
  updateDistance: (distanceKm: number) =>
    apiRequest<any>('/gps/update-distance', {
      method: 'POST',
      body: JSON.stringify({ distanceKm }),
    }),
};

// ==================== STOCK UPDATE REQUESTS API ====================

export const stockUpdateRequestsApi = {
  getAll: (filters?: { status?: string; branchId?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.branchId) params.append('branchId', filters.branchId);
    const query = params.toString();
    return apiRequest<any[]>(`/stock-update-requests${query ? `?${query}` : ''}`);
  },

  create: (data: {
    branchId: string;
    productId: string;
    requestedQuantity: number;
    requestType?: string;
    reason?: string;
  }) =>
    apiRequest<any>('/stock-update-requests', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  approve: (id: string) =>
    apiRequest<any>(`/stock-update-requests/${id}/approve`, { method: 'PUT' }),

  reject: (id: string, rejectionReason: string) =>
    apiRequest<any>(`/stock-update-requests/${id}/reject`, {
      method: 'PUT',
      body: JSON.stringify({ rejectionReason }),
    }),
};

// ==================== NOTIFICATIONS API ====================

export const notificationsApi = {
  getAll: (unreadOnly?: boolean) => {
    const q = unreadOnly ? '?unreadOnly=true' : '';
    return apiRequest<any[]>(`/notifications${q}`);
  },

  markRead: (id: string) =>
    apiRequest<any>(`/notifications/${id}/read`, { method: 'PUT' }),

  markAllRead: () =>
    apiRequest<any>('/notifications/read-all', { method: 'PUT' }),

  getUnreadCount: () =>
    apiRequest<{ count: number }>('/notifications/unread-count'),
};

// ==================== CHAT API ====================

export type ChatConversationType = 'direct' | 'group' | 'broadcast';

export interface ChatUser {
  id: string;
  name: string;
  email?: string;
  role?: string;
  branchId?: string | null;
  employeeCode?: string | null;
  profilePhoto?: string | null;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender?: ChatUser;
}

export interface ChatConversation {
  id: string;
  type: ChatConversationType;
  name?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  lastMessageAt?: string | null;
  participants: Array<{ id: string; conversationId: string; userId: string; user?: ChatUser; lastReadAt?: string | null }>;
  messages?: ChatMessage[];
  unreadCount?: number;
}

export const chatApi = {
  listUsers: () => apiRequest<ChatUser[]>('/chat/users'),

  listConversations: () => apiRequest<ChatConversation[]>('/chat/conversations'),

  createConversation: (body: { type: ChatConversationType; name?: string; participantIds?: string[] }) =>
    apiRequest<ChatConversation>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  listMessages: (conversationId: string, opts?: { before?: string; limit?: number }) => {
    const params = new URLSearchParams();
    if (opts?.before) params.append('before', opts.before);
    if (opts?.limit) params.append('limit', String(opts.limit));
    const query = params.toString();
    return apiRequest<ChatMessage[]>(`/chat/conversations/${conversationId}/messages${query ? `?${query}` : ''}`);
  },

  sendMessage: (conversationId: string, content: string) =>
    apiRequest<ChatMessage>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  markRead: (conversationId: string) =>
    apiRequest<{ success: boolean }>(`/chat/conversations/${conversationId}/read`, { method: 'POST' }),
};
