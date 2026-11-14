import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import {
  Sliders,
  Save,
  RefreshCw,
  Globe,
  DollarSign,
  ShieldAlert,
  Building,
} from 'lucide-react';

export const SystemAdminSettingsPage = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState([]);
  const [grouped, setGrouped] = useState({});
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/settings');
      if (res.data?.success) {
        const list = res.data.data.settings;
        setSettings(list);
        setGrouped(res.data.data.grouped);

        const initialValues = {};
        list.forEach((s) => {
          initialValues[s.key] = s.value;
        });
        setFormValues(initialValues);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load platform settings');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleChange = (key, value) => {
    setFormValues((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = Object.entries(formValues).map(([key, value]) => ({
        key,
        value: String(value),
      }));

      const res = await api.put('/admin/settings', { settings: payload });
      if (res.data?.success) {
        toast('Platform settings saved successfully');
        fetchSettings();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
        <RefreshCw className="spin" size={26} style={{ margin: '0 auto 10px', color: 'var(--gold)' }} />
        <div>Loading platform configuration parameters...</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Platform Configuration & Environment Settings
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Adjust localization, default currency, Ethiopian VAT rates, and operational parameters
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <Save size={15} />
          <span>{saving ? 'Saving...' : 'Save Settings'}</span>
        </button>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* General & Legal Identity */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Building size={18} style={{ color: 'var(--gold)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Branding & Corporate Entity
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Application Title
              </label>
              <input
                type="text"
                className="input"
                value={formValues.app_name || ''}
                onChange={(e) => handleChange('app_name', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Corporate Operating Entity
              </label>
              <input
                type="text"
                className="input"
                value={formValues.company_name || ''}
                onChange={(e) => handleChange('company_name', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Customer Support Email
              </label>
              <input
                type="email"
                className="input"
                value={formValues.support_email || ''}
                onChange={(e) => handleChange('support_email', e.target.value)}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Support Hotline Phone
              </label>
              <input
                type="text"
                className="input"
                value={formValues.support_phone || ''}
                onChange={(e) => handleChange('support_phone', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Financial & Fiscal Standards */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <DollarSign size={18} style={{ color: 'var(--green)' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Fiscal Standards & Ethiopian Tax Rate
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Primary Operating Currency
              </label>
              <input
                type="text"
                className="input"
                value={formValues.default_currency || 'ETB'}
                onChange={(e) => handleChange('default_currency', e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                Ethiopian Birr (ETB) is the official billing standard across all invoices.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Standard Value Added Tax (VAT %)
              </label>
              <input
                type="number"
                step="0.5"
                className="input"
                value={formValues.vat_percent || '15'}
                onChange={(e) => handleChange('vat_percent', e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                Applied to commercial software invoices according to Ethiopian Ministry of Revenues guidelines.
              </span>
            </div>
          </div>
        </div>

        {/* Platform Policy & Maintenance Mode */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <ShieldAlert size={18} style={{ color: '#b45309' }} />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Operational Grace Period & System Maintenance
            </h3>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Default Subscription Grace Period (Days)
              </label>
              <input
                type="number"
                min={0}
                className="input"
                value={formValues.grace_period_days || '7'}
                onChange={(e) => handleChange('grace_period_days', e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                Grace days granted before a past-due landlord account is restricted.
              </span>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Platform Maintenance Mode
              </label>
              <select
                className="input"
                value={formValues.maintenance_mode || 'false'}
                onChange={(e) => handleChange('maintenance_mode', e.target.value)}
              >
                <option value="false">Live Production (Normal Operation)</option>
                <option value="true">Maintenance Mode (Restrict non-admin access)</option>
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Configuration Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default SystemAdminSettingsPage;
