import { useState, useRef } from 'react';
import { Plus, Edit2, Trash2, X, Building2, User, Camera, Upload, Eye, FileText, Building, Briefcase, ChevronDown, ChevronUp } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { UserRole } from '../../types';
import './Stock.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function Users() {
  const { users, branches, addUser, updateUser, deleteUser, getBranchById, currentUser } = useStore();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [filterRole, setFilterRole] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<{ type: string; data: string } | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);

  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const aadharDocRef = useRef<HTMLInputElement>(null);
  const panDocRef = useRef<HTMLInputElement>(null);
  const passbookDocRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'salesman' as UserRole,
    branchId: '',
    profilePhoto: '',
    employeeCode: '',
    aadharCard: '',
    aadharCardDoc: '',
    panCard: '',
    panCardDoc: '',
    bloodGroup: '',
    emergencyContact: '',
    monthlySalary: '',
    bankName: '',
    bankAccountNo: '',
    bankAccountHolder: '',
    bankIfscCode: '',
    bankBranchName: '',
    bankPassbookDoc: '',
    // Employment details
    dateOfJoining: '',
    pfNo: '',
    esicNo: '',
    uanNo: '',
    licenseNo: '',
    medicalInsurance: '',
    designation: '',
    location: '',
    basicSalary: '',
    houseRentAllowance: '',
    conveyanceAllowance: '',
    medicalAllowance: '',
    uniformAllowance: '',
    educationAllowance: '',
    ltaAllowance: '',
    specialAllowance: '',
    pfDeduction: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('File size should be less than 5MB');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setFormData(prev => ({ ...prev, [field]: base64 }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOpenModal = (userId?: string) => {
    if (userId) {
      const user = users.find(u => u.id === userId);
      if (user) {
        setFormData({
          name: user.name,
          email: user.email,
          password: '',
          phone: user.phone,
          role: user.role,
          branchId: user.branchId || '',
          profilePhoto: user.profilePhoto || '',
          employeeCode: user.employeeCode || '',
          aadharCard: user.aadharCard || '',
          aadharCardDoc: user.aadharCardDoc || '',
          panCard: user.panCard || '',
          panCardDoc: user.panCardDoc || '',
          bloodGroup: user.bloodGroup || '',
          emergencyContact: user.emergencyContact || '',
          monthlySalary: user.monthlySalary?.toString() || '',
          bankName: user.bankName || '',
          bankAccountNo: user.bankAccountNo || '',
          bankAccountHolder: user.bankAccountHolder || '',
          bankIfscCode: user.bankIfscCode || '',
          bankBranchName: user.bankBranchName || '',
          bankPassbookDoc: user.bankPassbookDoc || '',
          dateOfJoining: user.dateOfJoining ? new Date(user.dateOfJoining).toISOString().split('T')[0] : '',
          pfNo: user.pfNo || '',
          esicNo: user.esicNo || '',
          uanNo: user.uanNo || '',
          licenseNo: user.licenseNo || '',
          medicalInsurance: user.medicalInsurance || '',
          designation: user.designation || '',
          location: user.location || '',
          basicSalary: user.basicSalary?.toString() || '',
          houseRentAllowance: user.houseRentAllowance?.toString() || '',
          conveyanceAllowance: user.conveyanceAllowance?.toString() || '',
          medicalAllowance: user.medicalAllowance?.toString() || '',
          uniformAllowance: user.uniformAllowance?.toString() || '',
          educationAllowance: user.educationAllowance?.toString() || '',
          ltaAllowance: user.ltaAllowance?.toString() || '',
          specialAllowance: user.specialAllowance?.toString() || '',
          pfDeduction: user.pfDeduction?.toString() || ''
        });
        setEditingUser(userId);
      }
    } else {
      setFormData({
        name: '',
        email: '',
        password: '',
        phone: '',
        role: 'salesman',
        branchId: '',
        profilePhoto: '',
        employeeCode: '',
        aadharCard: '',
        aadharCardDoc: '',
        panCard: '',
        panCardDoc: '',
        bloodGroup: '',
        emergencyContact: '',
        monthlySalary: '',
        bankName: '',
        bankAccountNo: '',
        bankAccountHolder: '',
        bankIfscCode: '',
        bankBranchName: '',
        bankPassbookDoc: '',
        dateOfJoining: '',
        pfNo: '',
        esicNo: '',
        uanNo: '',
        licenseNo: '',
        medicalInsurance: '',
        designation: '',
        location: '',
        basicSalary: '',
        houseRentAllowance: '',
        conveyanceAllowance: '',
        medicalAllowance: '',
        uniformAllowance: '',
        educationAllowance: '',
        ltaAllowance: '',
        specialAllowance: '',
        pfDeduction: ''
      });
      setEditingUser(null);
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingUser(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData = {
      name: formData.name,
      email: formData.email,
      password: formData.password || 'password123',
      phone: formData.phone,
      role: formData.role,
      branchId: formData.role !== 'stock_manager' ? formData.branchId : undefined,
      profilePhoto: formData.profilePhoto || undefined,
      employeeCode: formData.employeeCode || undefined,
      aadharCard: formData.aadharCard || undefined,
      aadharCardDoc: formData.aadharCardDoc || undefined,
      panCard: formData.panCard || undefined,
      panCardDoc: formData.panCardDoc || undefined,
      bloodGroup: formData.bloodGroup || undefined,
      emergencyContact: formData.emergencyContact || undefined,
      monthlySalary: formData.monthlySalary ? parseFloat(formData.monthlySalary) : undefined,
      bankName: formData.bankName || undefined,
      bankAccountNo: formData.bankAccountNo || undefined,
      bankAccountHolder: formData.bankAccountHolder || undefined,
      bankIfscCode: formData.bankIfscCode || undefined,
      bankBranchName: formData.bankBranchName || undefined,
      bankPassbookDoc: formData.bankPassbookDoc || undefined,
      dateOfJoining: formData.dateOfJoining ? new Date(formData.dateOfJoining) : undefined,
      pfNo: formData.pfNo || undefined,
      esicNo: formData.esicNo || undefined,
      uanNo: formData.uanNo || undefined,
      licenseNo: formData.licenseNo || undefined,
      medicalInsurance: formData.medicalInsurance || undefined,
      designation: formData.designation || undefined,
      location: formData.location || undefined,
      basicSalary: formData.basicSalary ? parseFloat(formData.basicSalary) : undefined,
      houseRentAllowance: formData.houseRentAllowance ? parseFloat(formData.houseRentAllowance) : undefined,
      conveyanceAllowance: formData.conveyanceAllowance ? parseFloat(formData.conveyanceAllowance) : undefined,
      medicalAllowance: formData.medicalAllowance ? parseFloat(formData.medicalAllowance) : undefined,
      uniformAllowance: formData.uniformAllowance ? parseFloat(formData.uniformAllowance) : undefined,
      educationAllowance: formData.educationAllowance ? parseFloat(formData.educationAllowance) : undefined,
      ltaAllowance: formData.ltaAllowance ? parseFloat(formData.ltaAllowance) : undefined,
      specialAllowance: formData.specialAllowance ? parseFloat(formData.specialAllowance) : undefined,
      pfDeduction: formData.pfDeduction ? parseFloat(formData.pfDeduction) : undefined
    };

    if (editingUser) {
      const updateData: Record<string, unknown> = { ...userData };
      if (!formData.password) {
        delete updateData.password;
      }
      updateUser(editingUser, updateData);
    } else {
      addUser(userData);
    }

    handleCloseModal();
  };

  const handleDelete = (id: string) => {
    if (id === currentUser?.id) {
      alert('You cannot delete your own account');
      return;
    }
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteUser(id);
    }
  };

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'stock_manager': return 'badge-primary';
      case 'branch_manager': return 'badge-success';
      case 'salesman': return 'badge-warning';
      default: return 'badge-primary';
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'stock_manager': return 'Stock Manager';
      case 'branch_manager': return 'Branch Manager';
      case 'salesman': return 'Salesman';
      default: return role;
    }
  };

  const filteredUsers = users.filter(user => {
    if (!filterRole) return true;
    return user.role === filterRole;
  });

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Employee</h1>
          <p>Manage system employees</p>
        </div>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          <Plus size={18} />
          Add Employee
        </button>
      </div>

      <div className="filter-bar">
        <select
          className="form-select"
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
        >
          <option value="">All Roles</option>
          <option value="stock_manager">Stock Manager</option>
          <option value="branch_manager">Branch Manager</option>
          <option value="salesman">Salesman</option>
        </select>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filteredUsers.map((user) => {
          const branch = user.branchId ? getBranchById(user.branchId) : null;
          const isExpanded = expandedUser === user.id;

          return (
            <div key={user.id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: 'white' }}>
              {/* Summary Row - clickable */}
              <div
                onClick={() => setExpandedUser(isExpanded ? null : user.id)}
                style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', cursor: 'pointer', background: isExpanded ? '#f8fafc' : 'white', flexWrap: 'wrap' }}
              >
                <div
                  style={{
                    width: '48px', height: '48px', borderRadius: '50%', flexShrink: 0,
                    background: user.profilePhoto ? `url(${user.profilePhoto}) center/cover` : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 600, fontSize: '18px'
                  }}
                >
                  {!user.profilePhoto && user.name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{user.name}</div>
                  <div style={{ fontSize: '12px', color: '#64748b' }}>
                    {user.employeeCode && <span style={{ color: '#6366f1', fontWeight: 500 }}>{user.employeeCode} • </span>}
                    {user.email} • {user.phone}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className={`badge ${getRoleBadgeClass(user.role)}`}>{getRoleLabel(user.role)}</span>
                  {branch && (
                    <span className="badge badge-primary">
                      <Building2 size={12} style={{ marginRight: '4px' }} />
                      {branch.name}
                    </span>
                  )}
                  {user.bloodGroup && <span className="badge badge-danger">{user.bloodGroup}</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); handleOpenModal(user.id); }}>
                    <Edit2 size={14} />
                  </button>
                  <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleDelete(user.id); }} disabled={user.id === currentUser?.id}>
                    <Trash2 size={14} />
                  </button>
                  {isExpanded ? <ChevronUp size={18} color="#94a3b8" /> : <ChevronDown size={18} color="#94a3b8" />}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div style={{ padding: '0 20px 20px', background: '#f8fafc' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
                    {/* Personal Details */}
                    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: '#6366f1', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <User size={16} /> Personal Details
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        <div><span style={{ color: '#94a3b8' }}>Name:</span> <strong>{user.name}</strong></div>
                        <div><span style={{ color: '#94a3b8' }}>Email:</span> {user.email}</div>
                        <div><span style={{ color: '#94a3b8' }}>Phone:</span> {user.phone}</div>
                        {user.emergencyContact && <div><span style={{ color: '#94a3b8' }}>Emergency:</span> {user.emergencyContact}</div>}
                        {user.bloodGroup && <div><span style={{ color: '#94a3b8' }}>Blood Group:</span> <span style={{ color: '#ef4444', fontWeight: 600 }}>{user.bloodGroup}</span></div>}
                        {user.aadharCard && <div><span style={{ color: '#94a3b8' }}>Aadhar:</span> {user.aadharCard}</div>}
                        {user.panCard && <div><span style={{ color: '#94a3b8' }}>PAN:</span> {user.panCard}</div>}
                        {user.licenseNo && <div><span style={{ color: '#94a3b8' }}>License No:</span> {user.licenseNo}</div>}
                        {user.medicalInsurance && <div><span style={{ color: '#94a3b8' }}>Medical Insurance:</span> {user.medicalInsurance}</div>}
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: '#22c55e', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Briefcase size={16} /> Employment Details
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        {user.employeeCode && <div><span style={{ color: '#94a3b8' }}>Employee Code:</span> <strong>{user.employeeCode}</strong></div>}
                        <div><span style={{ color: '#94a3b8' }}>Role:</span> {getRoleLabel(user.role)}</div>
                        {branch && <div><span style={{ color: '#94a3b8' }}>Branch:</span> {branch.name}</div>}
                        {user.dateOfJoining && <div><span style={{ color: '#94a3b8' }}>Date of Joining:</span> {new Date(user.dateOfJoining).toLocaleDateString('en-IN')}</div>}
                        {user.monthlySalary && <div><span style={{ color: '#94a3b8' }}>Monthly Salary:</span> <span style={{ color: '#22c55e', fontWeight: 600 }}>₹{user.monthlySalary.toLocaleString()}</span></div>}
                        {user.pfNo && <div><span style={{ color: '#94a3b8' }}>PF No:</span> {user.pfNo}</div>}
                        {user.esicNo && <div><span style={{ color: '#94a3b8' }}>ESIC No:</span> {user.esicNo}</div>}
                        {user.uanNo && <div><span style={{ color: '#94a3b8' }}>UAN No:</span> {user.uanNo}</div>}
                      </div>
                    </div>

                    {/* Bank Details */}
                    <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', color: 'white' }}>
                      <h4 style={{ margin: '0 0 16px', fontSize: '14px', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Building size={16} /> Bank Details
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                        {user.bankAccountHolder || user.bankName ? (
                          <>
                            {user.bankName && <div><span style={{ color: '#94a3b8' }}>Bank Name:</span> {user.bankName}</div>}
                            {user.bankAccountNo && <div><span style={{ color: '#94a3b8' }}>A/C No:</span> {user.bankAccountNo}</div>}
                            <div><span style={{ color: '#94a3b8' }}>Account Holder:</span> {user.bankAccountHolder}</div>
                            {user.bankIfscCode && <div><span style={{ color: '#94a3b8' }}>IFSC:</span> {user.bankIfscCode}</div>}
                            {user.bankBranchName && <div><span style={{ color: '#94a3b8' }}>Bank Branch:</span> {user.bankBranchName}</div>}
                          </>
                        ) : (
                          <div style={{ color: '#94a3b8' }}>No bank details added</div>
                        )}
                      </div>
                      {/* Document previews */}
                      <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                        {user.aadharCardDoc && (
                          <button className="btn btn-sm btn-secondary" onClick={() => setPreviewDoc({ type: 'Aadhar Card', data: user.aadharCardDoc! })} style={{ fontSize: '11px' }}>
                            <Eye size={12} /> Aadhar
                          </button>
                        )}
                        {user.panCardDoc && (
                          <button className="btn btn-sm btn-secondary" onClick={() => setPreviewDoc({ type: 'PAN Card', data: user.panCardDoc! })} style={{ fontSize: '11px' }}>
                            <Eye size={12} /> PAN
                          </button>
                        )}
                        {user.bankPassbookDoc && (
                          <button className="btn btn-sm btn-secondary" onClick={() => setPreviewDoc({ type: 'Bank Passbook', data: user.bankPassbookDoc! })} style={{ fontSize: '11px' }}>
                            <Eye size={12} /> Passbook
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh', overflow: 'auto' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingUser ? 'Edit Employee' : 'Add New Employee'}
              </h3>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Profile Photo Upload */}
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div
                    style={{
                      position: 'relative',
                      width: '100px',
                      height: '100px',
                      margin: '0 auto',
                      cursor: 'pointer'
                    }}
                    onClick={() => profilePhotoRef.current?.click()}
                  >
                    <div
                      style={{
                        width: '100px',
                        height: '100px',
                        borderRadius: '50%',
                        background: formData.profilePhoto
                          ? `url(${formData.profilePhoto}) center/cover`
                          : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '36px',
                        color: 'white',
                        fontWeight: '600',
                        border: '3px dashed #6366f1'
                      }}
                    >
                      {!formData.profilePhoto && (formData.name ? formData.name.charAt(0).toUpperCase() : <Camera size={24} />)}
                    </div>
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '0',
                        right: '0',
                        background: '#6366f1',
                        borderRadius: '50%',
                        padding: '6px',
                        color: 'white'
                      }}
                    >
                      <Camera size={14} />
                    </div>
                    <input
                      ref={profilePhotoRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => handleFileUpload(e, 'profilePhoto')}
                    />
                  </div>
                  <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Click to upload photo</p>
                </div>

                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Enter full name"
                    required
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@example.com"
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
                      placeholder="9876543210"
                      required
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">
                    Password {editingUser && '(leave blank to keep current)'}
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder={editingUser ? '••••••••' : 'Enter password'}
                    required={!editingUser}
                  />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Role</label>
                    <select
                      className="form-select"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                      required
                    >
                      <option value="salesman">Salesman</option>
                      <option value="branch_manager">Branch Manager</option>
                      <option value="stock_manager">Stock Manager</option>
                    </select>
                  </div>
                  {formData.role !== 'stock_manager' && (
                    <div className="form-group">
                      <label className="form-label">Branch</label>
                      <select
                        className="form-select"
                        value={formData.branchId}
                        onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                        required
                      >
                        <option value="">Select Branch</option>
                        {branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>
                            {branch.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Employee Code</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.employeeCode}
                      onChange={(e) => setFormData({ ...formData, employeeCode: e.target.value })}
                      placeholder="EMP001"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Blood Group</label>
                    <select
                      className="form-select"
                      value={formData.bloodGroup}
                      onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map((bg) => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Aadhar Card Section */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Aadhar Card Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.aadharCard}
                      onChange={(e) => setFormData({ ...formData, aadharCard: e.target.value })}
                      placeholder="1234 5678 9012"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Aadhar Document</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => aadharDocRef.current?.click()}
                        style={{ flex: 1 }}
                      >
                        <Upload size={14} />
                        {formData.aadharCardDoc ? 'Change' : 'Upload'}
                      </button>
                      <input
                        ref={aadharDocRef}
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'aadharCardDoc')}
                      />
                      {formData.aadharCardDoc && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setPreviewDoc({ type: 'Aadhar Card', data: formData.aadharCardDoc })}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* PAN Card Section */}
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">PAN Card Number</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.panCard}
                      onChange={(e) => setFormData({ ...formData, panCard: e.target.value })}
                      placeholder="ABCDE1234F"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">PAN Document</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => panDocRef.current?.click()}
                        style={{ flex: 1 }}
                      >
                        <Upload size={14} />
                        {formData.panCardDoc ? 'Change' : 'Upload'}
                      </button>
                      <input
                        ref={panDocRef}
                        type="file"
                        accept="image/*,.pdf"
                        style={{ display: 'none' }}
                        onChange={(e) => handleFileUpload(e, 'panCardDoc')}
                      />
                      {formData.panCardDoc && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setPreviewDoc({ type: 'PAN Card', data: formData.panCardDoc })}
                        >
                          <Eye size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Emergency Contact</label>
                    <input
                      type="tel"
                      className="form-input"
                      value={formData.emergencyContact}
                      onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                      placeholder="9876543210"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Monthly Salary (₹)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.monthlySalary}
                      onChange={(e) => setFormData({ ...formData, monthlySalary: e.target.value })}
                      placeholder="25000"
                      min="0"
                    />
                  </div>
                </div>

                {/* Employment Details Section */}
                <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                    <Briefcase size={16} />
                    Employment Details
                  </h4>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Date of Joining</label>
                      <input
                        type="date"
                        className="form-input"
                        value={formData.dateOfJoining}
                        onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">PF Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.pfNo}
                        onChange={(e) => setFormData({ ...formData, pfNo: e.target.value })}
                        placeholder="MH/PUN/12345/12345"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">ESIC Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.esicNo}
                        onChange={(e) => setFormData({ ...formData, esicNo: e.target.value })}
                        placeholder="1234567890123456789"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">UAN Number</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.uanNo}
                        onChange={(e) => setFormData({ ...formData, uanNo: e.target.value })}
                        placeholder="123456789012"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">License No</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.licenseNo}
                        onChange={(e) => setFormData({ ...formData, licenseNo: e.target.value })}
                        placeholder="DL-1234567890"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Medical Insurance No</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.medicalInsurance}
                        onChange={(e) => setFormData({ ...formData, medicalInsurance: e.target.value })}
                        placeholder="Insurance policy number"
                      />
                    </div>
                  </div>
                </div>

                {/* Salary Allowances Section */}
                <div style={{ marginTop: '20px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                    💰 Salary Breakdown & Allowances
                  </h4>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Designation</label>
                      <input type="text" className="form-input" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} placeholder="e.g. Accountant, Director" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Work Location</label>
                      <input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Pune" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Basic Salary (₹)</label>
                      <input type="number" className="form-input" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">House Rent Allowance (₹)</label>
                      <input type="number" className="form-input" value={formData.houseRentAllowance} onChange={(e) => setFormData({ ...formData, houseRentAllowance: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Conveyance Allowance (₹)</label>
                      <input type="number" className="form-input" value={formData.conveyanceAllowance} onChange={(e) => setFormData({ ...formData, conveyanceAllowance: e.target.value })} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Medical Allowance (₹)</label>
                      <input type="number" className="form-input" value={formData.medicalAllowance} onChange={(e) => setFormData({ ...formData, medicalAllowance: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Uniform Allowance (₹)</label>
                      <input type="number" className="form-input" value={formData.uniformAllowance} onChange={(e) => setFormData({ ...formData, uniformAllowance: e.target.value })} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Education Allowance (₹)</label>
                      <input type="number" className="form-input" value={formData.educationAllowance} onChange={(e) => setFormData({ ...formData, educationAllowance: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">LTA (₹)</label>
                      <input type="number" className="form-input" value={formData.ltaAllowance} onChange={(e) => setFormData({ ...formData, ltaAllowance: e.target.value })} placeholder="0" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Special Allowance (₹)</label>
                      <input type="number" className="form-input" value={formData.specialAllowance} onChange={(e) => setFormData({ ...formData, specialAllowance: e.target.value })} placeholder="0" />
                    </div>
                  </div>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">PF Deduction (₹)</label>
                      <input type="number" className="form-input" value={formData.pfDeduction} onChange={(e) => setFormData({ ...formData, pfDeduction: e.target.value })} placeholder="0" />
                    </div>
                    <div className="form-group"></div>
                  </div>
                </div>

                {/* Bank Details Section */}
                <div style={{ marginTop: '20px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                  <h4 style={{ margin: '0 0 16px', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '8px', color: '#334155' }}>
                    <Building size={16} />
                    Bank Details
                  </h4>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Bank Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.bankName}
                        onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                        placeholder="e.g. State Bank of India"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Bank A/C No</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.bankAccountNo}
                        onChange={(e) => setFormData({ ...formData, bankAccountNo: e.target.value })}
                        placeholder="Enter account number"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Account Holder Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.bankAccountHolder}
                        onChange={(e) => setFormData({ ...formData, bankAccountHolder: e.target.value })}
                        placeholder="Enter account holder name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">IFSC Code</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.bankIfscCode}
                        onChange={(e) => setFormData({ ...formData, bankIfscCode: e.target.value.toUpperCase() })}
                        placeholder="SBIN0001234"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Bank Branch Name</label>
                      <input
                        type="text"
                        className="form-input"
                        value={formData.bankBranchName}
                        onChange={(e) => setFormData({ ...formData, bankBranchName: e.target.value })}
                        placeholder="Enter branch name"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Passbook / Cheque</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => passbookDocRef.current?.click()}
                          style={{ flex: 1 }}
                        >
                          <Upload size={14} />
                          {formData.bankPassbookDoc ? 'Change' : 'Upload'}
                        </button>
                        <input
                          ref={passbookDocRef}
                          type="file"
                          accept="image/*,.pdf"
                          style={{ display: 'none' }}
                          onChange={(e) => handleFileUpload(e, 'bankPassbookDoc')}
                        />
                        {formData.bankPassbookDoc && (
                          <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => setPreviewDoc({ type: 'Bank Passbook', data: formData.bankPassbookDoc })}
                          >
                            <Eye size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingUser ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)} style={{ zIndex: 1001 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">
                <FileText size={18} style={{ marginRight: '8px' }} />
                {previewDoc.type}
              </h3>
              <button className="modal-close" onClick={() => setPreviewDoc(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px', textAlign: 'center' }}>
              {previewDoc.data.startsWith('data:image') ? (
                <img
                  src={previewDoc.data}
                  alt={previewDoc.type}
                  style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }}
                />
              ) : previewDoc.data.startsWith('data:application/pdf') ? (
                <iframe
                  src={previewDoc.data}
                  style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }}
                  title={previewDoc.type}
                />
              ) : (
                <p>Unable to preview this file type</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
