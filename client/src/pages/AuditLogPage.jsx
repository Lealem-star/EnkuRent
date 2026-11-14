import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { fmtDateTime } from '../utils/formatters';
import {
  ShieldCheck,
  Search,
  Filter,
  RefreshCw,
  Clock,
  User,
  Activity,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Modal from '../components/Modal';

export const AuditLogPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(30);

  const [category, setCategory] = useState('ALL');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Detail Modal State
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (category !== 'ALL') params.append('action', category);
      if (search.trim()) params.append('search', search.trim());
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await api.get(`/audit?${params.toString()}`);
      if (res.data?.success) {
        const raw = res.data.data;
        if (Array.isArray(raw)) {
          setLogs(raw);
          setTotal(raw.length);
        } else if (raw && raw.logs) {
          setLogs(raw.logs);
          setTotal(raw.total || raw.logs.length);
        }
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch audit log');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [page, limit, category, search, startDate, endDate, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Platform Audit & Security Event Trail
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Immutable, append-only chronological log of all administrative, financial, and security actions ({total} total events)
          </p>
        </div>

        <button
          onClick={() => fetchLogs(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          {/* Category Chips */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Activities' },
              { id: 'AUTH', label: 'Auth & Login' },
              { id: 'APPLICATION', label: 'Owner Approvals' },
              { id: 'SUBSCRIPTION', label: 'Subscriptions' },
              { id: 'BUILDING', label: 'Property & Offices' },
              { id: 'PAYMENT', label: 'Payments' },
              { id: 'SETTINGS', label: 'Platform Config' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setCategory(cat.id);
                  setPage(1);
                }}
                className={`btn btn-sm ${category === cat.id ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '11.5px', padding: '5px 10px' }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div style={{ position: 'relative', width: '280px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search actor, action, details..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              style={{ paddingLeft: '32px', fontSize: '12.5px', height: '34px' }}
            />
          </div>
        </div>

        {/* Date Filter Row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', fontSize: '12px', color: 'var(--ink-soft)' }}>
          <span>Filter Date Range:</span>
          <input
            type="date"
            className="input"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            style={{ width: '140px', height: '30px', fontSize: '11.5px' }}
          />
          <span>to</span>
          <input
            type="date"
            className="input"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            style={{ width: '140px', height: '30px', fontSize: '11.5px' }}
          />
          {(startDate || endDate || search || category !== 'ALL') && (
            <button
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSearch('');
                setCategory('ALL');
                setPage(1);
              }}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '11.5px', color: 'var(--gold-hover)', height: '30px' }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
            <div>Loading security and audit trail...</div>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <ShieldCheck size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600 }}>No audit events found</div>
            <div style={{ fontSize: '12.5px', marginTop: '2px' }}>Try widening your search filters or date range.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>TIMESTAMP</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>ACTOR</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>EVENT ACTION</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>ENTITY TYPE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>EVENT DETAILS</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'right' }}>INSPECT</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  let parsedMeta = null;
                  if (log.meta) {
                    try {
                      parsedMeta = typeof log.meta === 'string' && log.meta.startsWith('{') ? JSON.parse(log.meta) : log.meta;
                    } catch {
                      parsedMeta = log.meta;
                    }
                  }

                  const metaPreview = typeof parsedMeta === 'object' && parsedMeta !== null
                    ? Object.entries(parsedMeta).map(([k, v]) => `${k}: ${v}`).join(' • ')
                    : String(parsedMeta || '—');

                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--line)', fontSize: '12.5px' }}>
                      <td style={{ padding: '12px 16px', whiteSpace: 'nowrap', color: 'var(--ink-soft)' }}>
                        {fmtDateTime(log.createdAt)}
                      </td>

                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap' }}>
                        {log.actorName || 'System'}
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background:
                              log.action.includes('REJECT') || log.action.includes('SUSPEND') || log.action.includes('FAIL')
                                ? 'var(--red-soft)'
                                : log.action.includes('APPROVE') || log.action.includes('CREATE') || log.action.includes('ACTIVE')
                                ? 'var(--green-soft)'
                                : 'var(--paper)',
                            color:
                              log.action.includes('REJECT') || log.action.includes('SUSPEND') || log.action.includes('FAIL')
                                ? 'var(--red)'
                                : log.action.includes('APPROVE') || log.action.includes('CREATE') || log.action.includes('ACTIVE')
                                ? 'var(--green)'
                                : 'var(--ink)',
                            border: '1px solid var(--line)',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', color: 'var(--ink-soft)', fontSize: '12px' }}>
                        {log.entityType || 'Platform'}
                      </td>

                      <td style={{ padding: '12px 16px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--ink)' }}>
                        {metaPreview}
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: '4px 8px', fontSize: '11px', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
                        >
                          <Eye size={12} />
                          <span>View</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div
            style={{
              padding: '12px 18px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              fontSize: '12.5px',
            }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>
              Showing {logs.length} of {total} records • Page {page} of {totalPages}
            </span>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
              >
                <ChevronLeft size={14} />
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="btn btn-secondary btn-sm"
                style={{ padding: '4px 8px' }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedLog(null)}
          title={`Audit Event Details — ${selectedLog.action}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '440px', fontSize: '13px' }}>
            <div style={{ background: 'var(--paper)', padding: '14px', borderRadius: '8px', border: '1px solid var(--line)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div><strong>Event ID:</strong> <code>{selectedLog.id}</code></div>
              <div><strong>Timestamp:</strong> {fmtDateTime(selectedLog.createdAt)}</div>
              <div><strong>Actor:</strong> {selectedLog.actorName} ({selectedLog.actorId || 'System Process'})</div>
              <div><strong>Action:</strong> <span style={{ fontWeight: 700, color: 'var(--gold-hover)' }}>{selectedLog.action}</span></div>
              <div><strong>Entity Type:</strong> {selectedLog.entityType || '—'}</div>
              <div><strong>Entity ID:</strong> <code>{selectedLog.entityId || '—'}</code></div>
              {selectedLog.officeId && <div><strong>Office ID:</strong> <code>{selectedLog.officeId}</code></div>}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Event Payload / Metadata:
              </label>
              <pre
                style={{
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px',
                  overflowX: 'auto',
                  margin: 0,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {(() => {
                  try {
                    const parsed = JSON.parse(selectedLog.meta);
                    return JSON.stringify(parsed, null, 2);
                  } catch {
                    return selectedLog.meta || 'No additional metadata provided.';
                  }
                })()}
              </pre>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedLog(null)}>
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AuditLogPage;
