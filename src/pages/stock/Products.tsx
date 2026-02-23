import { useState } from 'react';
import { Plus, Edit2, Trash2, Package, Search, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Stock.css';

export function Products() {
  const { products, addProduct, updateProduct, deleteProduct } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    sku: '', // HSN Code
    category: '',
    price: '',
    mrp: '',
    unit: '',
    caseQty: '',
    gstRate: '5',
    description: '',
    batchNo: '',
    mfgDate: '',
    expDate: ''
  });

  const categories = ['Fertilizer', 'NPK', 'Micro Nutrients', 'Organic', 'Other'];
  const units = ['1KG', '2.5KG', '5KG', '10KG', '25KG', '500GM', '250GM'];

  const handleOpenModal = (productId?: string) => {
    if (productId) {
      const product = products.find(p => p.id === productId);
      if (product) {
        setFormData({
          name: product.name,
          sku: product.sku,
          category: product.category,
          price: product.price.toString(),
          mrp: product.mrp?.toString() || '',
          unit: product.unit,
          caseQty: product.caseQty?.toString() || '',
          gstRate: product.gstRate?.toString() || '5',
          description: product.description || '',
          batchNo: (product as any).batchNo || '',
          mfgDate: (product as any).mfgDate ? (product as any).mfgDate.split('T')[0] : '',
          expDate: product.expDate ? product.expDate.split('T')[0] : ''
        });
        setEditingProduct(productId);
      }
    } else {
      setFormData({
        name: '',
        sku: '',
        category: '',
        price: '',
        mrp: '',
        unit: '',
        caseQty: '',
        gstRate: '5',
        description: '',
        batchNo: '',
        mfgDate: '',
        expDate: ''
      });
      setEditingProduct(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
    setFormData({
      name: '',
      sku: '',
      category: '',
      price: '',
      mrp: '',
      unit: '',
      caseQty: '',
      gstRate: '5',
      description: '',
      batchNo: '',
      mfgDate: '',
      expDate: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const productData = {
      name: formData.name,
      sku: formData.sku,
      category: formData.category,
      price: parseFloat(formData.price),
      mrp: formData.mrp ? parseFloat(formData.mrp) : undefined,
      unit: formData.unit,
      caseQty: parseInt(formData.caseQty) || 1,
      gstRate: parseFloat(formData.gstRate) || 5,
      description: formData.description,
      batchNo: formData.batchNo || undefined,
      mfgDate: formData.mfgDate ? new Date(formData.mfgDate).toISOString() : undefined,
      expDate: formData.expDate ? new Date(formData.expDate).toISOString() : undefined
    };

    if (editingProduct) {
      updateProduct(editingProduct, productData);
    } else {
      addProduct(productData);
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      deleteProduct(id);
    }
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Products</h1>
          <p>Manage your product catalog</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Add Product
        </button>
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

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>HSN Code</th>
                <th>Packing</th>
                <th>Case Qty</th>
                <th>GST %</th>
                <th>Price (incl GST)</th>
                <th>MRP</th>
                <th>Batch No</th>
                <th>MFG Date</th>
                <th>Exp Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.length > 0 ? (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name">
                        <Package size={18} />
                        <span>{product.name}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-primary">{product.sku}</span>
                    </td>
                    <td>{product.unit}</td>
                    <td>{product.caseQty || '-'}</td>
                    <td>{product.gstRate || 5}%</td>
                    <td>₹{product.price.toLocaleString()}</td>
                    <td>{product.mrp ? `₹${product.mrp.toLocaleString()}` : '-'}</td>
                    <td>{(product as any).batchNo || '-'}</td>
                    <td>
                      {(product as any).mfgDate ? (
                        <span className="badge badge-primary">
                          {new Date((product as any).mfgDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      {product.expDate ? (
                        <span className={`badge ${new Date(product.expDate) < new Date() ? 'badge-danger' : 'badge-primary'}`}>
                          {new Date(product.expDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      ) : '-'}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn btn-sm btn-secondary"
                          onClick={() => handleOpenModal(product.id)}
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(product.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="text-center text-gray-500">
                    No products found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Product Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., NUTRIX 12*61.00"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">HSN Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      placeholder="e.g., 31054000"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Category</label>
                    <select
                      className="form-select"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      required
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Packing (Unit)</label>
                    <select
                      className="form-select"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                      required
                    >
                      <option value="">Select packing</option>
                      {units.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Case Qty</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.caseQty}
                      onChange={(e) => setFormData({ ...formData, caseQty: e.target.value })}
                      placeholder="e.g., 15"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">GST Rate (%)</label>
                    <select
                      className="form-select"
                      value={formData.gstRate}
                      onChange={(e) => setFormData({ ...formData, gstRate: e.target.value })}
                      required
                    >
                      <option value="0">0%</option>
                      <option value="5">5%</option>
                      <option value="12">12%</option>
                      <option value="18">18%</option>
                      <option value="28">28%</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Price (incl GST) ₹</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">MRP (₹) - Optional</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.mrp}
                      onChange={(e) => setFormData({ ...formData, mrp: e.target.value })}
                      placeholder="Maximum Retail Price"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Batch No - Optional</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.batchNo}
                      onChange={(e) => setFormData({ ...formData, batchNo: e.target.value })}
                      placeholder="e.g., B2024-001"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Manufacturing Date - Optional</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.mfgDate}
                      onChange={(e) => setFormData({ ...formData, mfgDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Expiry Date - Optional</label>
                    <input
                      type="date"
                      className="form-input"
                      value={formData.expDate}
                      onChange={(e) => setFormData({ ...formData, expDate: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Product description (optional)"
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingProduct ? 'Update Product' : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
