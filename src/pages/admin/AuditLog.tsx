import { useState, useEffect } from 'react';
import {
  Shield, ChevronLeft, ChevronRight, Filter
} from 'lucide-react';
import { auditApi } from '../../services/api';
import { useStore } from '../../store/useStore';
import '../stock/Stock.css';

const entityTypes = ['', 'Sale', 'Product', 'Customer', 'Order', 'User', 'Branch', 'Payment', 'Expenditure', 'Attendance', 'Leave', 'Damage', 'StockTransfer'];
const actionTypes = ['', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'LOGIN', 'LOGOUT'];

const actionColors: Record<string, { bg: string; color: string }> = {
  CREATE: { bg: '#d4edda', color: '#155724' },
  UPDATE: { bg: '#cce5ff', color: '#004085' },
  DELETE: { bg: '#f8d7da', color: '#721c24' },
  APPROVE: { bg: '#e8daef', color: '#6c3483' },
  REJECT: { bg: '#f8d7da', color: '#721c24' },
  LOGIN: { bg: '#d1ecf1', color: '#0c5460' },
  LOGOUT: { bg: '#e2e3e5', color: '#383d41' },
};

const PAGE_SIZE = 50;

export function AuditLog() {
  const { users } = useStore();
  const [logs, setLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);

  // Filters
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');

  useEffect(() => {
    fetchLogs();
  }, [entityFilter, actionFilter, userFilter]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await auditApi.getLogs({
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        userId: userFilter || undefined,
        limit: 500,
      });
      setLogs(data);
      setPage(1);
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const paginatedLogs = logs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getActionBadge = (action: string) => {
    const style = actionColors[action] || { bg: '#e5e7eb', color: '#374151' };
    return (
      <span style={{
        background: style.bg,
        color: style.color,
        padding: '3px 10px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.5px',
      }}>
        {action}
      </span>
    );
  };

  return (
    <div className="stock-page">
      <div className="page-header">
        <div>
          <h1>Audit Log</h1>
          <p>Track all system actions and changes</p>
        </div>
        <div style={{ fontSize: '13px', color: '#6b7280' }}>
          {logs.length} total records
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: 'white', padding: '16px', borderRadius: '10px', marginBottom: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Filter size={18} style={{ color: '#00a651' }} />
          <span style={{ fontWeight: '600' }}>Filters</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          <div className="form-group" style={{ margin: 0, minWidth: '160px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Entity Type</label>
            <select className="form-select" value={entityFilter} onChange={(e) => setEntityFilter(e.target.value)}>
              <option value="">All Entities</option>
              {entityTypes.filter(Boolean).map(e => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '140px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>Action</label>
            <select className="form-select" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option value="">All Actions</option>
              {actionTypes.filter(Boolean).map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0, minWidth: '180px' }}>
            <label className="form-label" style={{ fontSize: '12px' }}>User</label>
            <select className="form-select" value={userFilter} onChange={(e) => setUserFilter(e.target.value)}>
              <option value="">All Users</option>
              {(users || []).map((u: any) => (
                <option key={u.id || u._id} value={u.id || u._id}>{u.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="loading">Loading audit logs...</div>
      ) : logs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px' }}>
          <Shield size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
          <h3>No audit logs found</h3>
          <p style={{ color: '#6b7280' }}>Try adjusting the filters above</p>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date/Time</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Entity ID</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {paginatedLogs.map((log: any, idx: number) => (
                  <tr key={log.id || log._id || idx}>
                    <td style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>
                      {log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : log.timestamp ? new Date(log.timestamp).toLocaleString('en-IN') : '-'}
                    </td>
                    <td>
                      <div style={{ fontWeight: '600', fontSize: '13px' }}>{log.user?.name || log.userName || '-'}</div>
                    </td>
                    <td>{getActionBadge(log.action)}</td>
                    <td style={{ fontSize: '13px', fontWeight: '500' }}>{log.entity || log.entityType || '-'}</td>
                    <td style={{ fontSize: '12px', fontFamily: 'monospace', color: '#6b7280' }}>
                      {(log.entityId || log.entity_id || '-').toString().substring(0, 12)}
                      {(log.entityId || log.entity_id || '').toString().length > 12 ? '...' : ''}
                    </td>
                    <td style={{ maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '13px', color: '#4b5563' }}>
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details || log.description || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', marginTop: '20px' }}>
              <button
                className="btn btn-sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <ChevronLeft size={16} /> Previous
              </button>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>
                Page {page} of {totalPages} ({logs.length} records)
              </span>
              <button
                className="btn btn-sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
