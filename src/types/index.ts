// User roles
export type UserRole = 'stock_manager' | 'branch_manager' | 'salesman';

// User interface
export interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId?: string; // For branch managers and salesmen
  phone: string;
  // Additional employee fields
  profilePhoto?: string;
  employeeCode?: string;
  aadharCard?: string;
  aadharCardDoc?: string;
  panCard?: string;
  panCardDoc?: string;
  bloodGroup?: string;
  emergencyContact?: string;
  monthlySalary?: number;
  // Bank Details
  bankName?: string;
  bankAccountNo?: string;
  bankAccountHolder?: string;
  bankIfscCode?: string;
  bankBranchName?: string;
  bankPassbookDoc?: string;
  // Employment Details
  dateOfJoining?: Date;
  pfNo?: string;          // Provident Fund Number
  esicNo?: string;        // ESIC Number
  uanNo?: string;         // Universal Account Number
  licenseNo?: string;     // License Number
  medicalInsurance?: string; // Medical Insurance Number
  designation?: string;
  location?: string;
  // Salary Allowances
  basicSalary?: number;
  houseRentAllowance?: number;
  conveyanceAllowance?: number;
  medicalAllowance?: number;
  uniformAllowance?: number;
  educationAllowance?: number;
  ltaAllowance?: number;
  specialAllowance?: number;
  pfDeduction?: number;
  createdAt: Date;
}

// Branch interface
export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  managerId?: string;
  createdAt: Date;
}

// Product interface
export interface Product {
  id: string;
  name: string;
  sku: string; // HSN Code
  category: string;
  price: number; // Price including GST
  mrp?: number; // Maximum Retail Price
  unit: string; // e.g., '1KG', '2.5KG'
  caseQty: number; // Quantity per case
  gstRate: number; // GST percentage (e.g., 5 for 5%)
  description?: string;
  createdAt: Date;
}

// Stock at company level
export interface CompanyStock {
  id: string;
  productId: string;
  quantity: number;
  lastUpdated: Date;
}

// Stock at branch level
export interface BranchStock {
  id: string;
  branchId: string;
  productId: string;
  quantity: number;
  lastUpdated: Date;
}

// Stock transfer from company to branch
export interface StockTransfer {
  id: string;
  productId: string;
  fromBranchId?: string; // null if from company
  toBranchId: string;
  quantity: number;
  transferredBy: string; // User ID
  transferDate: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

// Product taken by salesman
export interface SalesmanStock {
  id: string;
  salesmanId: string;
  branchId: string;
  productId: string;
  quantity: number;
  takenDate: Date;
}

// Sale status
export type SaleStatus = 'pending' | 'approved' | 'rejected';

// Payment status
export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

// Order status (for Purchase Invoice)
export type OrderStatus = 'pending' | 'approved' | 'rejected' | 'converted';

// Product availability status in orders
export type AvailabilityStatus = 'available' | 'not_available';

// Transaction type for ledger
export type TransactionType = 'sale' | 'payment' | 'advance' | 'refund' | 'adjustment';

// Customer interface for ledger tracking
export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  gstin?: string;
  pan?: string;
  currentBalance: number; // positive = owes us, negative = advance
  totalPurchases: number;
  totalPaid: number;
  creditLimit?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Payment interface
export interface Payment {
  id: string;
  customerId: string;
  customer?: Customer;
  saleId?: string;
  sale?: Sale;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit';
  referenceNo?: string;
  notes?: string;
  receivedBy: string;
  paymentDate: Date;
  createdAt: Date;
}

// Customer transaction for ledger entries
export interface CustomerTransaction {
  id: string;
  customerId: string;
  customer?: Customer;
  saleId?: string;
  sale?: Sale;
  paymentId?: string;
  payment?: Payment;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  transactionDate: Date;
  createdAt: Date;
}

// Sale transaction
export interface Sale {
  id: string;
  billNumber: string;
  salesmanId: string;
  branchId: string;
  // Customer linking
  customerId?: string;
  customer?: Customer;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  customerPAN?: string;
  items: SaleItem[];
  totalAmount: number;
  discount: number;
  finalAmount: number;
  // Payment tracking
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  cgstRate: number;
  sgstRate: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit';
  status: SaleStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  // Delivery Details
  deliveryNote?: string;
  modeOfPayment?: string;
  referenceNo?: string;
  otherReferences?: string;
  buyersOrderNo?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  poNumber?: string;
  vehicleNo?: string;
  billLocation?: string;
  saleDate: Date;
  createdAt: Date;
  dueDate?: Date;
}

// Sale item
export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  hsnCode?: string;
  batchNo?: string;
  expDate?: string;
  mfgDate?: string;
  unit?: string;
}

// Bill/Invoice
export interface Bill {
  id: string;
  saleId: string;
  billNumber: string;
  companyName: string;
  branchName: string;
  branchAddress: string;
  customerName: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paymentMethod: string;
  salesmanName: string;
  createdAt: Date;
}

// Monthly sales report
export interface MonthlySalesReport {
  month: number;
  year: number;
  branchId?: string;
  salesmanId?: string;
  totalSales: number;
  totalAmount: number;
  productWiseSales: ProductSale[];
}

export interface ProductSale {
  productId: string;
  productName: string;
  quantitySold: number;
  totalAmount: number;
}

// Order (Purchase Invoice) interface
export interface Order {
  id: string;
  orderNumber: string;
  salesmanId: string;
  branchId: string;
  // Customer details
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  customerAddress?: string;
  customerGSTIN?: string;
  customerPAN?: string;
  // Items
  items: OrderItem[];
  // Amount details
  totalAmount: number;
  discount: number;
  finalAmount: number;
  // Payment tracking
  amountPaid: number;
  balanceDue: number;
  paymentStatus: PaymentStatus;
  cgstRate: number;
  sgstRate: number;
  paymentMethod: 'cash' | 'card' | 'upi' | 'credit';
  // Order status
  orderStatus: OrderStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  convertedSaleId?: string;
  // Delivery Details
  deliveryNote?: string;
  modeOfPayment?: string;
  referenceNo?: string;
  otherReferences?: string;
  buyersOrderNo?: string;
  buyersOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedThrough?: string;
  destination?: string;
  poNumber?: string;
  vehicleNo?: string;
  orderLocation?: string;
  orderDate: Date;
  createdAt: Date;
}

// Order item interface
export interface OrderItem {
  id?: string;
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
  hsnCode?: string;
  batchNo?: string;
  expDate?: string;
  mfgDate?: string;
  unit?: string;
  availability: AvailabilityStatus;
}

// Expenditure status
export type ExpenditureStatus = 'pending' | 'approved' | 'rejected';

// Expenditure interface
export interface Expenditure {
  id: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    email: string;
    employeeCode?: string;
  };
  date: Date;
  description: string;
  amount: number;
  evidenceFile?: string;
  evidenceType?: string;
  evidenceName?: string;
  status: ExpenditureStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt?: Date;
}
