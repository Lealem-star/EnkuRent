import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ETB, fmtDate } from '../../utils/formatters';
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  Clock,
  Calendar,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Eye,
  Sliders,
} from 'lucide-react';

export const SystemAdminSubscriptionsPage = () => {
  const { toast } = useToast();
  const [subscriptions, setSubscriptions] = useState([]);
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Assign Plan Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [owners, setOwners] = useState([]);
  const [plans, setPlans] = useState([]);
  const [assignForm, setAssignForm] = useState({
    ownerId: '',
    planId: '',
    billingCycle: 'YEARLY',
    trialDays: 0,
    notes: '',
  });
  const [assigning, setAssigning] = useState(false);

  // Extend / Modify Modal
  const [extendingSub, setExtendingSub] = useState(null);
  const [extendDays, setExtendDays] = useState(30);
  const [subStatus, setSubStatus] = useState('ACTIVE');
  const [modifying, setModifying] = useState(false);

  const fetchSubscriptions = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(`/subscriptions?status=${filter}&search=${encodeURIComponent(search)}`);
      if (res.data?.success) {
        setSubscriptions(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load subscriptions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, toast]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const handleOpenAssign = async () => {
    try {
      const [ownersRes, plansRes] = await Promise.all([
        api.get('/system/owners?status=APPROVED'),
        api.get('/plans'),
      ]);
      if (ownersRes.data?.success) setOwners(ownersRes.data.data);
      if (plansRes.data?.success) setPlans(plansRes.data.data);
      setAssignModalOpen(true);
    } catch (err) {
      toast('Failed to load owners or plans');
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignForm.ownerId || !assignForm.planId) {
      toast('Please select both an owner and a subscription plan');
      return;
    }
    setAssigning(true);
    try {
      const res = await api.post('/subscriptions/assign', assignForm);
      if (res.data?.success) {
        toast(res.data.message || 'Subscription assigned successfully');
        setAssignModalOpen(false);
        fetchSubscriptions();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to assign subscription');
    } finally {
      setAssigning(false);
    }
  };

  const handleOpenExtend = (sub) => {
    setExtendingSub(sub);
    setSubStatus(sub.status);
    setExtendDays(30);
  };

  const handleModifySubmit = async (e) => {
    e.preventDefault();
    if (!extendingSub) return;
    setModifying(true);
    try {
      const res = await api.patch(`/subscriptions/${extendingSub.id}/status`, {
        status: subStatus,
        extendDays: Number(extendDays),
      });
      if (res.data?.success) {
        toast('Subscription updated successfully');
        setExtendingSub(null);
        fetchSubscriptions();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update subscription');
    } finally {
      setModifying(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Commercial Subscription Lifecycle
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Monitor active landlord accounts, grace periods, extensions, and billing renewals
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchSubscriptions(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleOpenAssign}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Assign Plan</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'ACTIVE', 'TRIAL', 'GRACE_PERIOD', 'EXPIRED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px' }}
            >
              {st === 'ALL'
                ? 'All Statuses'
                : st === 'GRACE_PERIOD'
                ? 'Grace Period'
                : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by owner name, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
            <div>Loading subscriptions...</div>
          </div>
        ) : subscriptions.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <CreditCard size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600 }}>No subscriptions match filter</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>OWNER / COMPANY</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>TIER / PLAN</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>BILLING CYCLE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>AMOUNT</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>VALID UNTIL</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {subscriptions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{s.owner?.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                        {s.owner?.companyName || s.owner?.email}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <strong style={{ color: 'var(--ink)' }}>{s.plan?.name || 'Standard'}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                        {s.plan?.maxProperties} props • {s.plan?.maxOffices} units max
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>
                      {s.billingCycle === 'YEARLY' ? 'Annual Billed' : 'Monthly'}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
                        {ETB(s.amount)}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink)' }}>{fmtDate(s.endDate)}</div>
                      <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                        Started {fmtDate(s.startDate)}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            s.status === 'ACTIVE'
                              ? 'var(--green-soft)'
                              : s.status === 'TRIAL'
                              ? 'var(--blue-soft)'
                              : s.status === 'GRACE_PERIOD'
                              ? 'var(--amber-soft)'
                              : 'var(--red-soft)',
                          color:
                            s.status === 'ACTIVE'
                              ? 'var(--green)'
                              : s.status === 'TRIAL'
                              ? 'var(--blue)'
                              : s.status === 'GRACE_PERIOD'
                              ? '#b45309'
                              : 'var(--red)',
                        }}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleOpenExtend(s)}
                        className="btn btn-secondary btn-sm"
                        style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                      >
                        <Sliders size={13} />
                        <span>Manage</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Plan Modal */}
      {assignModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAssignModalOpen(false)}
          title="Assign Subscription Plan to Owner"
        >
          <form onSubmit={handleAssignSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '420px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Select Building Owner *
              </label>
              <select
                required
                className="input"
                value={assignForm.ownerId}
                onChange={(e) => setAssignForm({ ...assignForm, ownerId: e.target.value })}
              >
                <option value="">-- Choose registered owner --</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.companyName || o.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Subscription Plan Tier *
              </label>
              <select
                required
                className="input"
                value={assignForm.planId}
                onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
              >
                <option value="">-- Choose plan --</option>
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({ETB(p.priceMonthly)}/mo • {ETB(p.priceYearly)}/yr)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Billing Cycle
                </label>
                <select
                  className="input"
                  value={assignForm.billingCycle}
                  onChange={(e) => setAssignForm({ ...assignForm, billingCycle: e.target.value })}
                >
                  <option value="YEARLY">Yearly (Annual)</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Trial Days (0 for immediate active)
                </label>
                <input
                  type="number"
                  min={0}
                  className="input"
                  value={assignForm.trialDays}
                  onChange={(e) => setAssignForm({ ...assignForm, trialDays: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Administrative Notes
              </label>
              <input
                type="text"
                className="input"
                placeholder="e.g. Approved trial for Bole Plaza project."
                value={assignForm.notes}
                onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setAssignModalOpen(false)}
                disabled={assigning}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={assigning}>
                {assigning ? 'Assigning...' : 'Assign Subscription'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modify / Extend Modal */}
      {extendingSub && (
        <Modal
          isOpen={true}
          onClose={() => setExtendingSub(null)}
          title={`Manage Subscription — ${extendingSub.owner?.name}`}
        >
          <form onSubmit={handleModifySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '400px' }}>
            <div style={{ background: 'var(--paper)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)', fontSize: '12.5px' }}>
              <div>Current Plan: <strong>{extendingSub.plan?.name}</strong> ({extendingSub.billingCycle})</div>
              <div>Expires: <strong>{fmtDate(extendingSub.endDate)}</strong></div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Update Subscription Status
              </label>
              <select
                className="input"
                value={subStatus}
                onChange={(e) => setSubStatus(e.target.value)}
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="TRIAL">TRIAL</option>
                <option value="GRACE_PERIOD">GRACE_PERIOD</option>
                <option value="EXPIRED">EXPIRED</option>
                <option value="CANCELLED">CANCELLED</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Extend Period (Days)
              </label>
              <input
                type="number"
                min={0}
                className="input"
                value={extendDays}
                onChange={(e) => setExtendDays(e.target.value)}
              />
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                Adds days to the expiration date without altering property/tenant records.
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setExtendingSub(null)}
                disabled={modifying}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={modifying}>
                {modifying ? 'Updating...' : 'Save Updates'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SystemAdminSubscriptionsPage;
