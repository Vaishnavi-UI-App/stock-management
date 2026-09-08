import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Edit2, Trash2, X, ShieldCheck, Users as UsersIcon,
  AlertTriangle, CheckSquare, Square
} from 'lucide-react';
import { rolesApi } from '../../services/api';
import { MODULE_KEYS, MODULE_LABELS } from '../../constants/modules';
import type { Role, PermissionsMap, DataScope, User, PermissionAction } from '../../types';
import './Stock.css';

const ACTIONS: PermissionAction[] = ['view', 'create', 'edit', 'delete'];

const DATA_SCOPE_LABELS: Record<DataScope, string> = {
  all: 'All data',
  own_branch: 'Own branch only',
  own_records: 'Own records only',
};

function emptyPermissions(): PermissionsMap {
  const perms: PermissionsMap = {};
  for (const key of MODULE_KEYS) {
    perms[key] = { view: false, create: false, edit: false, delete: false };
  }
  return perms;
}

interface RoleFormData {
  name: string;
  description: string;
  dataScope: DataScope;
  isFieldStaff: boolean;
  permissions: PermissionsMap;
}

function defaultFormData(): RoleFormData {
  return { name: '', description: '', dataScope: 'own_records', isFieldStaff: false, permissions: emptyPermissions() };
}

export function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [formData, setFormData] = useState<RoleFormData>(defaultFormData());
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [bulkRoleId, setBulkRoleId] = useState('');
  const [assigning, setAssigning] = useState(false);

  const loadRoles = useCallback(async () => {
    try {
      const data = await rolesApi.getAll();
      setRoles(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load roles');
    }
  }, []);

  const loadUnassigned = useCallback(async () => {
    try {
      const data = await rolesApi.getUnassignedUsers();
      setUnassignedUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load unassigned users');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadRoles(), loadUnassigned()]).finally(() => setLoading(false));
  }, [loadRoles, loadUnassigned]);

  const handleOpenModal = (role?: Role) => {
    if (role) {
      setEditingRole(role);
      const permissions = emptyPermissions();
      for (const key of MODULE_KEYS) {
        if (role.permissions?.[key]) {
          permissions[key] = { ...permissions[key], ...role.permissions[key] };
        }
      }
      setFormData({
        name: role.name,
        description: role.description || '',
        dataScope: role.dataScope,
        isFieldStaff: role.isFieldStaff,
        permissions,
      });
    } else {
      setEditingRole(null);
      setFormData(defaultFormData());
    }
    setFormError(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRole(null);
    setFormError(null);
    setSaving(false);
  };

  const togglePermission = (module: string, action: PermissionAction) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [module]: {
          ...prev.permissions[module],
          [action]: !prev.permissions[module][action],
        },
      },
    }));
  };

  const toggleRow = (module: string) => {
    setFormData(prev => {
      const row = prev.permissions[module];
      const allOn = ACTIONS.every(a => row[a]);
      const next: Record<PermissionAction, boolean> = { view: !allOn, create: !allOn, edit: !allOn, delete: !allOn };
      return { ...prev, permissions: { ...prev.permissions, [module]: next } };
    });
  };

  const toggleColumn = (action: PermissionAction) => {
    setFormData(prev => {
      const allOn = MODULE_KEYS.every(key => prev.permissions[key][action]);
      const permissions: PermissionsMap = {};
      for (const key of MODULE_KEYS) {
        permissions[key] = { ...prev.permissions[key], [action]: !allOn };
      }
      return { ...prev, permissions };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const payload = {
        name: formData.name,
        description: formData.description || undefined,
        dataScope: formData.dataScope,
        isFieldStaff: formData.isFieldStaff,
        permissions: formData.permissions,
      };
      if (editingRole) {
        await rolesApi.update(editingRole.id, payload);
      } else {
        await rolesApi.create(payload);
      }
      await loadRoles();
      handleCloseModal();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save role. Please try again.');
      setSaving(false);
    }
  };

  const handleDelete = async (role: Role) => {
    if (role.isSystem) return;
    if (!window.confirm(`Delete role "${role.name}"? This cannot be undone.`)) return;
    try {
      await rolesApi.delete(role.id);
      await loadRoles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete role.');
    }
  };

  const toggleUserSelected = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const toggleSelectAllUnassigned = () => {
    setSelectedUserIds(prev =>
      prev.length === unassignedUsers.length ? [] : unassignedUsers.map(u => u.id)
    );
  };

  const handleBulkAssign = async () => {
    if (!bulkRoleId || selectedUserIds.length === 0) return;
    setAssigning(true);
    try {
      await rolesApi.assignUsers(bulkRoleId, selectedUserIds);
      setSelectedUserIds([]);
      await Promise.all([loadRoles(), loadUnassigned()]);
    } catch (err: any) {
      alert(err.message || 'Failed to assign role.');
    } finally {
      setAssigning(false);
    }
  };

  if (loading) {
    return <div className="stock-page"><div className="loading">Loading roles...</div></div>;
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Roles</h1>
          <p>Manage roles and permissions</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Add Role
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee', border: '1px solid #c00', color: '#c00', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
          {error}
        </div>
      )}

      {/* Prominent "Users with no role" panel — shown first since right after
          this RBAC migration ships most non-admin users will land here and
          need fast reassignment. */}
      {unassignedUsers.length > 0 && !bannerDismissed && (
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={22} style={{ color: '#d97706', flexShrink: 0 }} />
              <div>
                <h3 style={{ margin: 0, fontSize: '16px', color: '#92400e' }}>
                  {unassignedUsers.length} user{unassignedUsers.length !== 1 ? 's' : ''} with no role assigned
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#92400e' }}>
                  These users currently have no permissions. Assign them a role below.
                </p>
              </div>
            </div>
            <button className="btn btn-sm btn-secondary" onClick={() => setBannerDismissed(true)}>
              <X size={14} />
            </button>
          </div>

          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '36px' }}>
                    <input
                      type="checkbox"
                      checked={selectedUserIds.length === unassignedUsers.length && unassignedUsers.length > 0}
                      onChange={toggleSelectAllUnassigned}
                    />
                  </th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {unassignedUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUserIds.includes(u.id)}
                        onChange={() => toggleUserSelected(u.id)}
                      />
                    </td>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <select
              className="form-select"
              style={{ maxWidth: '260px' }}
              value={bulkRoleId}
              onChange={(e) => setBulkRoleId(e.target.value)}
            >
              <option value="">Select role to assign...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <button
              className="btn btn-primary"
              disabled={!bulkRoleId || selectedUserIds.length === 0 || assigning}
              onClick={handleBulkAssign}
            >
              {assigning ? 'Assigning...' : `Bulk Assign (${selectedUserIds.length})`}
            </button>
          </div>
        </div>
      )}

      {/* Roles list */}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Data Scope</th>
              <th>Users</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {roles.map(role => (
              <tr key={role.id}>
                <td>
                  <div style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck size={16} style={{ color: '#6366f1' }} />
                    {role.name}
                  </div>
                  {role.description && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{role.description}</div>
                  )}
                </td>
                <td>
                  <span className="badge badge-info">{DATA_SCOPE_LABELS[role.dataScope]}</span>
                  {role.isFieldStaff && (
                    <span className="badge badge-info" style={{ marginLeft: '6px' }}>Field staff</span>
                  )}
                </td>
                <td>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <UsersIcon size={14} style={{ color: '#94a3b8' }} />
                    {role.userCount ?? 0}
                  </span>
                </td>
                <td>
                  {role.isSystem ? (
                    <span className="badge badge-primary">Administrator</span>
                  ) : (
                    <span className="badge badge-success">Custom</span>
                  )}
                </td>
                <td>
                  <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                    <button className="btn btn-sm btn-secondary" onClick={() => handleOpenModal(role)}>
                      <Edit2 size={14} />
                    </button>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => handleDelete(role)}
                      disabled={role.isSystem}
                      title={role.isSystem ? 'The Administrator role cannot be deleted' : undefined}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {roles.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                  No roles yet. Click "Add Role" to create one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">{editingRole ? 'Edit Role' : 'Add New Role'}</h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {formError && (
                  <div style={{ background: '#fee', border: '1px solid #c00', color: '#c00', padding: '10px 14px', borderRadius: '6px', marginBottom: '16px', fontSize: '14px' }}>
                    {formError}
                  </div>
                )}

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Regional Sales Lead"
                      disabled={!!editingRole?.isSystem}
                      required
                    />
                    {editingRole?.isSystem && (
                      <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                        The Administrator role's name cannot be changed.
                      </p>
                    )}
                  </div>
                  <div className="form-group">
                    <label className="form-label">Data Scope</label>
                    <select
                      className="form-select"
                      value={formData.dataScope}
                      onChange={(e) => setFormData({ ...formData, dataScope: e.target.value as DataScope })}
                    >
                      <option value="all">All data</option>
                      <option value="own_records">Own records only</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={formData.isFieldStaff}
                      onChange={(e) => setFormData({ ...formData, isFieldStaff: e.target.checked })}
                    />
                    Field staff (tracked on Route Tracking, can use "My Route")
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description of this role"
                    rows={2}
                  />
                </div>

                <div style={{ marginTop: '20px' }}>
                  <h4 style={{ margin: '0 0 12px', fontSize: '14px', color: '#334155' }}>Permissions</h4>
                  <div className="table-container">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Module</th>
                          {ACTIONS.map(action => (
                            <th key={action} style={{ textAlign: 'center', cursor: 'pointer', textTransform: 'capitalize' }} onClick={() => toggleColumn(action)}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                {action}
                                {MODULE_KEYS.every(key => formData.permissions[key][action])
                                  ? <CheckSquare size={14} />
                                  : <Square size={14} />}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {MODULE_KEYS.map(key => {
                          const row = formData.permissions[key];
                          const allOn = ACTIONS.every(a => row[a]);
                          return (
                            <tr key={key}>
                              <td>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 500 }}>
                                  <input type="checkbox" checked={allOn} onChange={() => toggleRow(key)} />
                                  {MODULE_LABELS[key] || key}
                                </label>
                              </td>
                              {ACTIONS.map(action => (
                                <td key={action} style={{ textAlign: 'center' }}>
                                  <input
                                    type="checkbox"
                                    checked={row[action]}
                                    onChange={() => togglePermission(key, action)}
                                  />
                                </td>
                              ))}
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : (editingRole ? 'Update Role' : 'Add Role')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
