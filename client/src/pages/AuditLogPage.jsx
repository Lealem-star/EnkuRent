import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { fmtDateTime } from '../utils/formatters';

export const AuditLogPage = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      try {
        const res = await api.get('/audit?limit=100');
        if (res.data?.success) {
          setLogs(res.data.data);
        }
      } catch (err) {
        toast(err.response?.data?.message || 'Failed to fetch audit log');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [toast]);

  return (
    <div className="panel">
      <div className="panel-body">
        {logs.length > 0 ? (
          logs.map((a) => (
            <div key={a.id} className="audit-item">
              <div className="audit-time">{fmtDateTime(a.createdAt)}</div>
              <div className="audit-text">
                <b>{a.actorName}</b> — {a.meta || a.action}{' '}
                {a.entityType && (
                  <span className="audit-role">[{a.entityType}]</span>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty">
            {loading ? 'Loading audit records...' : 'No activity recorded yet.'}
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;

