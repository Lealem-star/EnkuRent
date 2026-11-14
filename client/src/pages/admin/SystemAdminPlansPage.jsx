import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ETB } from '../../utils/formatters';
import {
  Layers,
  Plus,
  Edit2,
  Archive,
  CheckCircle2,
  RefreshCw,
  Building2,
  Users,
  Clock,
  Sparkles,
} from 'lucide-react';

export const SystemAdminPlansPage = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Edit / Create Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [formData, setFormData] = useState({
    slug: '',
    name: '',
    description: '',
    priceMonthly: 3500,
    priceYearly: 35000,
    maxProperties: 2,
    maxOffices: 15,
    maxStaff: 2,
    trialDays: 14,
    gracePeriodDays: 7,
    isEnterprise: false,
    featuresText: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchPlans = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/plans');
      if (res.data?.success) {
        setPlans(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load plans');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      slug: '',
      name: '',
      description: '',
      priceMonthly: 5000,
      priceYearly: 50000,
      maxProperties: 5,
      maxOffices: 30,
      maxStaff: 4,
      trialDays: 14,
      gracePeriodDays: 7,
      isEnterprise: false,
      featuresText: 'Up to 30 Offices\nAutomated Invoicing\nDedicated Support',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setEditingPlan(plan);
    setFormData({
      slug: plan.slug,
      name: plan.name,
      description: plan.description || '',
      priceMonthly: plan.priceMonthly,
      priceYearly: plan.priceYearly,
      maxProperties: plan.maxProperties,
      maxOffices: plan.maxOffices,
      maxStaff: plan.maxStaff,
      trialDays: plan.trialDays,
      gracePeriodDays: plan.gracePeriodDays,
      isEnterprise: plan.isEnterprise,
      featuresText: Array.isArray(plan.features) ? plan.features.join('\n') : '',
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const features = formData.featuresText
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);

      const payload = {
        ...formData,
        features,
      };

      if (editingPlan) {
        await api.put(`/plans/${editingPlan.id}`, payload);
        toast(`Updated plan '${formData.name}' successfully`);
      } else {
        await api.post('/plans', payload);
        toast(`Created new plan '${formData.name}' successfully`);
      }

      setModalOpen(false);
      fetchPlans();
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to save plan');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleArchive = async (plan) => {
    try {
      const res = await api.patch(`/plans/${plan.id}/toggle-status`);
      if (res.data?.success) {
        toast(res.data.message || 'Plan state updated');
        fetchPlans();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update plan status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Subscription Plan Entitlements & Pricing
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Configure commercial tiers, office limits, trial periods, and feature entitlements
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchPlans(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Create New Plan</span>
          </button>
        </div>
      </div>

      {/* Plans Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
          <div>Loading subscription plans...</div>
        </div>
      ) : plans.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <Layers size={36} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600 }}>No subscription plans found</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {plans.map((p) => (
            <div
              key={p.id}
              className="card"
              style={{
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: p.isEnterprise ? '2px solid var(--gold)' : '1px solid var(--line)',
                position: 'relative',
              }}
            >
              {p.isEnterprise && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-10px',
                    right: '18px',
                    background: 'var(--gold)',
                    color: '#0b2239',
                    fontSize: '10px',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    textTransform: 'uppercase',
                    boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
                  }}
                >
                  Enterprise Tier
                </div>
              )}

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                      {p.name}
                    </h3>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                      Slug: <code>{p.slug}</code>
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: p.isActive ? 'var(--green-soft)' : 'var(--red-soft)',
                      color: p.isActive ? 'var(--green)' : 'var(--red)',
                    }}
                  >
                    {p.isActive ? 'Active' : 'Archived'}
                  </span>
                </div>

                <p style={{ margin: '12px 0 16px', fontSize: '13px', color: 'var(--ink-soft)', minHeight: '38px' }}>
                  {p.description || 'Comprehensive rental management package.'}
                </p>

                {/* Pricing Box */}
                <div
                  style={{
                    background: 'var(--paper)',
                    padding: '14px',
                    borderRadius: '8px',
                    border: '1px solid var(--line)',
                    marginBottom: '16px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
                      {ETB(p.priceMonthly)}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>/ month</span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--gold-hover)', marginTop: '3px', fontWeight: 600 }}>
                    {ETB(p.priceYearly)} billed annually
                  </div>
                </div>

                {/* Limit Badges */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px', fontSize: '12px' }}>
                  <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>Property Limit</div>
                    <strong style={{ color: 'var(--ink)' }}>{p.maxProperties >= 999 ? 'Unlimited' : `${p.maxProperties} Properties`}</strong>
                  </div>
                  <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>Unit / Office Limit</div>
                    <strong style={{ color: 'var(--ink)' }}>{p.maxOffices >= 9999 ? 'Unlimited' : `${p.maxOffices} Offices`}</strong>
                  </div>
                  <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>Staff Accounts</div>
                    <strong style={{ color: 'var(--ink)' }}>{p.maxStaff >= 999 ? 'Unlimited' : `${p.maxStaff} Users`}</strong>
                  </div>
                  <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', border: '1px solid var(--line)' }}>
                    <div style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>Trial / Grace</div>
                    <strong style={{ color: 'var(--ink)' }}>{p.trialDays}d / {p.gracePeriodDays}d</strong>
                  </div>
                </div>

                {/* Feature List */}
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', marginBottom: '8px' }}>
                    Entitled Features
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(Array.isArray(p.features) ? p.features : []).map((feat, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12.5px', color: 'var(--ink)' }}>
                        <CheckCircle2 size={14} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '14px', borderTop: '1px solid var(--line)' }}>
                <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                  {p.activeSubscriptionsCount} Active {p.activeSubscriptionsCount === 1 ? 'Subscriber' : 'Subscribers'}
                </span>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="btn btn-secondary btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                  >
                    <Edit2 size={13} />
                    <span>Edit</span>
                  </button>
                  <button
                    onClick={() => handleToggleArchive(p)}
                    className="btn btn-ghost btn-sm"
                    style={{ fontSize: '12px', color: p.isActive ? 'var(--red)' : 'var(--green)' }}
                  >
                    {p.isActive ? 'Archive' : 'Restore'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title={editingPlan ? `Edit Subscription Plan — ${editingPlan.name}` : 'Create Subscription Plan'}
        >
          <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '480px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Plan Name *
                </label>
                <input
                  type="text"
                  required
                  className="input"
                  placeholder="e.g. Growth"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Slug (Unique Identifier) *
                </label>
                <input
                  type="text"
                  required
                  disabled={Boolean(editingPlan)}
                  className="input"
                  placeholder="e.g. growth"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Description
              </label>
              <input
                type="text"
                className="input"
                placeholder="Brief plan summary for owners"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Monthly Price (ETB) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  className="input"
                  value={formData.priceMonthly}
                  onChange={(e) => setFormData({ ...formData, priceMonthly: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Yearly Price (ETB) *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  className="input"
                  value={formData.priceYearly}
                  onChange={(e) => setFormData({ ...formData, priceYearly: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Max Properties
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="input"
                  value={formData.maxProperties}
                  onChange={(e) => setFormData({ ...formData, maxProperties: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Max Offices / Units
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="input"
                  value={formData.maxOffices}
                  onChange={(e) => setFormData({ ...formData, maxOffices: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Max Staff Accounts
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  className="input"
                  value={formData.maxStaff}
                  onChange={(e) => setFormData({ ...formData, maxStaff: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Trial Days
                </label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={formData.trialDays}
                  onChange={(e) => setFormData({ ...formData, trialDays: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Grace Period Days
                </label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={formData.gracePeriodDays}
                  onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Entitled Features (One per line)
              </label>
              <textarea
                rows={4}
                className="input"
                placeholder="e.g.&#10;Up to 50 Offices&#10;Chapa Payment Gateway&#10;Priority Telephone Support"
                value={formData.featuresText}
                onChange={(e) => setFormData({ ...formData, featuresText: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                id="isEnterprise"
                checked={formData.isEnterprise}
                onChange={(e) => setFormData({ ...formData, isEnterprise: e.target.checked })}
              />
              <label htmlFor="isEnterprise" style={{ fontSize: '13px', cursor: 'pointer' }}>
                Mark as Enterprise Plan (Custom Multi-Tower Complex)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setModalOpen(false)}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                {saving ? 'Saving...' : editingPlan ? 'Save Changes' : 'Create Plan'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SystemAdminPlansPage;
