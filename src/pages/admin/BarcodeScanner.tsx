import { useState, useRef, useEffect } from 'react';
import { ScanLine, Search, Package, ShoppingCart, Clock, X, Tag, Layers, IndianRupee } from 'lucide-react';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

interface ScanResult {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category: string;
  scannedAt: Date;
}

export function BarcodeScanner() {
  const { products, fetchProducts } = useStore();
  const [query, setQuery] = useState('');
  const [currentProduct, setCurrentProduct] = useState<ScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<ScanResult[]>([]);
  const [quickBill, setQuickBill] = useState<{ product: ScanResult; qty: number }[]>([]);
  const [notFound, setNotFound] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProducts();
    inputRef.current?.focus();
  }, []);

  const handleScan = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || !query.trim()) return;
    const found = products.find(
      (p: any) => p.sku?.toLowerCase() === query.trim().toLowerCase() || p.barcode?.toLowerCase() === query.trim().toLowerCase() || p.name?.toLowerCase().includes(query.trim().toLowerCase())
    );
    if (found) {
      const result: ScanResult = {
        id: found.id,
        name: found.name,
        sku: (found as any).sku || (found as any).barcode || '-',
        price: (found as any).sellingPrice || (found as any).price || 0,
        stock: (found as any).quantity || (found as any).stock || 0,
        category: (found as any).category || '-',
        scannedAt: new Date(),
      };
      setCurrentProduct(result);
      setRecentScans(prev => [result, ...prev.filter(s => s.id !== result.id)].slice(0, 20));
      setNotFound(false);
    } else {
      setCurrentProduct(null);
      setNotFound(true);
    }
    setQuery('');
  };

  const addToBill = (product: ScanResult) => {
    setQuickBill(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromBill = (productId: string) => {
    setQuickBill(prev => prev.filter(i => i.product.id !== productId));
  };

  const billTotal = quickBill.reduce((s, i) => s + i.product.price * i.qty, 0);

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Barcode Scanner</h1>
          <p>Scan or enter SKU/barcode to find products</p>
        </div>
      </div>

      {/* Scanner Input */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f9fafb', borderRadius: 10, padding: '12px 16px', border: '2px solid #00a651' }}>
          <ScanLine size={24} color="#00a651" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleScan}
            placeholder="Scan barcode or type SKU and press Enter..."
            style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 18, fontWeight: 500, outline: 'none', color: '#111827' }}
          />
          <Search size={20} color="#9ca3af" />
        </div>
        {notFound && (
          <p style={{ marginTop: 12, color: '#dc2626', fontSize: 14, fontWeight: 500 }}>Product not found. Please try a different SKU or name.</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Product Details + Recent */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Current Product */}
          {currentProduct && (
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', borderLeft: '4px solid #00a651' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>{currentProduct.name}</h3>
                <span style={{ background: '#f3f4f6', padding: '4px 10px', borderRadius: 20, fontSize: 12, color: '#6b7280' }}>{currentProduct.category}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Tag size={16} color="#6b7280" />
                  <div><p style={{ fontSize: 11, color: '#9ca3af' }}>SKU</p><p style={{ fontSize: 15, fontWeight: 600, fontFamily: 'monospace' }}>{currentProduct.sku}</p></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <IndianRupee size={16} color="#6b7280" />
                  <div><p style={{ fontSize: 11, color: '#9ca3af' }}>Price</p><p style={{ fontSize: 15, fontWeight: 600, color: '#00a651' }}>{'\u20B9'}{currentProduct.price.toLocaleString()}</p></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Layers size={16} color="#6b7280" />
                  <div><p style={{ fontSize: 11, color: '#9ca3af' }}>Stock</p><p style={{ fontSize: 15, fontWeight: 600, color: currentProduct.stock < 10 ? '#dc2626' : '#111827' }}>{currentProduct.stock}</p></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Package size={16} color="#6b7280" />
                  <div><p style={{ fontSize: 11, color: '#9ca3af' }}>Category</p><p style={{ fontSize: 15, fontWeight: 600 }}>{currentProduct.category}</p></div>
                </div>
              </div>
              <button onClick={() => addToBill(currentProduct)} style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, background: '#00a651', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: 14, width: '100%', justifyContent: 'center' }}>
                <ShoppingCart size={16} /> Add to Quick Bill
              </button>
            </div>
          )}

          {/* Recent Scans */}
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><Clock size={18} color="#6b7280" /> Recent Scans</h3>
            {recentScans.length === 0 ? (
              <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: 20 }}>No scans yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentScans.map((s, i) => (
                  <div key={`${s.id}-${i}`} onClick={() => { setCurrentProduct(s); }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: '#f9fafb', cursor: 'pointer' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{s.name}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af' }}>{s.sku} | {s.scannedAt.toLocaleTimeString()}</p>
                    </div>
                    <span style={{ fontWeight: 600, color: '#00a651', fontSize: 14 }}>{'\u20B9'}{s.price}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: Quick Bill */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.1)', alignSelf: 'flex-start' }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={18} color="#00a651" /> Quick Bill</h3>
          {quickBill.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 14, textAlign: 'center', padding: 40 }}>Scan items to add to bill</p>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                {quickBill.map(item => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', borderRadius: 8, background: '#f9fafb' }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 500 }}>{item.product.name}</p>
                      <p style={{ fontSize: 12, color: '#9ca3af' }}>{'\u20B9'}{item.product.price} x {item.qty}</p>
                    </div>
                    <span style={{ fontWeight: 600, fontSize: 14, marginRight: 12 }}>{'\u20B9'}{(item.product.price * item.qty).toLocaleString()}</span>
                    <button onClick={() => removeFromBill(item.product.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={16} color="#dc2626" /></button>
                  </div>
                ))}
              </div>
              <div style={{ borderTop: '2px solid #f3f4f6', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>Total</span>
                <span style={{ fontSize: 24, fontWeight: 700, color: '#00a651' }}>{'\u20B9'}{billTotal.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
