import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import {
  Zap,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Settings,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

export const SystemAdminGatewaysPage = () => {
  const { toast } = useToast();
  const [gateways, setGateways] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit Gateway Modal
  const [editingGateway, setEditingGateway] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    isEnabled: true,
    isLive: false,
    feePercent: 2.5,
    publicKey: '',
    secretKey: '',
    webhookSecret: '',
    instructions: '',
  });
  const [saving, setSaving] = useState(false);

  // Test Ping State
  const [testingProvider, setTestingProvider] = useState(null);
  const [testResult, setTestResult] = useState(null);

  const fetchGateways = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/admin/gateways');
      if (res.data?.success) {
        setGateways(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load gateway configurations');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchGateways();
  }, [fetchGateways]);

  const handleOpenEdit = (gw) => {
    setEditingGateway(gw);
    setFormData({
      name: gw.name,
      isEnabled: gw.isEnabled,
      isLive: gw.isLive,
      feePercent: gw.feePercent,
      publicKey: gw.publicKey || '',
      secretKey: '',
      webhookSecret: '',
      instructions: gw.instructions || '',
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!editingGateway) return;
    setSaving(true);
    try {
      const res = await api.put(`/admin/gateways/${editingGateway.provider}`, formData);
      if (res.data?.success) {
        toast(`Updated ${formData.name} configuration successfully`);
        setEditingGateway(null);
        fetchGateways();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update gateway');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async (gw) => {
    setTestingProvider(gw.provider);
    setTestResult(null);
    try {
      const res = await api.post(`/admin/gateways/${gw.provider}/test`);
      if (res.data?.success) {
        setTestResult(res.data.data);
      }
    } catch (err) {
      toast('Gateway test ping failed');
    } finally {
      setTestingProvider(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Payment Gateway Integrations & Credentials
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Manage Ethiopian payment rails: Chapa, Telebirr, CBE Birr, and direct deposit verification
          </p>
        </div>

        <button
          onClick={() => fetchGateways(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Gateway Cards Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
          <div>Loading gateway providers...</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
          {gateways.map((gw) => (
            <div
              key={gw.id}
              className="card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: gw.isEnabled ? '1px solid var(--line)' : '1px dashed var(--line)',
                opacity: gw.isEnabled ? 1 : 0.8,
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                      {gw.name}
                    </h3>
                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                      Provider: <code>{gw.provider}</code>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: gw.isLive ? 'var(--green-soft)' : 'var(--blue-soft)',
                        color: gw.isLive ? 'var(--green)' : 'var(--blue)',
                      }}
                    >
                      {gw.isLive ? 'PRODUCTION' : 'TEST SANDBOX'}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        background: gw.isEnabled ? 'var(--green-soft)' : 'var(--red-soft)',
                        color: gw.isEnabled ? 'var(--green)' : 'var(--red)',
                      }}
                    >
                      {gw.isEnabled ? 'ACTIVE' : 'DISABLED'}
                    </span>
                  </div>
                </div>

                <p style={{ margin: '12px 0 16px', fontSize: '13px', color: 'var(--ink-soft)', minHeight: '36px' }}>
                  {gw.instructions}
                </p>

                {/* Configuration Specs */}
                <div
                  style={{
                    background: 'var(--paper)',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    fontSize: '12px',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Platform Fee:</span>
                    <strong style={{ color: 'var(--ink)' }}>{gw.feePercent}% per transaction</strong>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Public / Client Key:</span>
                    <code style={{ fontSize: '11px' }}>{gw.publicKey ? `${gw.publicKey.slice(0, 14)}...` : 'Not Set'}</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Secret API Key:</span>
                    <code style={{ fontSize: '11px' }}>{gw.secretKeyMasked}</code>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--ink-soft)' }}>Webhook Signature:</span>
                    <code style={{ fontSize: '11px' }}>{gw.webhookSecretMasked}</code>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--line)' }}>
                <button
                  onClick={() => handleTestConnection(gw)}
                  disabled={testingProvider === gw.provider}
                  className="btn btn-ghost btn-sm"
                  style={{ fontSize: '12px', color: 'var(--gold-hover)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <RefreshCw size={12} className={testingProvider === gw.provider ? 'spin' : ''} />
                  <span>{testingProvider === gw.provider ? 'Testing...' : 'Test Connection'}</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(gw)}
                  className="btn btn-secondary btn-sm"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                >
                  <Settings size={13} />
                  <span>Configure</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Test Result Toast/Banner */}
      {testResult && (
        <div
          className="card"
          style={{
            padding: '14px 18px',
            background: 'var(--paper)',
            border: '1px solid var(--gold)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Gateway Test Result ({testResult.provider}):</strong>
            <span style={{ marginLeft: '8px', color: 'var(--ink-soft)' }}>
              Mode: {testResult.mode} • Status: {testResult.status} — {testResult.message}
            </span>
          </div>
          <button onClick={() => setTestResult(null)} className="btn btn-ghost btn-sm">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Edit Gateway Modal */}
      {editingGateway && (
        <Modal
          isOpen={true}
          onClose={() => setEditingGateway(null)}
          title={`Configure Gateway — ${editingGateway.name}`}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '440px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Gateway Display Title
              </label>
              <input
                type="text"
                required
                className="input"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Operating Mode
                </label>
                <select
                  className="input"
                  value={formData.isLive ? 'LIVE' : 'SANDBOX'}
                  onChange={(e) => setFormData({ ...formData, isLive: e.target.value === 'LIVE' })}
                >
                  <option value="SANDBOX">Test Sandbox</option>
                  <option value="LIVE">Live Production</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Platform Gateway Fee (%)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className="input"
                  value={formData.feePercent}
                  onChange={(e) => setFormData({ ...formData, feePercent: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Public / Client API Key
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. CHAPUBK_TEST-..."
                value={formData.publicKey}
                onChange={(e) => setFormData({ ...formData, publicKey: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Secret API Key (Leave blank to keep current)
              </label>
              <input
                type="password"
                className="input"
                placeholder="Enter new secret key to update"
                value={formData.secretKey}
                onChange={(e) => setFormData({ ...formData, secretKey: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Webhook Secret (Leave blank to keep current)
              </label>
              <input
                type="password"
                className="input"
                placeholder="Webhook listener signature secret"
                value={formData.webhookSecret}
                onChange={(e) => setFormData({ ...formData, webhookSecret: e.target.value })}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Checkout Instructions for Tenants & Clients
              </label>
              <textarea
                rows={2}
                className="input"
                value={formData.instructions}
                onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isEnabled"
                checked={formData.isEnabled}
                onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
              />
              <label htmlFor="isEnabled" style={{ fontSize: '13px', cursor: 'pointer' }}>
                Enable this payment method across tenant checkouts
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setEditingGateway(null)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SystemAdminGatewaysPage;
