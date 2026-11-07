import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/StatCard';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';
import { ETB, fmtDate } from '../../utils/formatters';

export const SystemAdminDashboardPage = () => {
  const { toast } = useToast();

  const [overview, setOverview] = useState({
    totalOwners: 0,
    pendingOwners: 0,
    approvedOwners: 0,
    totalBuildings: 0,
    totalOffices: 0,
    occupiedOffices: 0,
    occupancyRate: 0,
    totalTenants: 0,
    totalCollected: 0,
  });

  const [owners, setOwners] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL | PENDING | APPROVED | REJECTED
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Reject Modal State
  const [rejectingOwner, setRejectingOwner] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewRes, ownersRes] = await Promise.all([
        api.get('/system/overview'),
        api.get(`/system/owners?status=${filter}&search=${encodeURIComponent(search)}`),
      ]);

      if (overviewRes.data?.success) {
        setOverview(overviewRes.data.data);
      }
      if (ownersRes.data?.success) {
        setOwners(ownersRes.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load system data');
    } finally {
      setLoading(false);
    }
  }, [filter, search, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleApprove = async (owner) => {
    try {
      const res = await api.post(`/system/owners/${owner.id}/approve`);
      if (res.data?.success) {
        toast(`Approved and activated owner account: ${owner.name}`);
        fetchData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to approve owner');
    }
  };

  const handleReject = async () => {
    if (!rejectingOwner) return;
    setProcessing(true);
    try {
      const res = await api.post(`/system/owners/${rejectingOwner.id}/reject`, {
        reason: rejectReason.trim(),
      });
      if (res.data?.success) {
        toast(`Rejected registration for ${rejectingOwner.name}`);
        setRejectingOwner(null);
        setRejectReason('');
        fetchData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reject registration');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (owner) => {
    try {
      const res = await api.patch(`/system/owners/${owner.id}/toggle-status`);
      if (res.data?.success) {
        toast(res.data.message || 'Updated owner status');
        fetchData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to toggle status');
    }
  };

  const safeOwners = Array.isArray(owners) ? owners : [];
  const pendingOwnersList = safeOwners.filter((o) => o?.approvalStatus === 'PENDING');

  return (
    <div>
      {/* Platform Metric Cards */}
      <div className="stats-grid">
        <StatCard
          label="Pending Approvals"
          value={overview?.pendingOwners ?? 0}
          subtext={(overview?.pendingOwners ?? 0) > 0 ? 'Requires immediate action' : 'Queue is clear'}
          valueStyle={{ color: (overview?.pendingOwners ?? 0) > 0 ? 'var(--amber)' : 'inherit' }}
          flag={
            (overview?.pendingOwners ?? 0) > 0
              ? {
                  text: `${overview.pendingOwners} Pending`,
                  style: { background: 'var(--amber-soft)', color: 'var(--amber)' },
                }
              : null
          }
        />
        <StatCard
          label="Approved Owners"
          value={overview?.approvedOwners ?? 0}
          subtext="Active building owners"
        />
        <StatCard
          label="Managed Buildings"
          value={overview?.totalBuildings ?? 0}
          subtext={`${overview?.totalOffices ?? 0} offices across platform`}
        />
        <StatCard
          label="Platform Occupancy"
          value={`${overview?.occupancyRate ?? 0}%`}
          subtext={`${overview?.occupiedOffices ?? 0} of ${overview?.totalOffices ?? 0} units occupied`}
        />
        <StatCard
          label="Platform Rent Volume"
          value={ETB(overview?.totalCollected ?? 0)}
          subtext="Total verified payments"
        />
      </div>

      {/* Section 1: Pending Approvals Queue */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-head">
          <div>
            <h3>Building Owner Registrations Awaiting Approval</h3>
            <div className="panel-sub">
              Review new landlords before granting access to properties, team managers, and tenant records
            </div>
          </div>
          {pendingOwnersList.length > 0 && (
            <span
              style={{
                background: 'var(--amber-soft)',
                color: 'var(--amber)',
                fontSize: '12px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '12px',
              }}
            >
              {pendingOwnersList.length} Pending
            </span>
          )}
        </div>

        {pendingOwnersList.length === 0 ? (
          <div className="panel-body">
            <div className="empty" style={{ padding: '32px 16px', color: 'var(--ink-soft)' }}>
              ✓ No pending building owner applications. All client registrations have been reviewed!
            </div>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Applicant / Owner</th>
                  <th>Company / Business</th>
                  <th>Contact Details</th>
                  <th>Portfolio Description</th>
                  <th>Applied On</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingOwnersList.map((o) => (
                  <tr key={o.id}>
                    <td className="cell-strong">{o.name}</td>
                    <td>{o.companyName || '—'}</td>
                    <td>
                      <div>{o.email}</div>
                      <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                        {o.phone || '—'}
                      </div>
                    </td>
                    <td style={{ maxWidth: '280px', fontSize: '12.5px', color: 'var(--ink-soft)' }}>
                      {o.notes || 'No description provided'}
                    </td>
                    <td>{fmtDate(o.createdAt)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleApprove(o)}
                        >
                          Approve &amp; Activate
                        </button>
                        <button
                          className="btn btn-sm btn-ghost"
                          style={{ color: 'var(--red)', borderColor: 'var(--red-soft)' }}
                          onClick={() => {
                            setRejectingOwner(o);
                            setRejectReason('');
                          }}
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Section 2: All Building Owners Directory */}
      <div className="panel" style={{ marginTop: '24px' }}>
        <div className="panel-head">
          <div>
            <h3>All Building Owners &amp; Clients Directory</h3>
            <div className="panel-sub">
              Manage landlord accounts, access privileges, and assigned property counts
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder="Search by name, email, company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '6px 12px', fontSize: '12.5px', width: '240px' }}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)', display: 'flex', gap: '8px' }}>
          {['ALL', 'APPROVED', 'PENDING', 'REJECTED'].map((st) => (
            <button
              key={st}
              className={`role-pill ${filter === st ? 'active' : ''}`}
              onClick={() => setFilter(st)}
              style={{ textTransform: 'capitalize' }}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="empty" style={{ padding: '30px' }}>Loading building owners...</div>
        ) : safeOwners.length === 0 ? (
          <div className="empty" style={{ padding: '30px' }}>No building owners match the current filter.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Owner Name</th>
                  <th>Company</th>
                  <th>Contact</th>
                  <th>Properties</th>
                  <th>Team Members</th>
                  <th>Approval Status</th>
                  <th>Account State</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {safeOwners.map((o) => (
                  <tr key={o.id}>
                    <td className="cell-strong">{o.name}</td>
                    <td>{o.companyName}</td>
                    <td>
                      <div>{o.email}</div>
                      <div className="mono" style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                        {o.phone || '—'}
                      </div>
                    </td>
                    <td>
                      <span className="mono" style={{ fontWeight: 600 }}>
                        {o.buildingsCount}
                      </span>{' '}
                      properties
                    </td>
                    <td>
                      <span className="mono">{o.teamCount}</span> staff
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: '4px',
                          background:
                            o.approvalStatus === 'APPROVED'
                              ? 'var(--green-soft)'
                              : o.approvalStatus === 'PENDING'
                              ? 'var(--amber-soft)'
                              : 'var(--red-soft)',
                          color:
                            o.approvalStatus === 'APPROVED'
                              ? 'var(--green)'
                              : o.approvalStatus === 'PENDING'
                              ? 'var(--amber)'
                              : 'var(--red)',
                        }}
                      >
                        {o.approvalStatus}
                      </span>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: '12px',
                          color: o.isActive ? 'var(--green)' : 'var(--ink-muted)',
                        }}
                      >
                        ● {o.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        {o.approvalStatus === 'PENDING' && (
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={() => handleApprove(o)}
                          >
                            Approve
                          </button>
                        )}
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => handleToggleStatus(o)}
                        >
                          {o.isActive ? 'Suspend' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      <Modal
        isOpen={!!rejectingOwner}
        onClose={() => setRejectingOwner(null)}
        title={`Reject Owner Application — ${rejectingOwner?.name}`}
        footer={
          <>
            <button className="btn" onClick={() => setRejectingOwner(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              style={{ background: 'var(--red)', borderColor: 'var(--red)' }}
              onClick={handleReject}
              disabled={processing}
            >
              {processing ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '13px', margin: '0 0 14px' }}>
          Provide an optional reason for rejecting <b>{rejectingOwner?.name}</b> ({rejectingOwner?.email}):
        </p>
        <div className="field">
          <label>Reason for Rejection (Optional)</label>
          <textarea
            rows={3}
            placeholder="e.g. Incomplete business verification, outside target operational territory."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default SystemAdminDashboardPage;
