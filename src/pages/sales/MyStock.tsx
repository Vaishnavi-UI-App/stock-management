import { ShoppingBag } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { useLanguage } from '../../i18n/useLanguage';
import './Sales.css';

export function MyStock() {
  const { currentUser, salesmanStock, getProductById } = useStore();
  const { t } = useLanguage();

  const mySalesmanStock = salesmanStock.filter(ss => ss.salesmanId === currentUser?.id);

  // Calculate totals
  const totalItems = mySalesmanStock.reduce((sum, ss) => sum + ss.quantity, 0);
  const totalValue = mySalesmanStock.reduce((sum, ss) => {
    const product = getProductById(ss.productId);
    return sum + (product?.price || 0) * ss.quantity;
  }, 0);

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>{t.myStock}</h1>
          <p>{t.productsCurrentlyWithYou}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="sales-stats">
        <div className="sales-stat">
          <div className="sales-stat-value">{mySalesmanStock.length}</div>
          <div className="sales-stat-label">{t.productTypes}</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">{totalItems}</div>
          <div className="sales-stat-label">{t.totalItems}</div>
        </div>
        <div className="sales-stat">
          <div className="sales-stat-value">₹{totalValue.toLocaleString()}</div>
          <div className="sales-stat-label">{t.totalValue}</div>
        </div>
      </div>

      {/* Stock Grid */}
      {mySalesmanStock.length > 0 ? (
        <div className="stock-cards-grid">
          {mySalesmanStock.map((ss) => {
            const product = getProductById(ss.productId);
            if (!product) return null;

            const value = product.price * ss.quantity;

            return (
              <div className="stock-card" key={ss.id}>
                <div className="stock-card-header">
                  <div>
                    <div className="stock-card-title">{product.name}</div>
                    <div className="stock-card-sku">{product.sku}</div>
                  </div>
                  <span className="stock-card-category">{product.category}</span>
                </div>
                <div className="stock-card-body">
                  <div>
                    <span className="stock-card-qty">
                      {ss.quantity}
                      <span className="stock-card-unit">{product.unit}</span>
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="stock-card-price">₹{product.price}</div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                      {t.value}: ₹{value.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <ShoppingBag size={64} className="empty-state-icon" />
            <h3 className="empty-state-title">{t.noProductsWithYou}</h3>
            <p className="empty-state-text">
              {t.goToTakeProduct}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
