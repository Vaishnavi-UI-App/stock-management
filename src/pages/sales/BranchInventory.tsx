import { useState } from 'react';
import { Search, AlertTriangle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Sales.css';

export function BranchInventory() {
  const { currentUser, branchStock, products, getProductById, getBranchById } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const branchId = currentUser?.branchId || '';
  const branch = getBranchById(branchId);
  const myBranchStock = branchStock.filter(bs => bs.branchId === branchId);

  // Get unique categories
  const categories = [...new Set(products.map(p => p.category))];

  // Calculate totals
  const totalItems = myBranchStock.reduce((sum, bs) => sum + bs.quantity, 0);
  const totalValue = myBranchStock.reduce((sum, bs) => {
    const product = getProductById(bs.productId);
    return sum + (product?.price || 0) * bs.quantity;
  }, 0);
  const lowStockCount = myBranchStock.filter(bs => bs.quantity < 10 && bs.quantity > 0).length;

  // Filter stock
  const filteredStock = myBranchStock.filter(bs => {
    const product = getProductById(bs.productId);
    if (!product) return false;

    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter ? product.category === categoryFilter : true;

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>Branch Inventory</h1>
          <p>{branch?.name}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="sales-stats">
        <div className="sales-stat">
          <div className="sales-stat-value">{myBranchStock.filter(bs => bs.quantity > 0).length}</div>
          <div className="sales-stat-label">Products in Stock</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">{totalItems.toLocaleString()}</div>
          <div className="sales-stat-label">Total Items</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">₹{totalValue.toLocaleString()}</div>
          <div className="sales-stat-label">Stock Value</div>
        </div>
        <div className="sales-stat" style={{ background: lowStockCount > 0 ? 'rgba(239, 68, 68, 0.1)' : undefined }}>
          <div className="sales-stat-value" style={{ color: lowStockCount > 0 ? 'var(--danger)' : undefined }}>
            {lowStockCount}
          </div>
          <div className="sales-stat-label">Low Stock Items</div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockCount > 0 && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={20} />
          <span>
            {lowStockCount} product(s) are running low on stock. Contact head office for replenishment.
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        <select
          className="form-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          style={{ maxWidth: '200px' }}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="search-bar">
        <Search size={20} />
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-input"
        />
      </div>

      {/* Stock Grid */}
      <div className="stock-cards-grid">
        {filteredStock.map((bs) => {
          const product = getProductById(bs.productId);
          if (!product) return null;

          const value = product.price * bs.quantity;
          const status = bs.quantity === 0 ? 'out' : bs.quantity < 10 ? 'low' : bs.quantity < 20 ? 'warning' : '';

          return (
            <div className="stock-card" key={bs.id}>
              <div className="stock-card-header">
                <div>
                  <div className="stock-card-title">{product.name}</div>
                  <div className="stock-card-sku">{product.sku}</div>
                </div>
                <span className="stock-card-category">{product.category}</span>
              </div>
              <div className="stock-card-body">
                <div>
                  <span className={`stock-card-qty ${status}`}>
                    {bs.quantity}
                    <span className="stock-card-unit">{product.unit}</span>
                  </span>
                  {status === 'out' && (
                    <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>
                      Out of Stock
                    </div>
                  )}
                  {status === 'low' && (
                    <div style={{ fontSize: '12px', color: 'var(--warning)', marginTop: '4px' }}>
                      Low Stock
                    </div>
                  )}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="stock-card-price">₹{product.price}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                    Value: ₹{value.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
