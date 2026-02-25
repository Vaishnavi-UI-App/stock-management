
import { useState } from 'react';
import { Plus, Edit2, Trash2, Building2, Phone, MapPin, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Stock.css';

export function Branches() {
  const { branches, users, addBranch, updateBranch, deleteBranch, getUserById } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingBranch, setEditingBranch] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    managerId: ''
  });

  const branchManagers = users.filter(u => u.role === 'branch_manager');

  const handleOpenModal = (branchId?: string) => {
    if (branchId) {
      const branch = branches.find(b => b.id === branchId);
      if (branch) {
        setFormData({
          name: branch.name,
          address: branch.address,
          phone: branch.phone,
          managerId: branch.managerId || ''
        });
        setEditingBranch(branchId);
      }
    } else {
      setFormData({
        name: '',
        address: '',
        phone: '',
        managerId: ''
      });
      setEditingBranch(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBranch(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const branchData = {
      name: formData.name,
      address: formData.address,
      phone: formData.phone,
      managerId: formData.managerId || undefined
    };

    if (editingBranch) {
      updateBranch(editingBranch, branchData);
    } else {
      addBranch(branchData);
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this branch? This will also delete all stock records for this branch.')) {
      deleteBranch(id);
    }
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Branches</h1>
          <p>Manage company branches</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Add Branch
        </button>
      </div>

      <div className="grid grid-cols-3">
        {branches.map((branch) => {
          const manager = getUserById(branch.managerId || '');
          const salesmen = users.filter(u => u.role === 'salesman' && u.branchId === branch.id);

          return (
            <div className="entity-card" key={branch.id} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
                <div className="entity-avatar" style={{ background: 'var(--primary)' }}>
                  <Building2 size={24} />
                </div>
                <div className="entity-info">
                  <div className="entity-name">{branch.name}</div>
                  <div className="entity-detail" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <MapPin size={14} />
                    {branch.address}
                  </div>
                  <div className="entity-detail" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Phone size={14} />
                    {branch.phone}
                  </div>
                </div>
              </div>

              <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--gray-100)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div className="text-sm text-gray-500">Manager</div>
                    <div className="font-medium">{manager?.name || 'Not Assigned'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Salesmen</div>
                    <div className="font-medium">{salesmen.length}</div>
                  </div>
                </div>
                <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => handleOpenModal(branch.id)}
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => handleDelete(branch.id)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingBranch ? 'Edit Branch' : 'Add New Branch'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">Branch Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Mumbai Branch"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <textarea
                    className="form-input"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Full address"
                    rows={2}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input
                    type="tel"
                    className="form-input"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="e.g., 022-12345678"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Branch Manager</label>
                  <select
                    className="form-select"
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                  >
                    <option value="">Select Manager</option>
                    {branchManagers.map((manager) => (
                      <option key={manager.id} value={manager.id}>
                        {manager.name} ({manager.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingBranch ? 'Update Branch' : 'Add Branch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
