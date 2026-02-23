import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  User, Branch, Product, CompanyStock, BranchStock,
  Sale, SalesmanStock, StockTransfer
} from '../types';
import {
  authApi, usersApi, branchesApi, productsApi,
  companyStockApi, branchStockApi, salesmanStockApi,
  stockTransferApi, salesApi
} from '../services/api';

interface AppState {
  // Auth
  currentUser: User | null;
  isAuthenticated: boolean;
  token: string | null;

  // Data
  users: User[];
  branches: Branch[];
  products: Product[];
  companyStock: CompanyStock[];
  branchStock: BranchStock[];
  salesmanStock: SalesmanStock[];
  sales: Sale[];
  pendingSales: Sale[];
  stockTransfers: StockTransfer[];

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Auth actions
  login: (email: string, password: string) => Promise<User | null>;
  logout: () => void;

  // Data fetching
  fetchUsers: () => Promise<void>;
  fetchBranches: () => Promise<void>;
  fetchProducts: () => Promise<void>;
  fetchCompanyStock: () => Promise<void>;
  fetchBranchStock: (branchId?: string) => Promise<void>;
  fetchSalesmanStock: (salesmanId?: string) => Promise<void>;
  fetchSales: (filters?: { salesmanId?: string; branchId?: string }) => Promise<void>;
  fetchAllData: () => Promise<void>;

  // User actions
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;

  // Branch actions
  addBranch: (branch: Omit<Branch, 'id' | 'createdAt'>) => Promise<void>;
  updateBranch: (id: string, data: Partial<Branch>) => Promise<void>;
  deleteBranch: (id: string) => Promise<void>;

  // Product actions
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => Promise<void>;
  updateProduct: (id: string, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;

  // Stock actions
  updateCompanyStock: (productId: string, quantity: number) => Promise<void>;
  transferStockToBranch: (productId: string, branchId: string, quantity: number, transferredBy: string) => Promise<boolean>;
  transferBranchToBranch: (productId: string, fromBranchId: string, toBranchId: string, quantity: number, transferredBy: string) => Promise<boolean>;

  // Salesman stock actions
  takeProductFromBranch: (salesmanId: string, branchId: string, productId: string, quantity: number) => Promise<boolean>;
  returnProductToBranch: (salesmanId: string, branchId: string, productId: string, quantity: number) => Promise<boolean>;

  // Sales actions
  createSale: (sale: Omit<Sale, 'id' | 'billNumber' | 'createdAt' | 'status'>) => Promise<Sale>;
  fetchPendingSales: () => Promise<void>;
  approveSale: (id: string) => Promise<Sale>;
  rejectSale: (id: string, reason: string) => Promise<Sale>;
  updateSale: (id: string, saleData: Partial<Sale>) => Promise<Sale>;

  // Helper functions
  getProductById: (id: string) => Product | undefined;
  getBranchById: (id: string) => Branch | undefined;
  getUserById: (id: string) => User | undefined;
  getBranchStock: (branchId: string) => BranchStock[];
  getSalesmanStock: (salesmanId: string) => SalesmanStock[];
  getSalesmanSales: (salesmanId: string) => Sale[];
  getBranchSales: (branchId: string) => Sale[];
  getMonthlySales: (month: number, year: number, branchId?: string, salesmanId?: string) => Sale[];

  // Clear error
  clearError: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUser: null,
      isAuthenticated: false,
      token: null,
      users: [],
      branches: [],
      products: [],
      companyStock: [],
      branchStock: [],
      salesmanStock: [],
      sales: [],
      pendingSales: [],
      stockTransfers: [],
      isLoading: false,
      error: null,

      // Clear error
      clearError: () => set({ error: null }),

      // Auth actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authApi.login(email, password);
          localStorage.setItem('token', response.token);
          set({
            currentUser: response.user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false
          });
          // Fetch all data after login
          await get().fetchAllData();
          return response.user;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return null;
        }
      },

      logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('gps-tracking-state');
        set({
          currentUser: null,
          token: null,
          isAuthenticated: false,
          users: [],
          branches: [],
          products: [],
          companyStock: [],
          branchStock: [],
          salesmanStock: [],
          sales: [],
          pendingSales: [],
          stockTransfers: []
        });
      },

      // Data fetching
      fetchUsers: async () => {
        try {
          const users = await usersApi.getAll();
          set({ users });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchBranches: async () => {
        try {
          const branches = await branchesApi.getAll();
          set({ branches });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchProducts: async () => {
        try {
          const products = await productsApi.getAll();
          set({ products });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchCompanyStock: async () => {
        try {
          const companyStock = await companyStockApi.getAll();
          set({ companyStock });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchBranchStock: async (branchId?: string) => {
        try {
          const branchStock = await branchStockApi.getAll(branchId);
          set({ branchStock });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchSalesmanStock: async (salesmanId?: string) => {
        try {
          const salesmanStock = await salesmanStockApi.getAll(salesmanId);
          set({ salesmanStock });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchSales: async (filters?: { salesmanId?: string; branchId?: string }) => {
        try {
          const sales = await salesApi.getAll(filters);
          set({ sales });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      fetchAllData: async () => {
        set({ isLoading: true });
        try {
          await Promise.all([
            get().fetchUsers(),
            get().fetchBranches(),
            get().fetchProducts(),
            get().fetchCompanyStock(),
            get().fetchBranchStock(),
            get().fetchSalesmanStock(),
            get().fetchSales()
          ]);
        } finally {
          set({ isLoading: false });
        }
      },

      // User actions
      addUser: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const newUser = await usersApi.create(userData);
          set(state => ({ users: [...state.users, newUser], isLoading: false }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateUser: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedUser = await usersApi.update(id, data);
          set(state => ({
            users: state.users.map(u => u.id === id ? updatedUser : u),
            // Also update currentUser if the updated user is the logged-in user
            currentUser: state.currentUser?.id === id ? updatedUser : state.currentUser,
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteUser: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await usersApi.delete(id);
          set(state => ({
            users: state.users.filter(u => u.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Branch actions
      addBranch: async (branchData) => {
        set({ isLoading: true, error: null });
        try {
          const newBranch = await branchesApi.create(branchData);
          set(state => ({ branches: [...state.branches, newBranch], isLoading: false }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateBranch: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedBranch = await branchesApi.update(id, data);
          set(state => ({
            branches: state.branches.map(b => b.id === id ? updatedBranch : b),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteBranch: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await branchesApi.delete(id);
          set(state => ({
            branches: state.branches.filter(b => b.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Product actions
      addProduct: async (productData) => {
        set({ isLoading: true, error: null });
        try {
          const newProduct = await productsApi.create(productData);
          set(state => ({ products: [...state.products, newProduct], isLoading: false }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateProduct: async (id, data) => {
        set({ isLoading: true, error: null });
        try {
          const updatedProduct = await productsApi.update(id, data);
          set(state => ({
            products: state.products.map(p => p.id === id ? updatedProduct : p),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      deleteProduct: async (id) => {
        set({ isLoading: true, error: null });
        try {
          await productsApi.delete(id);
          set(state => ({
            products: state.products.filter(p => p.id !== id),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Stock actions
      updateCompanyStock: async (productId, quantity) => {
        set({ isLoading: true, error: null });
        try {
          const updatedStock = await companyStockApi.update(productId, quantity);
          set(state => ({
            companyStock: state.companyStock.map(cs =>
              cs.productId === productId ? updatedStock : cs
            ),
            isLoading: false
          }));
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      transferStockToBranch: async (productId, branchId, quantity, transferredBy) => {
        set({ isLoading: true, error: null });
        try {
          await stockTransferApi.transferToBranch({
            productId,
            toBranchId: branchId,
            quantity,
            transferredBy
          });
          // Refresh stock data
          await Promise.all([
            get().fetchCompanyStock(),
            get().fetchBranchStock()
          ]);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      transferBranchToBranch: async (productId, fromBranchId, toBranchId, quantity, transferredBy) => {
        set({ isLoading: true, error: null });
        try {
          await stockTransferApi.transferBranchToBranch({
            productId,
            fromBranchId,
            toBranchId,
            quantity,
            transferredBy
          });
          // Refresh branch stock data
          await get().fetchBranchStock();
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      // Salesman stock actions
      takeProductFromBranch: async (salesmanId, branchId, productId, quantity) => {
        set({ isLoading: true, error: null });
        try {
          await salesmanStockApi.takeStock({ salesmanId, branchId, productId, quantity });
          // Refresh stock data
          await Promise.all([
            get().fetchBranchStock(),
            get().fetchSalesmanStock()
          ]);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      returnProductToBranch: async (salesmanId, branchId, productId, quantity) => {
        set({ isLoading: true, error: null });
        try {
          await salesmanStockApi.returnStock({ salesmanId, branchId, productId, quantity });
          // Refresh stock data
          await Promise.all([
            get().fetchBranchStock(),
            get().fetchSalesmanStock()
          ]);
          set({ isLoading: false });
          return true;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          return false;
        }
      },

      // Sales actions
      createSale: async (saleData) => {
        set({ isLoading: true, error: null });
        try {
          const newSale = await salesApi.create(saleData);
          set(state => ({
            sales: [...state.sales, newSale],
            isLoading: false
          }));
          // Refresh salesman stock
          await get().fetchSalesmanStock();
          return newSale;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      fetchPendingSales: async () => {
        try {
          const pendingSales = await salesApi.getPendingSales();
          set({ pendingSales });
        } catch (error: any) {
          set({ error: error.message });
        }
      },

      approveSale: async (id) => {
        set({ isLoading: true, error: null });
        try {
          const approvedSale = await salesApi.approveSale(id);
          set(state => ({
            sales: state.sales.map(s => s.id === id ? approvedSale : s),
            pendingSales: state.pendingSales.filter(s => s.id !== id),
            isLoading: false
          }));
          return approvedSale;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      rejectSale: async (id, reason) => {
        set({ isLoading: true, error: null });
        try {
          const rejectedSale = await salesApi.rejectSale(id, reason);
          set(state => ({
            sales: state.sales.map(s => s.id === id ? rejectedSale : s),
            pendingSales: state.pendingSales.filter(s => s.id !== id),
            isLoading: false
          }));
          return rejectedSale;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      updateSale: async (id, saleData) => {
        set({ isLoading: true, error: null });
        try {
          const updatedSale = await salesApi.update(id, saleData);
          set(state => ({
            sales: state.sales.map(s => s.id === id ? updatedSale : s),
            pendingSales: state.pendingSales.map(s => s.id === id ? updatedSale : s),
            isLoading: false
          }));
          return updatedSale;
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
          throw error;
        }
      },

      // Helper functions
      getProductById: (id) => get().products.find(p => p.id === id),
      getBranchById: (id) => get().branches.find(b => b.id === id),
      getUserById: (id) => get().users.find(u => u.id === id),

      getBranchStock: (branchId) => get().branchStock.filter(bs => bs.branchId === branchId),

      getSalesmanStock: (salesmanId) => get().salesmanStock.filter(ss => ss.salesmanId === salesmanId),

      getSalesmanSales: (salesmanId) => get().sales.filter(s => s.salesmanId === salesmanId),

      getBranchSales: (branchId) => get().sales.filter(s => s.branchId === branchId),

      getMonthlySales: (month, year, branchId?, salesmanId?) => {
        return get().sales.filter(s => {
          const saleDate = new Date(s.saleDate);
          const matchesMonth = saleDate.getMonth() === month && saleDate.getFullYear() === year;
          const matchesBranch = branchId ? s.branchId === branchId : true;
          const matchesSalesman = salesmanId ? s.salesmanId === salesmanId : true;
          return matchesMonth && matchesBranch && matchesSalesman;
        });
      },
    }),
    {
      name: 'stock-management-store',
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
