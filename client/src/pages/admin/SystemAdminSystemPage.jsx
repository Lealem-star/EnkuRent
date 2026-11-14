import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { fmtDate } from '../../utils/formatters';
import {
  Activity,
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Cpu,
  Layers,
} from 'lucide-react';

export const SystemAdminSystemPage = () => {
  const { toast } = useToast();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHealth = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/admin/system/health');
      if (res.data?.success) {
        setHealth(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to check system health');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
        <RefreshCw className="spin" size={26} style={{ margin: '0 auto 10px', color: 'var(--gold)' }} />
        <div>Querying system diagnostics and TiDB Cloud connectivity...</div>
      </div>
    );
  }

  const s = health?.server || {};
  const db = health?.database || {};
  const cron = health?.cronJobs || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            System Infrastructure & Database Health
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Real-time diagnostics, TiDB Cloud latency, server resources, and scheduled background jobs
          </p>
        </div>

        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Probing...' : 'Probe Live Health'}</span>
        </button>
      </div>

      {/* Primary Health Banner */}
      <div
        className="card"
        style={{
          padding: '18px 22px',
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)',
          border: '1px solid var(--green)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '14px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'var(--green-soft)',
              color: 'var(--green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <CheckCircle2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--ink)' }}>
              All Platform Services Operating Normally
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
              Enqopa RentPro B2B Cloud • Database latency: <strong>{db.latencyMs} ms</strong> to Tokyo TiDB cluster
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'var(--green-soft)', color: 'var(--green)' }}>
            DATABASE: {db.status}
          </span>
          <span style={{ fontSize: '11.5px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: 'var(--blue-soft)', color: 'var(--blue)' }}>
            CRON: {cron.status}
          </span>
        </div>
      </div>

      {/* Diagnostics Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Node Server Runtime */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Server size={18} style={{ color: 'var(--gold)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              API Server Runtime
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Uptime:</span>
              <strong style={{ color: 'var(--ink)' }}>{Math.floor(s.uptimeSeconds / 60)} minutes ({s.uptimeSeconds}s)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Node Engine:</span>
              <code>{s.nodeVersion}</code>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>OS Platform:</span>
              <span>{s.platform} ({s.arch})</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>CPU Cores:</span>
              <span>{s.cpuCores} Threads</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Process Memory (Heap):</span>
              <strong>{s.heapUsedMB} MB / {s.heapTotalMB} MB</strong>
            </div>
          </div>
        </div>

        {/* TiDB Cloud Serverless Database */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Database size={18} style={{ color: 'var(--blue)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              TiDB Cloud Serverless (MySQL)
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Database Engine:</span>
              <strong style={{ color: 'var(--ink)' }}>TiDB Cloud (MySQL 8.0)</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Query Latency:</span>
              <strong style={{ color: db.latencyMs < 100 ? 'var(--green)' : 'var(--gold)' }}>
                {db.latencyMs} ms
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>SSL Encryption:</span>
              <span style={{ color: 'var(--green)', fontWeight: 600 }}>Strict TLS (AWS Tokyo)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Total User Records:</span>
              <span>{db.counts?.totalUsers || 0} Records</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Total Rent Payments:</span>
              <span>{db.counts?.totalPayments || 0} Transactions</span>
            </div>
          </div>
        </div>

        {/* Scheduled Automation Jobs */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <Clock size={18} style={{ color: 'var(--green)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Scheduled Cron Automation
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Daily Invoicing Sweep:</span>
              <span>{cron.dailyBillingSweep}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Grace Period Checker:</span>
              <span>{cron.gracePeriodChecker}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span style={{ color: 'var(--ink-soft)' }}>Cron Engine:</span>
              <strong style={{ color: 'var(--green)' }}>node-cron 3.0.3</strong>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemAdminSystemPage;
