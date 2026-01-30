import { useState } from 'react';
import { Package, Search, Truck, X, Building2, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Stock.css';

type TransferType = 'company-to-branch' | 'branch-to-branch';

export function BranchStock() {
  const {
    products,
    branches,
    companyStock,
    branchStock,
    transferStockToBranch,
    transferBranchToBranch,
    getProductById,
    currentUser
  } = useStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [transferType, setTransferType] = useState<TransferType>('company-to-branch');
  const [sourceBranch, setSourceBranch] = useState<string>('');
  const [targetBranch, setTargetBranch] = useState<string>('');
  const [transferQty, setTransferQty] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenTransfer = (productId: string) => {
    setSelectedProduct(productId);
    setTransferType('company-to-branch');
    setSourceBranch('');
    setTargetBranch('');
    setTransferQty('');
    setError('');
    setShowTransferModal(true);
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const qty = parseInt(transferQty);
    if (!qty || qty <= 0) {
      setError('Please enter a valid quantity');
      setIsLoading(false);
      return;
    }

    try {
      if (transferType === 'company-to-branch') {
        const companyStockItem = companyStock.find(cs => cs.productId === selectedProduct);
        if (!companyStockItem || companyStockItem.quantity < qty) {
          setError('Insufficient stock in company warehouse');
          setIsLoading(false);
          return;
        }

        const success = await transferStockToBranch(
          selectedProduct,
          targetBranch,
          qty,
          currentUser?.id || ''
        );

        if (success) {
          setShowTransferModal(false);
        } else {
          setError('Transfer failed. Please try again.');
        }
      } else {
        // Branch to branch transfer
        if (sourceBranch === targetBranch) {
          setError('Source and destination branches cannot be the same');
          setIsLoading(false);
          return;
        }

        const sourceStock = branchStock.find(bs => bs.branchId === sourceBranch && bs.productId === selectedProduct);
        if (!sourceStock || sourceStock.quantity < qty) {
          setError('Insufficient stock in source branch');
          setIsLoading(false);
          return;
        }

        const success = await transferBranchToBranch(
          selectedProduct,
          sourceBranch,
          targetBranch,
          qty,
          currentUser?.id || ''
        );

        if (success) {
          setShowTransferModal(false);
        } else {
          setError('Transfer failed. Please try again.');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Transfer failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getBranchStockForProduct = (branchId: string, productId: string) => {
    const stock = branchStock.find(bs => bs.branchId === branchId && bs.productId === productId);
    return stock?.quantity || 0;
  };

  const getSourceBranchStock = () => {
    if (!sourceBranch || !selectedProduct) return 0;
    return getBranchStockForProduct(sourceBranch, selectedProduct);
  };

  const getTargetBranchStock = () => {
    if (!targetBranch || !selectedProduct) return 0;
    return getBranchStockForProduct(targetBranch, selectedProduct);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Branch Stock</h1>
          <p>Transfer stock to branches and view branch inventory</p>
        </div>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
        >
          <option value="">All Branches</option>
          {branches.map(branch => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
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

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Company Stock</th>
                {selectedBranch ? (
                  <th>Branch Stock</th>
                ) : (
                  branches.map(branch => (
                    <th key={branch.id}>{branch.name.split(' ')[0]}</th>
                  ))
                )}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => {
                const companyStockItem = companyStock.find(cs => cs.productId === product.id);
                const companyQty = companyStockItem?.quantity || 0;

                return (
                  <tr key={product.id}>
                    <td>
                      <div className="product-name">
                        <Package size={18} />
                        <div>
                          <div>{product.name}</div>
                          <small className="text-gray-500">{product.sku}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${companyQty < 20 ? 'badge-danger' : companyQty < 50 ? 'badge-warning' : 'badge-success'}`}>
                        {companyQty} {product.unit}
                      </span>
                    </td>
                    {selectedBranch ? (
                      <td>
                        <span className="badge badge-primary">
                          {getBranchStockForProduct(selectedBranch, product.id)} {product.unit}
                        </span>
                      </td>
                    ) : (
                      branches.map(branch => (
                        <td key={branch.id}>
                          <span className="badge badge-primary">
                            {getBranchStockForProduct(branch.id, product.id)}
                          </span>
                        </td>
                      ))
                    )}
                    <td>
                      <button
                        className="btn btn-sm btn-primary"
                        onClick={() => handleOpenTransfer(product.id)}
                      >
                        <Truck size={14} />
                        Transfer
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Transfer Stock</h3>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleTransfer}>
              <div className="modal-body">
                {error && (
                  <div className="alert alert-danger mb-4">{error}</div>
                )}

                <div className="form-group">
                  <label className="form-label">Product</label>
                  <div className="product-name" style={{ padding: '12px', background: 'var(--gray-50)', borderRadius: 'var(--radius)' }}>
                    <Package size={18} />
                    <span>{getProductById(selectedProduct)?.name}</span>
                  </div>
                </div>

                {/* Transfer Type Selection */}
                <div className="form-group">
                  <label className="form-label">Transfer Type</label>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <label
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${transferType === 'company-to-branch' ? 'var(--primary)' : 'var(--gray-200)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        background: transferType === 'company-to-branch' ? 'var(--primary-light)' : 'white',
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="radio"
                        name="transferType"
                        value="company-to-branch"
                        checked={transferType === 'company-to-branch'}
                        onChange={() => {
                          setTransferType('company-to-branch');
                          setSourceBranch('');
                        }}
                        style={{ display: 'none' }}
                      />
                      <Building2 size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                      <div style={{ fontWeight: 500 }}>Company to Branch</div>
                      <small style={{ color: 'var(--gray-500)' }}>
                        Available: {companyStock.find(cs => cs.productId === selectedProduct)?.quantity || 0} {getProductById(selectedProduct)?.unit}
                      </small>
                    </label>
                    <label
                      style={{
                        flex: 1,
                        padding: '16px',
                        border: `2px solid ${transferType === 'branch-to-branch' ? 'var(--primary)' : 'var(--gray-200)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer',
                        background: transferType === 'branch-to-branch' ? 'var(--primary-light)' : 'white',
                        textAlign: 'center'
                      }}
                    >
                      <input
                        type="radio"
                        name="transferType"
                        value="branch-to-branch"
                        checked={transferType === 'branch-to-branch'}
                        onChange={() => setTransferType('branch-to-branch')}
                        style={{ display: 'none' }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', marginBottom: '8px' }}>
                        <Building2 size={20} style={{ color: 'var(--primary)' }} />
                        <ArrowRight size={16} style={{ color: 'var(--gray-400)' }} />
                        <Building2 size={20} style={{ color: 'var(--primary)' }} />
                      </div>
                      <div style={{ fontWeight: 500 }}>Branch to Branch</div>
                      <small style={{ color: 'var(--gray-500)' }}>Transfer between branches</small>
                    </label>
                  </div>
                </div>

                {/* Source Branch (only for branch-to-branch) */}
                {transferType === 'branch-to-branch' && (
                  <div className="form-group">
                    <label className="form-label">Source Branch</label>
                    <div className="branch-select-grid">
                      {branches.map(branch => {
                        const branchQty = getBranchStockForProduct(branch.id, selectedProduct);
                        return (
                          <div
                            key={branch.id}
                            className={`branch-select-item ${sourceBranch === branch.id ? 'selected' : ''}`}
                            onClick={() => {
                              setSourceBranch(branch.id);
                              if (targetBranch === branch.id) setTargetBranch('');
                            }}
                            style={{ opacity: branchQty === 0 ? 0.5 : 1 }}
                          >
                            <Building2 size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                            <span>{branch.name.split(' - ')[0]}</span>
                            <small style={{ color: 'var(--gray-500)', marginTop: '4px' }}>
                              Stock: {branchQty}
                            </small>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Target Branch */}
                <div className="form-group">
                  <label className="form-label">
                    {transferType === 'company-to-branch' ? 'Select Branch' : 'Destination Branch'}
                  </label>
                  <div className="branch-select-grid">
                    {branches
                      .filter(branch => transferType === 'company-to-branch' || branch.id !== sourceBranch)
                      .map(branch => {
                        const branchQty = getBranchStockForProduct(branch.id, selectedProduct);
                        return (
                          <div
                            key={branch.id}
                            className={`branch-select-item ${targetBranch === branch.id ? 'selected' : ''}`}
                            onClick={() => setTargetBranch(branch.id)}
                          >
                            <Building2 size={24} style={{ marginBottom: '8px', color: 'var(--primary)' }} />
                            <span>{branch.name.split(' - ')[0]}</span>
                            <small style={{ color: 'var(--gray-500)', marginTop: '4px' }}>
                              Current: {branchQty}
                            </small>
                          </div>
                        );
                      })}
                  </div>
                </div>

                {/* Stock Summary for Branch-to-Branch */}
                {transferType === 'branch-to-branch' && sourceBranch && targetBranch && (
                  <div style={{
                    padding: '16px',
                    background: 'var(--gray-50)',
                    borderRadius: 'var(--radius)',
                    marginBottom: '16px'
                  }}>
                    <div style={{ fontWeight: 500, marginBottom: '12px' }}>Stock Summary</div>
                    <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--gray-500)', fontSize: '12px' }}>
                          {branches.find(b => b.id === sourceBranch)?.name.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--danger)' }}>
                          {getSourceBranchStock()}
                        </div>
                        <div style={{ color: 'var(--gray-400)', fontSize: '12px' }}>Source</div>
                      </div>
                      <ArrowRight size={24} style={{ color: 'var(--gray-300)' }} />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: 'var(--gray-500)', fontSize: '12px' }}>
                          {branches.find(b => b.id === targetBranch)?.name.split(' ')[0]}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--success)' }}>
                          {getTargetBranchStock()}
                        </div>
                        <div style={{ color: 'var(--gray-400)', fontSize: '12px' }}>Destination</div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Quantity to Transfer</label>
                  <input
                    type="number"
                    className="form-input"
                    value={transferQty}
                    onChange={(e) => setTransferQty(e.target.value)}
                    placeholder="Enter quantity"
                    min="1"
                    max={transferType === 'company-to-branch'
                      ? companyStock.find(cs => cs.productId === selectedProduct)?.quantity
                      : getSourceBranchStock()
                    }
                    required
                  />
                  {transferType === 'branch-to-branch' && sourceBranch && (
                    <small style={{ color: 'var(--gray-500)', marginTop: '4px', display: 'block' }}>
                      Max available: {getSourceBranchStock()} {getProductById(selectedProduct)?.unit}
                    </small>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={
                    isLoading ||
                    !targetBranch ||
                    !transferQty ||
                    (transferType === 'branch-to-branch' && !sourceBranch)
                  }
                >
                  {isLoading ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Truck size={18} />
                      Transfer Stock
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
