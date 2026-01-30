import { useState, useEffect, useRef } from 'react';
import { Save, User, Mail, Phone, CreditCard, Heart, AlertCircle, Lock, Camera, Upload, FileText, Building, X, Eye } from 'lucide-react';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export function Profile() {
  const { currentUser, updateUser, getBranchById } = useStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ type: string; data: string } | null>(null);

  const profilePhotoRef = useRef<HTMLInputElement>(null);
  const aadharDocRef = useRef<HTMLInputElement>(null);
  const panDocRef = useRef<HTMLInputElement>(null);
  const passbookDocRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    profilePhoto: '',
    aadharCard: '',
    aadharCardDoc: '',
    panCard: '',
    panCardDoc: '',
    bloodGroup: '',
    emergencyContact: '',
    bankName: '',
    bankAccountNo: '',
    bankAccountHolder: '',
    bankIfscCode: '',
    bankBranchName: '',
    bankPassbookDoc: '',
    licenseNo: '',
    medicalInsurance: '',
    // Allowances
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

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        password: '',
        confirmPassword: '',
        profilePhoto: currentUser.profilePhoto || '',
        aadharCard: currentUser.aadharCard || '',
        aadharCardDoc: currentUser.aadharCardDoc || '',
        panCard: currentUser.panCard || '',
        panCardDoc: currentUser.panCardDoc || '',
        bloodGroup: currentUser.bloodGroup || '',
        emergencyContact: currentUser.emergencyContact || '',
        licenseNo: currentUser.licenseNo || '',
        medicalInsurance: currentUser.medicalInsurance || '',
        bankName: currentUser.bankName || '',
        bankAccountNo: currentUser.bankAccountNo || '',
        bankAccountHolder: currentUser.bankAccountHolder || '',
        bankIfscCode: currentUser.bankIfscCode || '',
        bankBranchName: currentUser.bankBranchName || '',
        bankPassbookDoc: currentUser.bankPassbookDoc || '',
        designation: currentUser.designation || '',
        location: currentUser.location || '',
        basicSalary: currentUser.basicSalary?.toString() || '',
        houseRentAllowance: currentUser.houseRentAllowance?.toString() || '',
        conveyanceAllowance: currentUser.conveyanceAllowance?.toString() || '',
        medicalAllowance: currentUser.medicalAllowance?.toString() || '',
        uniformAllowance: currentUser.uniformAllowance?.toString() || '',
        educationAllowance: currentUser.educationAllowance?.toString() || '',
        ltaAllowance: currentUser.ltaAllowance?.toString() || '',
        specialAllowance: currentUser.specialAllowance?.toString() || '',
        pfDeduction: currentUser.pfDeduction?.toString() || ''
      });
    }
  }, [currentUser]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: string) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setMessage({ type: 'error', text: 'File size should be less than 5MB' });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.password && formData.password !== formData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (!currentUser) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const updateData: Record<string, unknown> = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        profilePhoto: formData.profilePhoto || undefined,
        aadharCard: formData.aadharCard || undefined,
        aadharCardDoc: formData.aadharCardDoc || undefined,
        panCard: formData.panCard || undefined,
        panCardDoc: formData.panCardDoc || undefined,
        bloodGroup: formData.bloodGroup || undefined,
        emergencyContact: formData.emergencyContact || undefined,
        licenseNo: formData.licenseNo || undefined,
        medicalInsurance: formData.medicalInsurance || undefined,
        bankName: formData.bankName || undefined,
        bankAccountNo: formData.bankAccountNo || undefined,
        bankAccountHolder: formData.bankAccountHolder || undefined,
        bankIfscCode: formData.bankIfscCode || undefined,
        bankBranchName: formData.bankBranchName || undefined,
        bankPassbookDoc: formData.bankPassbookDoc || undefined,
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

      if (formData.password) {
        updateData.password = formData.password;
      }

      await updateUser(currentUser.id, updateData);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setIsEditing(false);
      setFormData(prev => ({ ...prev, password: '', confirmPassword: '' }));
    } catch (error: any) {
      const errorMsg = error?.message || 'Failed to update profile. Please try again.';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setIsSaving(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'stock_manager': return 'Stock Manager';
      case 'branch_manager': return 'Branch Manager';
      case 'salesman': return 'Salesman';
      default: return role;
    }
  };

  const branch = currentUser?.branchId ? getBranchById(currentUser.branchId) : null;

  if (!currentUser) {
    return <div className="stock-page">Loading...</div>;
  }

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>My Profile</h1>
          <p>View and update your profile information</p>
        </div>
        {!isEditing && (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            background: message.type === 'success' ? '#d1fae5' : '#fee2e2',
            color: message.type === 'success' ? '#065f46' : '#991b1b',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <AlertCircle size={18} />
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px' }}>
        {/* Profile Card */}
        <div className="card" style={{ padding: '24px', textAlign: 'center' }}>
          {/* Clickable Profile Photo */}
          <div
            style={{
              position: 'relative',
              width: '120px',
              height: '120px',
              margin: '0 auto 16px',
              cursor: isEditing ? 'pointer' : 'default'
            }}
            onClick={() => isEditing && profilePhotoRef.current?.click()}
          >
            <div
              style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: formData.profilePhoto
                  ? `url(${formData.profilePhoto}) center/cover`
                  : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                color: 'white',
                fontWeight: '600',
                border: isEditing ? '3px dashed #6366f1' : 'none'
              }}
            >
              {!formData.profilePhoto && currentUser.name.charAt(0).toUpperCase()}
            </div>
            {isEditing && (
              <div
                style={{
                  position: 'absolute',
                  bottom: '0',
                  right: '0',
                  background: '#6366f1',
                  borderRadius: '50%',
                  padding: '8px',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                }}
              >
                <Camera size={16} />
              </div>
            )}
            <input
              ref={profilePhotoRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => handleFileUpload(e, 'profilePhoto')}
            />
          </div>

          <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>{currentUser.name}</h2>
          {currentUser.employeeCode && (
            <p style={{ margin: '0 0 8px', color: '#6366f1', fontWeight: '500' }}>
              {currentUser.employeeCode}
            </p>
          )}
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              background: '#e0e7ff',
              color: '#4338ca',
              borderRadius: '20px',
              fontSize: '13px',
              fontWeight: '500'
            }}
          >
            {getRoleLabel(currentUser.role)}
          </span>
          {branch && (
            <p style={{ margin: '12px 0 0', color: '#64748b', fontSize: '14px' }}>
              {branch.name}
            </p>
          )}
          {currentUser.monthlySalary && (
            <p style={{ margin: '8px 0 0', color: '#059669', fontWeight: '600' }}>
              ₹{currentUser.monthlySalary.toLocaleString()}/month
            </p>
          )}
        </div>

        {/* Profile Form */}
        <div className="card" style={{ padding: '24px' }}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">
                <User size={14} style={{ marginRight: '6px', display: 'inline' }} />
                Full Name
              </label>
              <input
                type="text"
                className="form-input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={!isEditing}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Mail size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Email
                </label>
                <input
                  type="email"
                  className="form-input"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">
                  <Phone size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Phone
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={!isEditing}
                  required
                />
              </div>
            </div>

            {isEditing && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">
                    <Lock size={14} style={{ marginRight: '6px', display: 'inline' }} />
                    New Password (optional)
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Leave blank to keep current"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Lock size={14} style={{ marginRight: '6px', display: 'inline' }} />
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    className="form-input"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm new password"
                  />
                </div>
              </div>
            )}

            {/* Aadhar Card Section */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <CreditCard size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Aadhar Card Number
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.aadharCard}
                  onChange={(e) => setFormData({ ...formData, aadharCard: e.target.value })}
                  disabled={!isEditing}
                  placeholder="1234 5678 9012"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Aadhar Card Document</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isEditing && (
                    <>
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
                    </>
                  )}
                  {formData.aadharCardDoc && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setPreviewDoc({ type: 'Aadhar Card', data: formData.aadharCardDoc })}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* PAN Card Section */}
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <CreditCard size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  PAN Card Number
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={formData.panCard}
                  onChange={(e) => setFormData({ ...formData, panCard: e.target.value })}
                  disabled={!isEditing}
                  placeholder="ABCDE1234F"
                />
              </div>
              <div className="form-group">
                <label className="form-label">PAN Card Document</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {isEditing && (
                    <>
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
                    </>
                  )}
                  {formData.panCardDoc && (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => setPreviewDoc({ type: 'PAN Card', data: formData.panCardDoc })}
                    >
                      <Eye size={14} />
                      View
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  <Heart size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Blood Group
                </label>
                <select
                  className="form-select"
                  value={formData.bloodGroup}
                  onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                  disabled={!isEditing}
                >
                  <option value="">Select Blood Group</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">
                  <AlertCircle size={14} style={{ marginRight: '6px', display: 'inline' }} />
                  Emergency Contact
                </label>
                <input
                  type="tel"
                  className="form-input"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                  disabled={!isEditing}
                  placeholder="9876543210"
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
                  disabled={!isEditing}
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
                  disabled={!isEditing}
                  placeholder="Insurance policy number"
                />
              </div>
            </div>

            {/* Bank Details Section */}
            <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Building size={18} />
                Bank Details
              </h3>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.bankName}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
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
                    disabled={!isEditing}
                    placeholder="Enter branch name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Passbook / Cheque</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {isEditing && (
                      <>
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
                      </>
                    )}
                    {formData.bankPassbookDoc && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => setPreviewDoc({ type: 'Bank Passbook', data: formData.bankPassbookDoc })}
                      >
                        <Eye size={14} />
                        View
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Salary Breakdown & Allowances Section - Admin Only */}
            {currentUser.role === 'stock_manager' && <div style={{ marginTop: '24px', padding: '16px', background: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                Salary Breakdown & Allowances
              </h3>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Designation</label>
                  <input type="text" className="form-input" value={formData.designation} onChange={(e) => setFormData({ ...formData, designation: e.target.value })} disabled={!isEditing} placeholder="e.g. Accountant, Director" />
                </div>
                <div className="form-group">
                  <label className="form-label">Work Location</label>
                  <input type="text" className="form-input" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} disabled={!isEditing} placeholder="e.g. Pune" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Basic Salary</label>
                  <input type="number" className="form-input" value={formData.basicSalary} onChange={(e) => setFormData({ ...formData, basicSalary: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">House Rent Allowance</label>
                  <input type="number" className="form-input" value={formData.houseRentAllowance} onChange={(e) => setFormData({ ...formData, houseRentAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Conveyance Allowance</label>
                  <input type="number" className="form-input" value={formData.conveyanceAllowance} onChange={(e) => setFormData({ ...formData, conveyanceAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Medical Allowance</label>
                  <input type="number" className="form-input" value={formData.medicalAllowance} onChange={(e) => setFormData({ ...formData, medicalAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Uniform Allowance</label>
                  <input type="number" className="form-input" value={formData.uniformAllowance} onChange={(e) => setFormData({ ...formData, uniformAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Education Allowance</label>
                  <input type="number" className="form-input" value={formData.educationAllowance} onChange={(e) => setFormData({ ...formData, educationAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">LTA</label>
                  <input type="number" className="form-input" value={formData.ltaAllowance} onChange={(e) => setFormData({ ...formData, ltaAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="form-label">Special Allowance</label>
                  <input type="number" className="form-input" value={formData.specialAllowance} onChange={(e) => setFormData({ ...formData, specialAllowance: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">PF Deduction</label>
                  <input type="number" className="form-input" value={formData.pfDeduction} onChange={(e) => setFormData({ ...formData, pfDeduction: e.target.value })} disabled={!isEditing} placeholder="0" />
                </div>
                <div className="form-group"></div>
              </div>
            </div>}

            {isEditing && (
              <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsEditing(false);
                    setMessage(null);
                    if (currentUser) {
                      setFormData({
                        name: currentUser.name,
                        email: currentUser.email,
                        phone: currentUser.phone,
                        password: '',
                        confirmPassword: '',
                        profilePhoto: currentUser.profilePhoto || '',
                        aadharCard: currentUser.aadharCard || '',
                        aadharCardDoc: currentUser.aadharCardDoc || '',
                        panCard: currentUser.panCard || '',
                        panCardDoc: currentUser.panCardDoc || '',
                        bloodGroup: currentUser.bloodGroup || '',
                        emergencyContact: currentUser.emergencyContact || '',
                        licenseNo: currentUser.licenseNo || '',
                        medicalInsurance: currentUser.medicalInsurance || '',
                        bankName: currentUser.bankName || '',
                        bankAccountNo: currentUser.bankAccountNo || '',
                        bankAccountHolder: currentUser.bankAccountHolder || '',
                        bankIfscCode: currentUser.bankIfscCode || '',
                        bankBranchName: currentUser.bankBranchName || '',
                        bankPassbookDoc: currentUser.bankPassbookDoc || '',
                        designation: currentUser.designation || '',
                        location: currentUser.location || '',
                        basicSalary: currentUser.basicSalary?.toString() || '',
                        houseRentAllowance: currentUser.houseRentAllowance?.toString() || '',
                        conveyanceAllowance: currentUser.conveyanceAllowance?.toString() || '',
                        medicalAllowance: currentUser.medicalAllowance?.toString() || '',
                        uniformAllowance: currentUser.uniformAllowance?.toString() || '',
                        educationAllowance: currentUser.educationAllowance?.toString() || '',
                        ltaAllowance: currentUser.ltaAllowance?.toString() || '',
                        specialAllowance: currentUser.specialAllowance?.toString() || '',
                        pfDeduction: currentUser.pfDeduction?.toString() || ''
                      });
                    }
                  }}
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSaving}
                >
                  <Save size={16} />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
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
