import { useState } from 'react';
import { Clock, CalendarDays, UserCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { AttendanceManagement } from './AttendanceManagement';
import { LeaveManagement } from './LeaveManagement';
import { MyAttendance } from '../attendance/MyAttendance';
import '../stock/Stock.css';

type AttendanceTab = 'attendance' | 'leaves' | 'myAttendance';

// Single "Attendance Mgmt" page hosting Attendance, Leave Management, and My
// Attendance (self check-in/out) as tabs — these were separate sidebar
// entries; consolidated here the same way Settings folds in Organization/
// Roles/Language. Each tab renders the existing, unmodified page component.
export function AttendanceHub() {
  const { currentUser } = useStore();
  const canViewAttendance = !!currentUser?.permissions?.attendanceManagement?.view;
  const canViewLeaves = !!currentUser?.permissions?.leaveManagement?.view;

  // My Attendance (personal check-in/out) needs no permission — every
  // authenticated user gets it, same as it was as a standalone sidebar entry.
  const tabs: { key: AttendanceTab; label: string; icon: typeof Clock }[] = [
    { key: 'myAttendance' as const, label: 'My Attendance', icon: UserCheck },
    ...(canViewAttendance ? [{ key: 'attendance' as const, label: 'Attendance', icon: Clock }] : []),
    ...(canViewLeaves ? [{ key: 'leaves' as const, label: 'Leave Management', icon: CalendarDays }] : []),
  ];

  const [activeTab, setActiveTab] = useState<AttendanceTab>(tabs[0]?.key ?? 'myAttendance');

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Attendance Mgmt</h1>
          <p>Employee attendance records and leave requests</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e5e7eb', marginBottom: '24px' }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 20px',
                background: 'none',
                border: 'none',
                borderBottom: active ? '2px solid #00a651' : '2px solid transparent',
                marginBottom: '-2px',
                color: active ? '#00a651' : '#6b7280',
                fontWeight: active ? 600 : 500,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'attendance' && canViewAttendance && <AttendanceManagement />}
      {activeTab === 'leaves' && canViewLeaves && <LeaveManagement />}
      {activeTab === 'myAttendance' && <MyAttendance />}
    </div>
  );
}
