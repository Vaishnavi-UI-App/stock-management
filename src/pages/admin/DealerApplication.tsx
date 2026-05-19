import { useRef, useState, useEffect } from 'react';
import { Download, Eraser, Upload, Camera, Share2, Plus, ArrowLeft, Eye, Edit2, CheckCircle, XCircle, Trash2, Clock, Loader2 } from 'lucide-react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { useStore } from '../../store/useStore';
import { dealerApplicationsApi } from '../../services/api';
import type { DealerApplication as DealerAppType, DealerApplicationStatus } from '../../types';
import logoImg from '/logo.png';
import '../stock/Stock.css';

type FileField = 'photo' | 'stamp' | 'cheque';
type ViewMode = 'list' | 'form' | 'view';

const DCS_GREEN = '#2e7d32';
const DCS_DARK = '#1b5e20';

const labelStyle: React.CSSProperties = { fontWeight: 700, fontSize: 13 };
const cellBorder: React.CSSProperties = { border: '1px solid #333', padding: '4px 6px', fontSize: 12 };
const fieldLine: React.CSSProperties = { borderBottom: '1px solid #333', minHeight: 22, padding: '2px 4px', fontSize: 13 };

const emptyForm = {
  firmName: '', fullAddress: '', firmType: '',
  mobile: '', telephone: '', email: '',
  partner1Name: '', partner1Address: '', partner2Name: '', partner2Address: '', partner3Name: '', partner3Address: '',
  residenceAddress: '',
  pan: '', gst: '', license: '', udyam: '', validity: '',
  businessNature: '' as '' | 'wholesaler' | 'retailer',
  turnoverWholesaler: '', turnoverRetailer: '',
  establishmentDate: '',
  bankName: '', accountNo: '', branch: '', ifsc: '',
  company1Name: '', company1Product: '', company1Turnover: '',
  company2Name: '', company2Product: '', company2Turnover: '',
  company3Name: '', company3Product: '', company3Turnover: '',
  chequeNo1: '', chequeNo2: '', chequeNo3: '',
  bankNameSecurity: '', securityAmount: '', rtgsDetails: '',
  dealerPlace: '', dealerDate: '',
  remark: '',
};

const statusBadge = (status: DealerApplicationStatus) => {
  const styles: Record<DealerApplicationStatus, { bg: string; color: string; label: string }> = {
    pending: { bg: '#fff3e0', color: '#e65100', label: 'Pending' },
    approved: { bg: '#e8f5e9', color: '#2e7d32', label: 'Approved' },
    rejected: { bg: '#ffebee', color: '#c62828', label: 'Rejected' },
  };
  const s = styles[status];
  return (
    <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  );
};

export function DealerApplication() {
  const { currentUser } = useStore();
  const salesmanName = currentUser?.name || '';
  const isAdmin = currentUser?.role === 'stock_manager' || currentUser?.role === 'account_manager';
  const isManager = currentUser?.role === 'branch_manager';
  const canEditApp = (app: DealerAppType) =>
    app.status !== 'approved' && (app.userId === currentUser?.id || isAdmin || isManager);

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [applications, setApplications] = useState<DealerAppType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedApp, setSelectedApp] = useState<DealerAppType | null>(null);
  const [readOnly, setReadOnly] = useState(false);

  // Reject modal
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectingId, setRejectingId] = useState<string>('');
  const [rejectionReason, setRejectionReason] = useState('');

  // Form state
  const [form, setForm] = useState({ ...emptyForm });
  const [files, setFiles] = useState<Record<FileField, string | null>>({ photo: null, stamp: null, cheque: null });
  const [signature, setSignature] = useState<string>('');
  const [drawing, setDrawing] = useState(false);
  const signCanvasRef = useRef<HTMLCanvasElement>(null);
  const [tsoSignature, setTsoSignature] = useState<string>('');
  const [tsoDrawing, setTsoDrawing] = useState(false);
  const tsoCanvasRef = useRef<HTMLCanvasElement>(null);

  const page1Ref = useRef<HTMLDivElement>(null);
  const page2Ref = useRef<HTMLDivElement>(null);
  const signUploadRef = useRef<HTMLInputElement>(null);
  const tsoUploadRef = useRef<HTMLInputElement>(null);

  // Load applications
  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await dealerApplicationsApi.getAll(statusFilter ? { status: statusFilter } : undefined);
      setApplications(data);
    } catch (err) {
      console.error('Failed to load dealer applications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadApplications(); }, [statusFilter]);

  // Form helpers
  const set = (key: keyof typeof form, value: string) => setForm(p => ({ ...p, [key]: value }));

  const onUpload = (key: FileField, file?: File | null) => {
    if (!file || readOnly) return;
    const reader = new FileReader();
    reader.onload = () => setFiles(p => ({ ...p, [key]: String(reader.result) }));
    reader.readAsDataURL(file);
  };

  const onSignatureUpload = (file: File | undefined, setter: (v: string) => void) => {
    if (!file || readOnly) return;
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result));
    reader.readAsDataURL(file);
  };

  // Canvas helpers
  const clearSignature = () => {
    const canvas = signCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setSignature('');
  };
  const drawOnCanvas = (canvas: HTMLCanvasElement | null, e: React.MouseEvent<HTMLCanvasElement>, isDrawing: boolean, setter: (v: string) => void) => {
    if (!canvas || !isDrawing) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    setter(canvas.toDataURL('image/png'));
  };
  const startOnCanvas = (canvas: HTMLCanvasElement | null, e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath(); ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };
  const stopOnCanvas = (canvas: HTMLCanvasElement | null) => {
    canvas?.getContext('2d')?.beginPath();
  };
  const touchStartOnCanvas = (canvas: HTMLCanvasElement | null, e: React.TouchEvent, setDrawingState: (v: boolean) => void) => {
    e.preventDefault();
    if (!canvas) return;
    const t = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    setDrawingState(true);
    ctx.beginPath(); ctx.moveTo(t.clientX - rect.left, t.clientY - rect.top);
  };
  const touchMoveOnCanvas = (canvas: HTMLCanvasElement | null, e: React.TouchEvent, isDrawing: boolean, setter: (v: string) => void) => {
    e.preventDefault();
    if (!isDrawing || !canvas) return;
    const t = e.touches[0];
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.strokeStyle = '#111';
    ctx.lineTo(t.clientX - rect.left, t.clientY - rect.top);
    ctx.stroke(); ctx.beginPath(); ctx.moveTo(t.clientX - rect.left, t.clientY - rect.top);
    setter(canvas.toDataURL('image/png'));
  };
  const clearTsoSignature = () => {
    const canvas = tsoCanvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setTsoSignature('');
  };

  // PDF
  const buildPdf = async () => {
    if (!page1Ref.current || !page2Ref.current) return null;
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = [page1Ref.current, page2Ref.current];
    for (let i = 0; i < pages.length; i++) {
      const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const img = canvas.toDataURL('image/png');
      const w = pdf.internal.pageSize.getWidth();
      const h = (canvas.height * w) / canvas.width;
      if (i > 0) pdf.addPage();
      pdf.addImage(img, 'PNG', 0, 0, w, h);
    }
    return pdf;
  };

  const downloadPdf = async () => {
    const pdf = await buildPdf();
    if (pdf) pdf.save(`Dealer_Application_${form.firmName || 'Form'}.pdf`);
  };

  const shareWhatsApp = async () => {
    const pdf = await buildPdf();
    if (!pdf) return;
    const fileName = `Dealer_Application_${form.firmName || 'Form'}.pdf`;
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

    if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
      try {
        await navigator.share({
          files: [pdfFile],
          title: `Dealer Application - ${form.firmName}`,
          text: `Dealer Application for ${form.firmName}\nGenerated by: ${salesmanName}`
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }

    pdf.save(fileName);
    const companyWhatsApp = '917020455358';
    const text = encodeURIComponent(
      `Dealer Application Form\nFirm: ${form.firmName}\nOwner: ${form.partner1Name}\nMobile: ${form.mobile}\nGenerated by: ${salesmanName}\n\n(PDF attached separately)`
    );
    window.open(`https://wa.me/${companyWhatsApp}?text=${text}`, '_blank');
  };

  // Navigation helpers
  const goToForm = () => {
    setForm({ ...emptyForm });
    setFiles({ photo: null, stamp: null, cheque: null });
    setSignature('');
    setTsoSignature('');
    setSelectedApp(null);
    setReadOnly(false);
    setViewMode('form');
  };

  const populateFormFromApp = (app: DealerAppType) => {
    const f = { ...emptyForm };
    for (const key of Object.keys(emptyForm) as (keyof typeof emptyForm)[]) {
      if ((app as any)[key] != null) (f as any)[key] = (app as any)[key];
    }
    setForm(f);
    setFiles({
      photo: app.photo || null,
      stamp: app.stamp || null,
      cheque: app.cheque || null,
    });
    setSignature(app.signature || '');
    setTsoSignature(app.tsoSignature || '');
  };

  const goToView = (app: DealerAppType) => {
    setSelectedApp(app);
    populateFormFromApp(app);
    setReadOnly(true);
    setViewMode('view');
  };

  const goToEdit = (app: DealerAppType) => {
    setSelectedApp(app);
    populateFormFromApp(app);
    setReadOnly(false);
    setViewMode('form');
  };

  const goToList = () => {
    setViewMode('list');
    setSelectedApp(null);
    setReadOnly(false);
    loadApplications();
  };

  // Submit application
  const handleSubmit = async () => {
    if (!form.firmName.trim()) {
      alert('Please enter the Firm Name');
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        ...form,
        photo: files.photo,
        stamp: files.stamp,
        cheque: files.cheque,
        signature,
        tsoSignature,
      };
      if (selectedApp && selectedApp.status !== 'approved') {
        await dealerApplicationsApi.update(selectedApp.id, payload);
        alert(selectedApp.status === 'rejected'
          ? 'Application updated and resubmitted for review!'
          : 'Application updated successfully!');
      } else {
        await dealerApplicationsApi.create(payload);
        alert('Application submitted successfully!');
      }
      goToList();
    } catch (err: any) {
      alert(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  // Approve
  const handleApprove = async (id: string) => {
    if (!confirm('Are you sure you want to approve this application?')) return;
    try {
      await dealerApplicationsApi.approve(id);
      alert('Application approved!');
      if (viewMode === 'view') goToList();
      else loadApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to approve');
    }
  };

  // Reject
  const openRejectModal = (id: string) => {
    setRejectingId(id);
    setRejectionReason('');
    setShowRejectModal(true);
  };
  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason');
      return;
    }
    try {
      await dealerApplicationsApi.reject(rejectingId, rejectionReason);
      setShowRejectModal(false);
      alert('Application rejected');
      if (viewMode === 'view') goToList();
      else loadApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to reject');
    }
  };

  // Delete
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this application?')) return;
    try {
      await dealerApplicationsApi.delete(id);
      alert('Application deleted');
      loadApplications();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  // Logo & Footer for PDF
  const LogoHeader = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
      <img src={logoImg} alt="Dynamic Crop Science" crossOrigin="anonymous" style={{ height: 52, objectFit: 'contain' }} />
    </div>
  );

  const Footer = () => (
    <div style={{ background: DCS_GREEN, color: '#fff', padding: '8px 16px', fontSize: 11, marginTop: 16 }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>Dynamic Crop Science</div>
      <div>Sr No 96/2 Charholi Markal Road, Charholi Khurd, Tal - Khed, Pune .412105 | Customer Care: 7020455358</div>
      <div>Email: dynamiccropscience@gmail.com | Website: dynamiccrop.com</div>
    </div>
  );

  // ==================== LIST VIEW ====================
  if (viewMode === 'list') {
    return (
      <div className="stock-page">
        <div className="page-header">
          <div>
            <h1>Dealer Applications</h1>
            <p>{isAdmin ? 'Manage all dealer applications' : 'Your dealer applications'}</p>
          </div>
          <button className="btn btn-primary" onClick={goToForm} style={{ background: DCS_GREEN, borderColor: DCS_GREEN }}>
            <Plus size={16} /> New Application
          </button>
        </div>

        {/* Status filter tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {[
            { label: 'All', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ].map(tab => (
            <button
              key={tab.value}
              className={`btn ${statusFilter === tab.value ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setStatusFilter(tab.value)}
              style={statusFilter === tab.value ? { background: DCS_GREEN, borderColor: DCS_GREEN } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 size={32} className="spinning" style={{ animation: 'spin 1s linear infinite' }} />
            <p>Loading applications...</p>
          </div>
        ) : applications.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: '#666' }}>
            <p>No applications found</p>
            <button className="btn btn-primary" onClick={goToForm} style={{ marginTop: 12, background: DCS_GREEN, borderColor: DCS_GREEN }}>
              <Plus size={16} /> Create New Application
            </button>
          </div>
        ) : (
          <div className="card" style={{ overflowX: 'auto' }}>
            <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: 13 }}>Date</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: 13 }}>Firm Name</th>
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: 13 }}>Mobile</th>
                  {isAdmin && <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: 13 }}>Submitted By</th>}
                  <th style={{ padding: '10px 12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0', fontSize: 13 }}>Status</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '2px solid #e0e0e0', fontSize: 13 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map(app => (
                  <tr key={app.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>
                      {new Date(app.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{app.firmName}</td>
                    <td style={{ padding: '10px 12px', fontSize: 13 }}>{app.mobile || '-'}</td>
                    {isAdmin && (
                      <td style={{ padding: '10px 12px', fontSize: 13 }}>
                        {app.user?.name || '-'}
                        {app.user?.employeeCode && <span style={{ color: '#888', fontSize: 11 }}> ({app.user.employeeCode})</span>}
                      </td>
                    )}
                    <td style={{ padding: '10px 12px' }}>{statusBadge(app.status)}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => goToView(app)} title="View">
                          <Eye size={14} />
                        </button>
                        {canEditApp(app) && (
                          <button className="btn btn-sm" onClick={() => goToEdit(app)}
                            title={app.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
                            style={{ background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9' }}>
                            <Edit2 size={14} />
                          </button>
                        )}
                        {isAdmin && app.status === 'pending' && (
                          <>
                            <button className="btn btn-sm" onClick={() => handleApprove(app.id)} title="Approve"
                              style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7' }}>
                              <CheckCircle size={14} />
                            </button>
                            <button className="btn btn-sm" onClick={() => openRejectModal(app.id)} title="Reject"
                              style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a' }}>
                              <XCircle size={14} />
                            </button>
                          </>
                        )}
                        {(app.status === 'pending' && (app.userId === currentUser?.id || isAdmin)) && (
                          <button className="btn btn-sm" onClick={() => handleDelete(app.id)} title="Delete"
                            style={{ background: '#fff3e0', color: '#e65100', border: '1px solid #ffcc80' }}>
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 450, width: '90%' }}>
              <h3 style={{ marginBottom: 12 }}>Reject Application</h3>
              <textarea
                className="form-input"
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
                placeholder="Enter reason for rejection..."
                rows={3}
                style={{ width: '100%', marginBottom: 12 }}
              />
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleReject} style={{ background: '#c62828', borderColor: '#c62828' }}>Reject</button>
              </div>
            </div>
          </div>
        )}

        <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ==================== FORM / VIEW MODE ====================
  const isViewMode = viewMode === 'view';

  return (
    <div className="stock-page">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn btn-secondary" onClick={goToList}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1>{isViewMode ? 'View Application' : selectedApp ? 'Edit Application' : 'New Application'}</h1>
            <p>{isViewMode ? `Application by ${selectedApp?.user?.name || 'Unknown'}` : 'Fill dealership application form'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {/* Status badge in view mode */}
          {isViewMode && selectedApp && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {statusBadge(selectedApp.status)}
            </div>
          )}
          {/* Edit button for pending/rejected in view mode (owner/admin/manager) */}
          {isViewMode && selectedApp && canEditApp(selectedApp) && (
            <button className="btn btn-sm" onClick={() => goToEdit(selectedApp)}
              style={{ background: '#e3f2fd', color: '#1565c0', border: '1px solid #90caf9', padding: '8px 16px' }}>
              <Edit2 size={16} /> {selectedApp.status === 'rejected' ? 'Edit & Resubmit' : 'Edit'}
            </button>
          )}
          {/* Admin approve/reject buttons for pending in view mode */}
          {isViewMode && isAdmin && selectedApp?.status === 'pending' && (
            <>
              <button className="btn btn-sm" onClick={() => handleApprove(selectedApp.id)}
                style={{ background: '#e8f5e9', color: '#2e7d32', border: '1px solid #a5d6a7', padding: '8px 16px' }}>
                <CheckCircle size={16} /> Approve
              </button>
              <button className="btn btn-sm" onClick={() => openRejectModal(selectedApp.id)}
                style={{ background: '#ffebee', color: '#c62828', border: '1px solid #ef9a9a', padding: '8px 16px' }}>
                <XCircle size={16} /> Reject
              </button>
            </>
          )}
          <button className="btn btn-primary" onClick={downloadPdf} style={{ background: DCS_GREEN, borderColor: DCS_GREEN }}>
            <Download size={16} /> Download PDF
          </button>
          {!isViewMode && (
            <button className="btn btn-success" onClick={shareWhatsApp} style={{ background: '#25D366', borderColor: '#25D366' }}>
              <Share2 size={16} /> Share WhatsApp
            </button>
          )}
        </div>
      </div>

      {/* Rejection reason display */}
      {isViewMode && selectedApp?.status === 'rejected' && selectedApp.rejectionReason && (
        <div style={{ background: '#ffebee', border: '1px solid #ef9a9a', borderRadius: 8, padding: '12px 16px', marginBottom: 16, color: '#c62828' }}>
          <strong>Rejection Reason:</strong> {selectedApp.rejectionReason}
        </div>
      )}

      {/* Submit button for form mode */}
      {!isViewMode && (
        <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
            style={{ background: DCS_GREEN, borderColor: DCS_GREEN, padding: '10px 24px', fontSize: 15 }}>
            {submitting ? (
              <><Clock size={16} /> Submitting...</>
            ) : (
              <><CheckCircle size={16} /> {selectedApp ? 'Update Application' : 'Submit Application'}</>
            )}
          </button>
        </div>
      )}

      {/* Uploads & Signatures Section */}
      <div className="card" style={{ marginBottom: 16, borderTop: `3px solid ${DCS_GREEN}` }}>
        <h3 style={{ marginBottom: 12, color: DCS_DARK }}>Uploads & Signatures</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
          {(['photo', 'stamp', 'cheque'] as FileField[]).map(key => (
            <div key={key} className="form-group">
              <label className="form-label" style={{ textTransform: 'capitalize' }}>
                {key === 'cheque' ? 'Bank Cheque' : key} *
              </label>
              {!readOnly && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                    <Upload size={14} /> Upload
                    <input type="file" accept="image/*" onChange={e => onUpload(key, e.target.files?.[0])} style={{ display: 'none' }} />
                  </label>
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: '#e8f5e9', border: `1px solid ${DCS_GREEN}`, borderRadius: 6, cursor: 'pointer', fontSize: 13, color: DCS_DARK }}>
                    <Camera size={14} /> Capture
                    <input type="file" accept="image/*" capture="environment" onChange={e => onUpload(key, e.target.files?.[0])} style={{ display: 'none' }} />
                  </label>
                </div>
              )}
              {files[key] && <img src={files[key]!} alt={key} style={{ width: 80, height: 80, objectFit: 'cover', marginTop: 6, borderRadius: 4, border: '1px solid #ccc' }} />}
            </div>
          ))}
        </div>

        {/* Dealer Signature */}
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Dealer Signature *</label>
          {readOnly || (signature && !drawing) ? (
            <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 6, background: '#fff' }}>
              {signature ? <img src={signature} alt="Dealer Signature" style={{ maxHeight: 120, display: 'block' }} /> : <span style={{ color: '#999', fontSize: 13 }}>No signature</span>}
            </div>
          ) : (
            <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 6, background: '#fff' }}>
              <canvas ref={signCanvasRef} width={700} height={120}
                style={{ width: '100%', height: 120, cursor: 'crosshair', display: 'block' }}
                onMouseDown={e => { setDrawing(true); startOnCanvas(signCanvasRef.current, e); }}
                onMouseMove={e => drawOnCanvas(signCanvasRef.current, e, drawing, setSignature)}
                onMouseUp={() => { stopOnCanvas(signCanvasRef.current); setDrawing(false); }}
                onMouseLeave={() => { stopOnCanvas(signCanvasRef.current); setDrawing(false); }}
                onTouchStart={e => touchStartOnCanvas(signCanvasRef.current, e, setDrawing)}
                onTouchMove={e => touchMoveOnCanvas(signCanvasRef.current, e, drawing, setSignature)}
                onTouchEnd={() => { stopOnCanvas(signCanvasRef.current); setDrawing(false); }}
              />
            </div>
          )}
          {!readOnly && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={clearSignature}><Eraser size={14} /> Clear</button>
              <input ref={signUploadRef} type="file" accept="image/*" hidden onChange={e => { onSignatureUpload(e.target.files?.[0], setSignature); e.target.value = ''; }} />
              <button className="btn btn-secondary btn-sm" onClick={() => signUploadRef.current?.click()}><Upload size={14} /> Upload</button>
            </div>
          )}
        </div>

        {/* TSO Signature */}
        <div className="form-group" style={{ marginTop: 12 }}>
          <label className="form-label">Territory Sales Officer / Area Sales Officer Signature *</label>
          {readOnly || (tsoSignature && !tsoDrawing) ? (
            <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 6, background: '#fff' }}>
              {tsoSignature ? <img src={tsoSignature} alt="TSO Signature" style={{ maxHeight: 120, display: 'block' }} /> : <span style={{ color: '#999', fontSize: 13 }}>No signature</span>}
            </div>
          ) : (
            <div style={{ border: '1px solid #d1d5db', borderRadius: 6, padding: 6, background: '#fff' }}>
              <canvas ref={tsoCanvasRef} width={700} height={120}
                style={{ width: '100%', height: 120, cursor: 'crosshair', display: 'block' }}
                onMouseDown={e => { setTsoDrawing(true); startOnCanvas(tsoCanvasRef.current, e); }}
                onMouseMove={e => drawOnCanvas(tsoCanvasRef.current, e, tsoDrawing, setTsoSignature)}
                onMouseUp={() => { stopOnCanvas(tsoCanvasRef.current); setTsoDrawing(false); }}
                onMouseLeave={() => { stopOnCanvas(tsoCanvasRef.current); setTsoDrawing(false); }}
                onTouchStart={e => touchStartOnCanvas(tsoCanvasRef.current, e, setTsoDrawing)}
                onTouchMove={e => touchMoveOnCanvas(tsoCanvasRef.current, e, tsoDrawing, setTsoSignature)}
                onTouchEnd={() => { stopOnCanvas(tsoCanvasRef.current); setTsoDrawing(false); }}
              />
            </div>
          )}
          {!readOnly && (
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button className="btn btn-secondary btn-sm" onClick={clearTsoSignature}><Eraser size={14} /> Clear</button>
              <input ref={tsoUploadRef} type="file" accept="image/*" hidden onChange={e => { onSignatureUpload(e.target.files?.[0], setTsoSignature); e.target.value = ''; }} />
              <button className="btn btn-secondary btn-sm" onClick={() => tsoUploadRef.current?.click()}><Upload size={14} /> Upload</button>
            </div>
          )}
        </div>
      </div>

      {/* ====== PAGE 1 ====== */}
      <div ref={page1Ref} style={{ background: '#fff', padding: '24px 32px', maxWidth: 800, margin: '0 auto 20px', border: '1px solid #e0e0e0', fontFamily: 'Arial, sans-serif' }}>
        <LogoHeader />

        <h2 style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, margin: '12px 0 16px', textDecoration: 'underline' }}>DEALERSHIP APPLICATION FORM</h2>

        {/* Personal Profile */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>*Personal Profile:-</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={labelStyle}>*Name of the Firm:-</span>
            <div style={{ ...fieldLine, flex: 1 }}>{form.firmName}</div>
          </div>
          {!readOnly && <input className="form-input" value={form.firmName} onChange={e => set('firmName', e.target.value)} placeholder="Name of the Firm" style={{ marginBottom: 6, fontSize: 13 }} />}
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={labelStyle}>*Full Address of the Firm :-</span>
            <div style={{ ...fieldLine, flex: 1 }}>{form.fullAddress}</div>
          </div>
          {!readOnly && <input className="form-input" value={form.fullAddress} onChange={e => set('fullAddress', e.target.value)} placeholder="Full Address of the Firm" style={{ marginBottom: 6, fontSize: 13 }} />}
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={labelStyle}>*Type of The Firm: Own / Partnership / LLP / Pvt.Ltd. / Other:</span>
            <div style={{ ...fieldLine, flex: 1 }}>{form.firmType}</div>
          </div>
          {!readOnly && <input className="form-input" value={form.firmType} onChange={e => set('firmType', e.target.value)} placeholder="Own / Partnership / LLP / Pvt.Ltd. / Other" style={{ marginBottom: 6, fontSize: 13 }} />}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 6 }}>
            <div>
              <span style={labelStyle}>*Mobile No.:</span>
              {readOnly ? <div style={fieldLine}>{form.mobile}</div> : <input className="form-input" value={form.mobile} onChange={e => set('mobile', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*Telephone No.:</span>
              {readOnly ? <div style={fieldLine}>{form.telephone}</div> : <input className="form-input" value={form.telephone} onChange={e => set('telephone', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <span style={labelStyle}>*E-mail address:</span>
            {readOnly ? <div style={{ ...fieldLine, flex: 1 }}>{form.email}</div> : <input className="form-input" value={form.email} onChange={e => set('email', e.target.value)} style={{ flex: 1, fontSize: 13 }} />}
          </div>
        </div>

        {/* Detail of Partners/Proprietor */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>*Detail of Partners/Proprietor:-</div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
            <thead>
              <tr>
                <th style={{ ...cellBorder, width: 50, background: '#f5f5f5' }}>Sr.No.</th>
                <th style={{ ...cellBorder, background: '#f5f5f5' }}>Name</th>
                <th style={{ ...cellBorder, background: '#f5f5f5' }}>Address</th>
                <th style={{ ...cellBorder, width: 100, background: '#f5f5f5' }}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(i => (
                <tr key={i}>
                  <td style={cellBorder}>{i}</td>
                  <td style={cellBorder}>
                    {readOnly ? (form as any)[`partner${i}Name`] : <input className="form-input" style={{ border: 'none', fontSize: 12, padding: '2px 4px' }} value={(form as any)[`partner${i}Name`]} onChange={e => set(`partner${i}Name` as keyof typeof form, e.target.value)} />}
                  </td>
                  <td style={cellBorder}>
                    {readOnly ? (form as any)[`partner${i}Address`] : <input className="form-input" style={{ border: 'none', fontSize: 12, padding: '2px 4px' }} value={(form as any)[`partner${i}Address`]} onChange={e => set(`partner${i}Address` as keyof typeof form, e.target.value)} />}
                  </td>
                  <td style={cellBorder}></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Residence Address */}
        <div style={{ marginBottom: 12 }}>
          <span style={{ ...labelStyle, color: '#c62828' }}>*Residence Address with pin:-</span>
          {readOnly ? <div style={fieldLine}>{form.residenceAddress}</div> : <input className="form-input" value={form.residenceAddress} onChange={e => set('residenceAddress', e.target.value)} style={{ fontSize: 13 }} />}
        </div>

        {/* Statutory Detail */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>*Statutory detail in Firm:-</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={labelStyle}>*Pan No.:-</span>
              {readOnly ? <div style={fieldLine}>{form.pan}</div> : <input className="form-input" value={form.pan} onChange={e => set('pan', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*GST Registration No.:-</span>
              {readOnly ? <div style={fieldLine}>{form.gst}</div> : <input className="form-input" value={form.gst} onChange={e => set('gst', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*License No.:-</span>
              {readOnly ? <div style={fieldLine}>{form.license}</div> : <input className="form-input" value={form.license} onChange={e => set('license', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*Udyam Registration No.:-</span>
              {readOnly ? <div style={fieldLine}>{form.udyam}</div> : <input className="form-input" value={form.udyam} onChange={e => set('udyam', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={labelStyle}>*Validity:-</span>
            {readOnly ? <div style={fieldLine}>{form.validity}</div> : <input className="form-input" value={form.validity} onChange={e => set('validity', e.target.value)} style={{ fontSize: 13 }} />}
          </div>
        </div>

        {/* Nature of Business */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={labelStyle}>*Nature of business:-</span>
            {readOnly ? (
              <span style={{ fontSize: 13 }}>{form.businessNature === 'wholesaler' ? 'Wholesaler' : form.businessNature === 'retailer' ? 'Retailer' : '-'}</span>
            ) : (
              <>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <span>Wholesaler</span>
                  <input type="radio" name="businessNature" checked={form.businessNature === 'wholesaler'} onChange={() => set('businessNature', 'wholesaler')} />
                </label>
                <span>Or</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                  <span>*Retailer</span>
                  <input type="radio" name="businessNature" checked={form.businessNature === 'retailer'} onChange={() => set('businessNature', 'retailer')} />
                </label>
              </>
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 6 }}>
            <div>
              <span style={labelStyle}>*Turnover in Last year Wholesaler:-</span>
              {readOnly ? <div style={fieldLine}>{form.turnoverWholesaler}</div> : <input className="form-input" value={form.turnoverWholesaler} onChange={e => set('turnoverWholesaler', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*Turnover Retailer:-</span>
              {readOnly ? <div style={fieldLine}>{form.turnoverRetailer}</div> : <input className="form-input" value={form.turnoverRetailer} onChange={e => set('turnoverRetailer', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
          </div>
          <div style={{ marginTop: 6 }}>
            <span style={labelStyle}>*Date of Year of establishment of Firm:-</span>
            {readOnly ? <div style={fieldLine}>{form.establishmentDate}</div> : <input className="form-input" value={form.establishmentDate} onChange={e => set('establishmentDate', e.target.value)} style={{ fontSize: 13 }} />}
          </div>
        </div>

        {/* Financial Profile */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>*Financial Profile:-</div>
          <div style={{ ...labelStyle, marginBottom: 4 }}>*Detail of Bank Accounts:-</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <span style={labelStyle}>*Name of the Bank:-</span>
              {readOnly ? <div style={fieldLine}>{form.bankName}</div> : <input className="form-input" value={form.bankName} onChange={e => set('bankName', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*Account No.:-</span>
              {readOnly ? <div style={fieldLine}>{form.accountNo}</div> : <input className="form-input" value={form.accountNo} onChange={e => set('accountNo', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*Branch:-</span>
              {readOnly ? <div style={fieldLine}>{form.branch}</div> : <input className="form-input" value={form.branch} onChange={e => set('branch', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>*IFCS Code :-</span>
              {readOnly ? <div style={fieldLine}>{form.ifsc}</div> : <input className="form-input" value={form.ifsc} onChange={e => set('ifsc', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
          </div>
        </div>

        {/* Detail of Business With Other Companies */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ ...labelStyle, marginBottom: 6 }}>*Detail of Business With Other Companies:-</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ ...cellBorder, width: 50, background: '#f5f5f5' }}>Sr.No.</th>
                <th style={{ ...cellBorder, background: '#f5f5f5' }}>Name of Company</th>
                <th style={{ ...cellBorder, background: '#f5f5f5' }}>Product</th>
                <th style={{ ...cellBorder, background: '#f5f5f5' }}>Last Year Turnover</th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map(i => (
                <tr key={i}>
                  <td style={cellBorder}>{i}</td>
                  <td style={cellBorder}>
                    {readOnly ? (form as any)[`company${i}Name`] : <input className="form-input" style={{ border: 'none', fontSize: 12, padding: '2px 4px' }} value={(form as any)[`company${i}Name`]} onChange={e => set(`company${i}Name` as keyof typeof form, e.target.value)} />}
                  </td>
                  <td style={cellBorder}>
                    {readOnly ? (form as any)[`company${i}Product`] : <input className="form-input" style={{ border: 'none', fontSize: 12, padding: '2px 4px' }} value={(form as any)[`company${i}Product`]} onChange={e => set(`company${i}Product` as keyof typeof form, e.target.value)} />}
                  </td>
                  <td style={cellBorder}>
                    {readOnly ? (form as any)[`company${i}Turnover`] : <input className="form-input" style={{ border: 'none', fontSize: 12, padding: '2px 4px' }} value={(form as any)[`company${i}Turnover`]} onChange={e => set(`company${i}Turnover` as keyof typeof form, e.target.value)} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Security & Deposit Details */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ ...labelStyle, marginBottom: 4 }}>*Security & Deposit Details:-</div>
          <div style={{ fontSize: 12, marginBottom: 6 }}>(Nationalized Bank at per cheque will be accepted)</div>
          <div style={{ display: 'flex', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
            <div>
              <span style={labelStyle}>*Cheque No. 1)</span>
              {readOnly ? <span style={{ fontSize: 13, marginLeft: 4 }}>{form.chequeNo1}</span> : <input className="form-input" value={form.chequeNo1} onChange={e => set('chequeNo1', e.target.value)} style={{ width: 120, fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>2)</span>
              {readOnly ? <span style={{ fontSize: 13, marginLeft: 4 }}>{form.chequeNo2}</span> : <input className="form-input" value={form.chequeNo2} onChange={e => set('chequeNo2', e.target.value)} style={{ width: 120, fontSize: 13 }} />}
            </div>
            <div>
              <span style={labelStyle}>3)</span>
              {readOnly ? <span style={{ fontSize: 13, marginLeft: 4 }}>{form.chequeNo3}</span> : <input className="form-input" value={form.chequeNo3} onChange={e => set('chequeNo3', e.target.value)} style={{ width: 120, fontSize: 13 }} />}
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* ====== PAGE 2 ====== */}
      <div ref={page2Ref} style={{ background: '#fff', padding: '24px 32px', maxWidth: 800, margin: '0 auto 20px', border: '1px solid #e0e0e0', fontFamily: 'Arial, sans-serif' }}>
        <LogoHeader />

        <div style={{ border: '1px solid #333', padding: 16, marginTop: 12 }}>
          {/* Bank Name */}
          <div style={{ marginBottom: 12 }}>
            <span style={labelStyle}>*Bank Name:</span>
            <div style={{ ...fieldLine }}>{form.bankNameSecurity || form.bankName}</div>
            {!readOnly && <input className="form-input" value={form.bankNameSecurity} onChange={e => set('bankNameSecurity', e.target.value)} placeholder="Bank Name for Security" style={{ fontSize: 13, marginTop: 4 }} />}
          </div>

          {/* Security Deposit */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={labelStyle}>*Security Deposit amount Rs.:-</span>
              {readOnly ? <div style={fieldLine}>{form.securityAmount}</div> : <input className="form-input" value={form.securityAmount} onChange={e => set('securityAmount', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <span style={labelStyle}>Details for RTGS/NEFT/DD/Cheque No.:-</span>
              {readOnly ? <div style={fieldLine}>{form.rtgsDetails}</div> : <input className="form-input" value={form.rtgsDetails} onChange={e => set('rtgsDetails', e.target.value)} style={{ fontSize: 13 }} />}
            </div>
          </div>

          {/* Declaration */}
          <div style={{ margin: '16px 0', padding: 12, background: '#f9fbe7', borderRadius: 4, fontSize: 13, lineHeight: 1.6 }}>
            *I/We Hereby confirm that the information/data given above is the best of my knowledge and belief.
            any wrong information/suppression of facts will disqualify me from being considered for the dealership.
          </div>

          <div style={{ marginBottom: 12, fontWeight: 600 }}>For</div>

          {/* Photo + Signature area */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Signature with Stamp of the firm</div>
              <div style={{ display: 'flex', gap: 16, marginBottom: 8 }}>
                {files.stamp && <img src={files.stamp} alt="stamp" style={{ width: 80, height: 80, objectFit: 'cover', border: '1px solid #ccc' }} />}
                {signature && <img src={signature} alt="signature" style={{ maxHeight: 60 }} />}
              </div>
              <div style={{ fontWeight: 700 }}>Dealer :-</div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <span style={labelStyle}>Place :-</span>
                {readOnly ? <span style={{ fontSize: 13 }}>{form.dealerPlace}</span> : <input className="form-input" value={form.dealerPlace} onChange={e => set('dealerPlace', e.target.value)} style={{ width: 200, fontSize: 13 }} />}
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                <span style={labelStyle}>Date :-</span>
                {readOnly ? <span style={{ fontSize: 13 }}>{form.dealerDate}</span> : <input className="form-input" type="date" value={form.dealerDate} onChange={e => set('dealerDate', e.target.value)} style={{ width: 200, fontSize: 13 }} />}
              </div>
            </div>
            <div style={{ border: `2px solid ${DCS_GREEN}`, width: 130, height: 150, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {files.photo ? (
                <img src={files.photo} alt="photo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ color: '#9e9e9e', fontSize: 14 }}>Photo</span>
              )}
            </div>
          </div>

          {/* Bank Cheque Image */}
          {files.cheque && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 12, marginBottom: 4 }}>Bank Cheque</div>
              <img src={files.cheque} alt="cheque" style={{ width: '100%', maxHeight: 120, objectFit: 'contain', border: '1px solid #ccc', borderRadius: 4 }} />
            </div>
          )}

          {/* For Office Use */}
          <div style={{ borderTop: '2px solid #333', paddingTop: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>*For Office Use</div>
            <div style={{ marginBottom: 12 }}>
              <span style={labelStyle}>Remark & Assessment: -</span>
              {readOnly ? <div style={{ ...fieldLine, minHeight: 40 }}>{form.remark}</div> : <textarea className="form-input" value={form.remark} onChange={e => set('remark', e.target.value)} rows={2} style={{ fontSize: 13 }} />}
            </div>

            {/* TSO Signature + Salesman Name */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 40, alignItems: 'flex-end' }}>
              <div style={{ textAlign: 'center' }}>
                {tsoSignature && (
                  <div style={{ marginBottom: 4 }}>
                    <img src={tsoSignature} alt="TSO Signature" style={{ maxHeight: 50 }} />
                  </div>
                )}
                <div style={{ borderTop: '1px solid #333', width: 250, marginBottom: 4 }}></div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Signature:</div>
                <div style={{ fontSize: 12 }}>Recommended by Territory Sales Officer /Area Sales Officer</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: DCS_DARK, marginBottom: 8 }}>
                  {isViewMode && selectedApp?.user?.name ? selectedApp.user.name : salesmanName}
                </div>
                <div style={{ borderTop: '1px solid #333', width: 250, marginBottom: 4 }}></div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Generated By</div>
                <div style={{ fontSize: 12, color: '#555' }}>{isViewMode && selectedApp?.user?.name ? selectedApp.user.name : (salesmanName || 'Salesman Name')}</div>
              </div>
            </div>
          </div>
        </div>

        <Footer />
      </div>

      {/* Bottom action buttons */}
      <div style={{ maxWidth: 800, margin: '0 auto 40px', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
        {!isViewMode && (
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}
            style={{ background: DCS_GREEN, borderColor: DCS_GREEN, padding: '12px 24px', fontSize: 15 }}>
            {submitting ? <><Clock size={18} /> Submitting...</> : <><CheckCircle size={18} /> {selectedApp ? 'Update Application' : 'Submit Application'}</>}
          </button>
        )}
        <button className="btn btn-primary" onClick={downloadPdf} style={{ background: DCS_GREEN, borderColor: DCS_GREEN, padding: '12px 24px', fontSize: 15 }}>
          <Download size={18} /> Download PDF
        </button>
        <button className="btn btn-success" onClick={shareWhatsApp} style={{ background: '#25D366', borderColor: '#25D366', padding: '12px 24px', fontSize: 15 }}>
          <Share2 size={18} /> Share to Company WhatsApp
        </button>
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, maxWidth: 450, width: '90%' }}>
            <h3 style={{ marginBottom: 12 }}>Reject Application</h3>
            <textarea
              className="form-input"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              style={{ width: '100%', marginBottom: 12 }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn btn-secondary" onClick={() => setShowRejectModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleReject} style={{ background: '#c62828', borderColor: '#c62828' }}>Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
