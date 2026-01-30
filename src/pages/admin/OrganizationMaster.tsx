import { useState, useEffect, useRef } from 'react';
import { Building2, Save, Upload, Trash2, Eye, X, FileText, MapPin, CreditCard, Landmark, Clock } from 'lucide-react';
import { organizationApi } from '../../services/api';
import '../stock/Stock.css';

const BUSINESS_TYPES = ['Proprietorship', 'Partnership', 'Private Limited', 'Public Limited', 'LLP', 'One Person Company', 'Trust', 'Society', 'Other'];
const INDUSTRIES = ['Agriculture', 'Chemical', 'Fertilizer', 'Manufacturing', 'Trading', 'Retail', 'Wholesale', 'Services', 'Technology', 'Other'];
const DOC_TYPES = [
  { value: 'gst_certificate', label: 'GST Certificate' },
  { value: 'pan_card', label: 'PAN Card' },
  { value: 'tan_card', label: 'TAN Card' },
  { value: 'cin_certificate', label: 'CIN Certificate' },
  { value: 'trade_license', label: 'Trade License' },
  { value: 'msme_certificate', label: 'MSME Certificate' },
  { value: 'import_export_license', label: 'Import/Export License' },
  { value: 'fssai_license', label: 'FSSAI License' },
  { value: 'drug_license', label: 'Drug License' },
  { value: 'pollution_certificate', label: 'Pollution Certificate' },
  { value: 'other', label: 'Other' },
];

export function OrganizationMaster() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState<string>('');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; data: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'general' | 'address' | 'tax' | 'bank' | 'settings' | 'documents'>('general');
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const logoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    orgName: '',
    orgCode: '',
    businessType: '',
    industry: '',
    logoUrl: '',
    email: '',
    phone: '',
    altPhone: '',
    website: '',
    // Tax
    gstNo: '',
    panNo: '',
    tanNo: '',
    cinNo: '',
    // Address
    registeredAddress: '',
    factoryAddress: '',
    city: '',
    state: '',
    stateCode: '',
    pincode: '',
    country: 'India',
    // Bank
    bankName: '',
    bankAccountNo: '',
    bankAccountHolder: '',
    ifscCode: '',
    bankBranch: '',
    upiId: '',
    // Settings
    invoicePrefix: 'INV',
    currency: 'INR',
    workingDays: 'Mon-Sat',
    workingHours: '9:00 AM - 6:00 PM',
    timezone: 'Asia/Kolkata',
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [docUpload, setDocUpload] = useState({ documentName: '', documentType: 'gst_certificate' });

  useEffect(() => {
    fetchOrganization();
  }, []);

  const fetchOrganization = async () => {
    setLoading(true);
    try {
      const org = await organizationApi.get();
      if (org) {
        setOrgId(org.id);
        setFormData({
          orgName: org.orgName || '',
          orgCode: org.orgCode || '',
          businessType: org.businessType || '',
          industry: org.industry || '',
          logoUrl: org.logoUrl || '',
          email: org.email || '',
          phone: org.phone || '',
          altPhone: org.altPhone || '',
          website: org.website || '',
          gstNo: org.gstNo || '',
          panNo: org.panNo || '',
          tanNo: org.tanNo || '',
          cinNo: org.cinNo || '',
          registeredAddress: org.registeredAddress || '',
          factoryAddress: org.factoryAddress || '',
          city: org.city || '',
          state: org.state || '',
          stateCode: org.stateCode || '',
          pincode: org.pincode || '',
          country: org.country || 'India',
          bankName: org.bankName || '',
          bankAccountNo: org.bankAccountNo || '',
          bankAccountHolder: org.bankAccountHolder || '',
          ifscCode: org.ifscCode || '',
          bankBranch: org.bankBranch || '',
          upiId: org.upiId || '',
          invoicePrefix: org.invoicePrefix || 'INV',
          currency: org.currency || 'INR',
          workingDays: org.workingDays || 'Mon-Sat',
          workingHours: org.workingHours || '9:00 AM - 6:00 PM',
          timezone: org.timezone || 'Asia/Kolkata',
        });
        setDocuments(org.documents || []);
      }
    } catch (err) {
      // No organization yet, that's fine
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');
    try {
      const result = await organizationApi.save(formData);
      setOrgId(result.id);
      setSuccessMsg('Organization details saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Logo size should be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !orgId) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('File size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const doc = await organizationApi.uploadDocument(orgId, {
          documentName: docUpload.documentName || file.name,
          documentType: docUpload.documentType,
          fileData: reader.result as string,
          fileName: file.name,
          fileType: file.type,
        });
        setDocuments(prev => [...prev, doc]);
        setDocUpload({ documentName: '', documentType: 'gst_certificate' });
      } catch (err: any) {
        alert(err.message || 'Failed to upload document');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!window.confirm('Are you sure you want to delete this document?')) return;
    try {
      await organizationApi.deleteDocument(docId);
      setDocuments(prev => prev.filter(d => d.id !== docId));
    } catch (err: any) {
      alert(err.message || 'Failed to delete document');
    }
  };

  const update = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="stock-page">
        <div style={{ textAlign: 'center', padding: '60px' }}>Loading organization details...</div>
      </div>
    );
  }

  const tabs = [
    { key: 'general', label: 'General', icon: Building2 },
    { key: 'address', label: 'Address', icon: MapPin },
    { key: 'tax', label: 'Tax & Legal', icon: CreditCard },
    { key: 'bank', label: 'Bank Details', icon: Landmark },
    { key: 'settings', label: 'Settings', icon: Clock },
    { key: 'documents', label: 'Documents', icon: FileText },
  ];

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Organization Master</h1>
          <p>Manage your company details, tax information, and documents</p>
        </div>
      </div>

      {successMsg && (
        <div className="alert alert-success" style={{ marginBottom: '16px', padding: '12px 16px', background: '#d4edda', color: '#155724', borderRadius: '8px', border: '1px solid #c3e6cb' }}>
          {successMsg}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" style={{ marginBottom: '16px', padding: '12px 16px', background: '#f8d7da', color: '#721c24', borderRadius: '8px', border: '1px solid #f5c6cb' }}>
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', overflowX: 'auto', borderBottom: '2px solid #e2e8f0', paddingBottom: '0' }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              border: 'none',
              background: activeTab === tab.key ? '#6366f1' : 'transparent',
              color: activeTab === tab.key ? 'white' : '#64748b',
              borderRadius: '8px 8px 0 0',
              cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 600 : 400,
              fontSize: '14px',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSave}>
        <div className="card" style={{ padding: '24px' }}>

          {/* General Tab */}
          {activeTab === 'general' && (
            <div>
              {/* Logo */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <div
                  onClick={() => logoRef.current?.click()}
                  style={{
                    width: '120px',
                    height: '120px',
                    margin: '0 auto',
                    borderRadius: '16px',
                    border: '3px dashed #6366f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    overflow: 'hidden',
                    background: formData.logoUrl ? `url(${formData.logoUrl}) center/contain no-repeat` : '#f8fafc'
                  }}
                >
                  {!formData.logoUrl && <Building2 size={40} color="#6366f1" />}
                </div>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoUpload} />
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Click to upload logo (max 2MB)</p>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Organization Name *</label>
                  <input type="text" className="form-input" value={formData.orgName} onChange={(e) => update('orgName', e.target.value)} placeholder="e.g. Dynamic Crop Science" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Organization Code</label>
                  <input type="text" className="form-input" value={formData.orgCode} onChange={(e) => update('orgCode', e.target.value.toUpperCase())} placeholder="e.g. DCS" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Business Type</label>
                  <select className="form-select" value={formData.businessType} onChange={(e) => update('businessType', e.target.value)}>
                    <option value="">Select Type</option>
                    {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Industry</label>
                  <select className="form-select" value={formData.industry} onChange={(e) => update('industry', e.target.value)}>
                    <option value="">Select Industry</option>
                    {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={formData.email} onChange={(e) => update('email', e.target.value)} placeholder="company@example.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input type="tel" className="form-input" value={formData.phone} onChange={(e) => update('phone', e.target.value)} placeholder="9876543210" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Alternate Phone</label>
                  <input type="tel" className="form-input" value={formData.altPhone} onChange={(e) => update('altPhone', e.target.value)} placeholder="9876543210" />
                </div>
                <div className="form-group">
                  <label className="form-label">Website</label>
                  <input type="text" className="form-input" value={formData.website} onChange={(e) => update('website', e.target.value)} placeholder="www.example.com" />
                </div>
              </div>
            </div>
          )}

          {/* Address Tab */}
          {activeTab === 'address' && (
            <div>
              <div className="form-group">
                <label className="form-label">Registered Address</label>
                <textarea className="form-input" rows={3} value={formData.registeredAddress} onChange={(e) => update('registeredAddress', e.target.value)} placeholder="Enter registered office address" />
              </div>
              <div className="form-group">
                <label className="form-label">Factory / Warehouse Address</label>
                <textarea className="form-input" rows={3} value={formData.factoryAddress} onChange={(e) => update('factoryAddress', e.target.value)} placeholder="Enter factory/warehouse address" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input type="text" className="form-input" value={formData.city} onChange={(e) => update('city', e.target.value)} placeholder="Pune" />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input type="text" className="form-input" value={formData.state} onChange={(e) => update('state', e.target.value)} placeholder="Maharashtra" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">State Code</label>
                  <input type="text" className="form-input" value={formData.stateCode} onChange={(e) => update('stateCode', e.target.value)} placeholder="27" />
                </div>
                <div className="form-group">
                  <label className="form-label">Pincode</label>
                  <input type="text" className="form-input" value={formData.pincode} onChange={(e) => update('pincode', e.target.value)} placeholder="411001" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Country</label>
                <input type="text" className="form-input" value={formData.country} onChange={(e) => update('country', e.target.value)} />
              </div>
            </div>
          )}

          {/* Tax & Legal Tab */}
          {activeTab === 'tax' && (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GSTIN Number</label>
                  <input type="text" className="form-input" value={formData.gstNo} onChange={(e) => update('gstNo', e.target.value.toUpperCase())} placeholder="27AAWFD2451Q1ZN" maxLength={15} />
                </div>
                <div className="form-group">
                  <label className="form-label">PAN Number</label>
                  <input type="text" className="form-input" value={formData.panNo} onChange={(e) => update('panNo', e.target.value.toUpperCase())} placeholder="AAWFD2451Q" maxLength={10} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">TAN Number</label>
                  <input type="text" className="form-input" value={formData.tanNo} onChange={(e) => update('tanNo', e.target.value.toUpperCase())} placeholder="PUNE12345A" maxLength={10} />
                </div>
                <div className="form-group">
                  <label className="form-label">CIN Number</label>
                  <input type="text" className="form-input" value={formData.cinNo} onChange={(e) => update('cinNo', e.target.value.toUpperCase())} placeholder="U12345MH2020PTC123456" maxLength={21} />
                </div>
              </div>
            </div>
          )}

          {/* Bank Details Tab */}
          {activeTab === 'bank' && (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input type="text" className="form-input" value={formData.bankName} onChange={(e) => update('bankName', e.target.value)} placeholder="Kotak Mahindra Bank" />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Holder Name</label>
                  <input type="text" className="form-input" value={formData.bankAccountHolder} onChange={(e) => update('bankAccountHolder', e.target.value)} placeholder="DYNAMIC CROP SCIENCE" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input type="text" className="form-input" value={formData.bankAccountNo} onChange={(e) => update('bankAccountNo', e.target.value)} placeholder="9349370447" />
                </div>
                <div className="form-group">
                  <label className="form-label">IFSC Code</label>
                  <input type="text" className="form-input" value={formData.ifscCode} onChange={(e) => update('ifscCode', e.target.value.toUpperCase())} placeholder="KKBK0001774" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Bank Branch</label>
                  <input type="text" className="form-input" value={formData.bankBranch} onChange={(e) => update('bankBranch', e.target.value)} placeholder="Bhosari Branch" />
                </div>
                <div className="form-group">
                  <label className="form-label">UPI ID</label>
                  <input type="text" className="form-input" value={formData.upiId} onChange={(e) => update('upiId', e.target.value)} placeholder="7276291431@kotak" />
                </div>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Invoice Prefix</label>
                  <input type="text" className="form-input" value={formData.invoicePrefix} onChange={(e) => update('invoicePrefix', e.target.value.toUpperCase())} placeholder="INV" />
                </div>
                <div className="form-group">
                  <label className="form-label">Currency</label>
                  <select className="form-select" value={formData.currency} onChange={(e) => update('currency', e.target.value)}>
                    <option value="INR">INR (Indian Rupee)</option>
                    <option value="USD">USD (US Dollar)</option>
                    <option value="EUR">EUR (Euro)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Working Days</label>
                  <input type="text" className="form-input" value={formData.workingDays} onChange={(e) => update('workingDays', e.target.value)} placeholder="Mon-Sat" />
                </div>
                <div className="form-group">
                  <label className="form-label">Working Hours</label>
                  <input type="text" className="form-input" value={formData.workingHours} onChange={(e) => update('workingHours', e.target.value)} placeholder="9:00 AM - 6:00 PM" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Timezone</label>
                <select className="form-select" value={formData.timezone} onChange={(e) => update('timezone', e.target.value)}>
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div>
              {!orgId ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#64748b' }}>
                  <FileText size={48} style={{ marginBottom: '12px', opacity: 0.5 }} />
                  <p>Please save organization details first to upload documents.</p>
                </div>
              ) : (
                <>
                  {/* Upload Section */}
                  <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 600 }}>Upload New Document</h4>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Document Name</label>
                        <input type="text" className="form-input" value={docUpload.documentName} onChange={(e) => setDocUpload(prev => ({ ...prev, documentName: e.target.value }))} placeholder="e.g. GST Certificate 2024" />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Document Type</label>
                        <select className="form-select" value={docUpload.documentType} onChange={(e) => setDocUpload(prev => ({ ...prev, documentType: e.target.value }))}>
                          {DOC_TYPES.map(dt => <option key={dt.value} value={dt.value}>{dt.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="button" className="btn btn-primary" onClick={() => docRef.current?.click()}>
                      <Upload size={16} />
                      Upload File
                    </button>
                    <input ref={docRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={handleDocUpload} />
                  </div>

                  {/* Documents List */}
                  {documents.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                      <p>No documents uploaded yet</p>
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
                      {documents.map(doc => (
                        <div key={doc.id} style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white' }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '14px' }}>{doc.documentName}</div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                                {DOC_TYPES.find(dt => dt.value === doc.documentType)?.label || doc.documentType}
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                                {new Date(doc.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            <div style={{ display: 'flex', gap: '6px' }}>
                              <button type="button" className="btn btn-sm btn-primary" onClick={() => setPreviewDoc({ name: doc.documentName, data: doc.fileData })}>
                                <Eye size={14} />
                              </button>
                              <button type="button" className="btn btn-sm btn-danger" onClick={() => handleDeleteDoc(doc.id)}>
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Save Button (except for documents tab) */}
          {activeTab !== 'documents' && (
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                <Save size={18} />
                {saving ? 'Saving...' : 'Save Organization Details'}
              </button>
            </div>
          )}
        </div>
      </form>

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)} style={{ zIndex: 1001 }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '700px', maxHeight: '90vh' }}>
            <div className="modal-header">
              <h3 className="modal-title">{previewDoc.name}</h3>
              <button className="modal-close" onClick={() => setPreviewDoc(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '16px', textAlign: 'center' }}>
              {previewDoc.data.startsWith('data:image') ? (
                <img src={previewDoc.data} alt={previewDoc.name} style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: '8px' }} />
              ) : previewDoc.data.startsWith('data:application/pdf') ? (
                <iframe src={previewDoc.data} style={{ width: '100%', height: '70vh', border: 'none', borderRadius: '8px' }} title={previewDoc.name} />
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
