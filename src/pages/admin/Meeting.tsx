import { useEffect, useMemo, useState } from 'react';
import { MessageCircle, Plus, Video } from 'lucide-react';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

type MeetingRecord = {
  id: string;
  title: string;
  meetingLink: string;
  whatsappNo: string;
  employeeIds: string[];
  note?: string;
  createdAt: string;
};

const STORAGE_KEY = 'erp-meetings';

export function Meeting() {
  const { users, currentUser } = useStore();
  const [meetings, setMeetings] = useState<MeetingRecord[]>([]);
  const [title, setTitle] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [whatsappNo, setWhatsappNo] = useState('');
  const [employeeIds, setEmployeeIds] = useState<string[]>([]);
  const [note, setNote] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setMeetings(JSON.parse(raw));
      } catch {
        setMeetings([]);
      }
    }
  }, []);

  const visibleMeetings = useMemo(() => {
    if (currentUser?.role === 'stock_manager') return meetings;
    return meetings.filter((m) => m.employeeIds.includes(currentUser?.id || ''));
  }, [meetings, currentUser?.id, currentUser?.role]);

  const toggleEmployee = (id: string) => {
    setEmployeeIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const createMeeting = () => {
    if (!title.trim() || !meetingLink.trim()) {
      alert('Title and meeting link are required');
      return;
    }
    const rec: MeetingRecord = {
      id: String(Date.now()),
      title: title.trim(),
      meetingLink: meetingLink.trim(),
      whatsappNo: whatsappNo.trim(),
      employeeIds,
      note: note.trim() || undefined,
      createdAt: new Date().toISOString()
    };
    const next = [rec, ...meetings];
    setMeetings(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setTitle('');
    setMeetingLink('');
    setWhatsappNo('');
    setEmployeeIds([]);
    setNote('');
  };

  const shareWhatsApp = (m: MeetingRecord) => {
    const text = encodeURIComponent(`Meeting: ${m.title}\nJoin: ${m.meetingLink}\n${m.note || ''}`);
    const phone = m.whatsappNo.replace(/\D/g, '');
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Meeting</h1>
          <p>Create and share meetings with employees</p>
        </div>
      </div>

      {(currentUser?.role === 'stock_manager' || currentUser?.role === 'branch_manager') && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 12 }}>Schedule Meeting</h3>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Meeting Link</label>
              <input className="form-input" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/..." />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">WhatsApp No</label>
              <input className="form-input" value={whatsappNo} onChange={(e) => setWhatsappNo(e.target.value)} placeholder="Optional broadcast number" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes / Agenda</label>
              <input className="form-input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Select Employees</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
              {users.filter((u) => u.role !== 'stock_manager').map((u) => (
                <label key={u.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="checkbox" checked={employeeIds.includes(u.id)} onChange={() => toggleEmployee(u.id)} />
                  <span>{u.name}</span>
                </label>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" onClick={createMeeting}>
            <Plus size={16} /> Create Meeting
          </button>
        </div>
      )}

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Date</th>
                <th>Link</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleMeetings.map((m) => (
                <tr key={m.id}>
                  <td>{m.title}</td>
                  <td>{new Date(m.createdAt).toLocaleString('en-IN')}</td>
                  <td><a href={m.meetingLink} target="_blank" rel="noreferrer">{m.meetingLink}</a></td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    <a className="btn btn-sm btn-primary" href={m.meetingLink} target="_blank" rel="noreferrer">
                      <Video size={14} /> Join
                    </a>
                    <button className="btn btn-sm btn-success" onClick={() => shareWhatsApp(m)}>
                      <MessageCircle size={14} /> WhatsApp
                    </button>
                  </td>
                </tr>
              ))}
              {visibleMeetings.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#6b7280' }}>No meetings available</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
