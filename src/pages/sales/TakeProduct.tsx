import { useState } from 'react';
import { Package, Search, Plus, Minus, ShoppingBag, AlertCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Sales.css';

export function TakeProduct() {
  const {
    currentUser,
    branchStock,
    takeProductFromBranch,
    returnProductToBranch,
    salesmanStock,
    getProductById
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const branchId = currentUser?.branchId || '';
  const myBranchStock = branchStock.filter(bs => bs.branchId === branchId);
  const mySalesmanStock = salesmanStock.filter(ss => ss.salesmanId === currentUser?.id);

  const handleQuantityChange = (productId: string, value: number) => {
    setQuantities(prev => ({
      ...prev,
      [productId]: Math.max(0, value)
    }));
  };

  const handleTakeProduct = (productId: string) => {
    const qty = quantities[productId];
    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' });
      return;
    }

    const success = takeProductFromBranch(
      currentUser?.id || '',
      branchId,
      productId,
      qty
    );

    if (success) {
      setMessage({ type: 'success', text: 'Product taken successfully!' });
      setQuantities(prev => ({ ...prev, [productId]: 0 }));
    } else {
      setMessage({ type: 'error', text: 'Failed to take product. Check stock availability.' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const handleReturnProduct = (productId: string) => {
    const qty = quantities[productId];
    if (!qty || qty <= 0) {
      setMessage({ type: 'error', text: 'Please enter a valid quantity' });
      return;
    }

    const success = returnProductToBranch(
      currentUser?.id || '',
      branchId,
      productId,
      qty
    );

    if (success) {
      setMessage({ type: 'success', text: 'Product returned successfully!' });
      setQuantities(prev => ({ ...prev, [productId]: 0 }));
    } else {
      setMessage({ type: 'error', text: 'Failed to return product.' });
    }

    setTimeout(() => setMessage(null), 3000);
  };

  const filteredStock = myBranchStock.filter(bs => {
    const product = getProductById(bs.productId);
    return product?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           product?.sku.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>Take Product</h1>
          <p>Take products from branch stock</p>
        </div>
      </div>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-danger'} mb-4`}>
          <AlertCircle size={18} />
          {message.text}
        </div>
      )}

      {/* My Current Stock */}
      <div className="card mb-4">
        <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: '600' }}>My Current Stock</h3>
        {mySalesmanStock.length > 0 ? (
          <div className="my-stock-grid">
            {mySalesmanStock.map((ss) => {
              const product = getProductById(ss.productId);
              return (
                <div className="my-stock-item" key={ss.id}>
                  <div className="my-stock-info">
                    <span className="my-stock-name">{product?.name}</span>
                    <span className="my-stock-price">₹{product?.price} per {product?.unit}</span>
                  </div>
                  <div className="my-stock-qty">{ss.quantity}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <ShoppingBag size={48} className="empty-state-icon" />
            <p>No products with you. Take products from below.</p>
          </div>
        )}
      </div>

      {/* Branch Stock */}
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

      <div className="card">
        <h3 className="mb-4" style={{ fontSize: '16px', fontWeight: '600' }}>Branch Stock</h3>
        <div className="product-list">
          {filteredStock.map((bs) => {
            const product = getProductById(bs.productId);
            if (!product) return null;

            const myStock = mySalesmanStock.find(ss => ss.productId === bs.productId);
            const qty = quantities[bs.productId] || 0;

            return (
              <div className="product-list-item" key={bs.id}>
                <div className="product-list-info">
                  <Package size={24} className="product-list-icon" />
                  <div>
                    <div className="product-list-name">{product.name}</div>
                    <div className="product-list-meta">
                      {product.sku} • ₹{product.price} per {product.unit}
                    </div>
                  </div>
                </div>
                <div className="product-list-stock">
                  <div className="stock-info-box">
                    <span className="stock-label">Branch</span>
                    <span className={`stock-value ${bs.quantity < 5 ? 'low' : ''}`}>
                      {bs.quantity}
                    </span>
                  </div>
                  {myStock && (
                    <div className="stock-info-box">
                      <span className="stock-label">With Me</span>
                      <span className="stock-value mine">{myStock.quantity}</span>
                    </div>
                  )}
                </div>
                <div className="product-list-actions">
                  <div className="quantity-input">
                    <button
                      className="qty-btn"
                      onClick={() => handleQuantityChange(bs.productId, qty - 1)}
                    >
                      <Minus size={16} />
                    </button>
                    <input
                      type="number"
                      value={qty || ''}
                      onChange={(e) => handleQuantityChange(bs.productId, parseInt(e.target.value) || 0)}
                      placeholder="0"
                    />
                    <button
                      className="qty-btn"
                      onClick={() => handleQuantityChange(bs.productId, qty + 1)}
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => handleTakeProduct(bs.productId)}
                    disabled={!qty || bs.quantity < qty}
                  >
                    Take
                  </button>
                  {myStock && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleReturnProduct(bs.productId)}
                      disabled={!qty || myStock.quantity < qty}
                    >
                      Return
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
