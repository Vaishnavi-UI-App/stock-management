import { useState } from 'react';
import { Package, Search, Plus, Minus, Save } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Stock.css';

export function CompanyStock() {
  const { products, companyStock, updateCompanyStock, getProductById } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [stockUpdates, setStockUpdates] = useState<Record<string, number>>({});

  const handleStockChange = (productId: string, value: number) => {
    setStockUpdates(prev => ({
      ...prev,
      [productId]: value
    }));
  };

  const handleUpdateStock = (productId: string) => {
    const currentStock = companyStock.find(cs => cs.productId === productId);
    const updateValue = stockUpdates[productId];

    if (updateValue !== undefined && currentStock) {
      const newQuantity = currentStock.quantity + updateValue;
      if (newQuantity >= 0) {
        updateCompanyStock(productId, newQuantity);
        setStockUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[productId];
          return newUpdates;
        });
      }
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity < 20) return 'low';
    if (quantity < 50) return 'warning';
    return '';
  };

  const filteredStock = companyStock.filter(cs => {
    const product = getProductById(cs.productId);
    return product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const totalValue = companyStock.reduce((sum, cs) => {
    const product = getProductById(cs.productId);
    return sum + (product?.price || 0) * cs.quantity;
  }, 0);

  const totalItems = companyStock.reduce((sum, cs) => sum + cs.quantity, 0);

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Company Stock</h1>
          <p>Manage main warehouse inventory</p>
        </div>
      </div>

      <div className="stats-grid mb-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb' }}>
            <Package size={24} />
          </div>
          <div className="stat-card-value">{products.length}</div>
          <div className="stat-card-label">Total Products</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <Package size={24} />
          </div>
          <div className="stat-card-value">{totalItems.toLocaleString()}</div>
          <div className="stat-card-label">Total Items</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-icon" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
            <Package size={24} />
          </div>
          <div className="stat-card-value">₹{totalValue.toLocaleString()}</div>
          <div className="stat-card-label">Total Value</div>
        </div>
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

      <div className="stock-cards-grid">
        {filteredStock.map((cs) => {
          const product = getProductById(cs.productId);
          if (!product) return null;

          const updateValue = stockUpdates[cs.productId] || 0;
          const status = getStockStatus(cs.quantity);

          return (
            <div className="stock-card" key={cs.id}>
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
                    {cs.quantity}
                    <span className="stock-card-unit">{product.unit}</span>
                  </span>
                </div>
                <span className="stock-card-price">₹{product.price}</span>
              </div>
              <div className="stock-update-form">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleStockChange(cs.productId, (updateValue || 0) - 10)}
                >
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  className="form-input"
                  value={updateValue || ''}
                  onChange={(e) => handleStockChange(cs.productId, parseInt(e.target.value) || 0)}
                  placeholder="0"
                />
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleStockChange(cs.productId, (updateValue || 0) + 10)}
                >
                  <Plus size={14} />
                </button>
                <button
                  className="btn btn-sm btn-primary"
                  onClick={() => handleUpdateStock(cs.productId)}
                  disabled={!updateValue}
                >
                  <Save size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
