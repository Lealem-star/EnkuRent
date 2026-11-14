import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ETB, fmtDate } from '../../utils/formatters';
import {
  Building2,
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  X,
  RefreshCw,
  Eye,
  Mail,
  Phone,
  Layers,
  FileText,
  ShieldCheck,
  Building,
  CreditCard,
} from 'lucide-react';

export const SystemAdminOwnersPage = () => {
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialStatus = searchParams.get('status') || 'ALL';
  const [filter, setFilter] = useState(initialStatus);
  const [search, setSearch] = useState('');
  const [owners, setOwners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Reject modal state
  const [rejectingOwner, setRejectingOwner] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Detail Modal / Profile state
  const [selectedOwnerId, setSelectedOwnerId] = useState(null);
  const [detailData, setDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // overview | properties | team | subscriptions | invoices | activity

  const fetchOwners = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(`/system/owners?status=${filter}&search=${encodeURIComponent(search)}`);
      if (res.data?.success) {
        setOwners(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load building owners');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, search, toast]);

  useEffect(() => {
    fetchOwners();
  }, [fetchOwners]);

  const handleApprove = async (owner) => {
    try {
      const res = await api.post(`/system/owners/${owner.id}/approve`);
      if (res.data?.success) {
        toast(`Approved and activated owner account: ${owner.name}`);
        fetchOwners();
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
        toast(`Rejected owner registration for ${rejectingOwner.name}`);
        setRejectingOwner(null);
        setRejectReason('');
        fetchOwners();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reject owner');
    } finally {
      setProcessing(false);
    }
  };

  const handleToggleStatus = async (owner) => {
    try {
      const res = await api.patch(`/system/owners/${owner.id}/toggle-status`);
      if (res.data?.success) {
        toast(res.data.message || 'Status updated');
        fetchOwners();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to toggle account state');
    }
  };

  const handleViewDetails = async (ownerId) => {
    setSelectedOwnerId(ownerId);
    setActiveTab('overview');
    setLoadingDetail(true);
    try {
      const res = await api.get(`/system/owners/${ownerId}`);
      if (res.data?.success) {
        setDetailData(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load owner profile');
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header & Search Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Building Owners & Real Estate Clients Directory
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Manage client accounts, review registration workflows, and inspect property holdings
          </p>
        </div>

        <button
          onClick={() => fetchOwners(true)}
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
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setFilter(st);
                setSearchParams({ status: st });
              }}
              className={`btn btn-sm ${filter === st ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px' }}
            >
              {st === 'ALL' ? 'All Clients' : st.charAt(0) + st.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, email, company..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Owners Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
            <div>Loading client directory...</div>
          </div>
        ) : owners.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600 }}>No building owners found</div>
            <div style={{ fontSize: '12.5px', marginTop: '2px' }}>Try adjusting your search or approval filter.</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>CLIENT / OWNER</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>COMPANY</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>CONTACT</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>PORTFOLIO</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>SUBSCRIPTION</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>APPROVAL</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>ACCOUNT</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o) => (
                  <tr key={o.id} style={{ borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{o.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                        Registered {fmtDate(o.createdAt)}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>
                      {o.companyName || '—'}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontSize: '12.5px', color: 'var(--ink)' }}>{o.email}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>{o.phone}</div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                        {o.buildingsCount} {o.buildingsCount === 1 ? 'Building' : 'Buildings'}
                      </span>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                        {o.officesCount} units • {o.teamCount} staff
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      {o.subscription ? (
                        <div>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: 'var(--gold-soft)',
                              color: 'var(--gold-hover)',
                            }}
                          >
                            {o.subscription.planName}
                          </span>
                          <div style={{ fontSize: '10.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                            {o.subscription.status}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>No Plan Assigned</span>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
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
                              ? '#b45309'
                              : 'var(--red)',
                        }}
                      >
                        {o.approvalStatus}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          color: o.isActive ? 'var(--green)' : 'var(--red)',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: o.isActive ? 'var(--green)' : 'var(--red)',
                          }}
                        />
                        {o.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => handleViewDetails(o.id)}
                          className="btn btn-secondary btn-sm"
                          title="View Complete Owner Profile"
                          style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>Profile</span>
                        </button>

                        {o.approvalStatus === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleApprove(o)}
                              className="btn btn-sm"
                              title="Approve & Activate"
                              style={{
                                background: 'var(--green)',
                                color: '#ffffff',
                                border: 'none',
                                padding: '5px 8px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <Check size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => setRejectingOwner(o)}
                              className="btn btn-danger btn-sm"
                              title="Reject Application"
                              style={{ padding: '5px 8px' }}
                            >
                              <X size={13} />
                            </button>
                          </>
                        )}

                        {o.approvalStatus === 'APPROVED' && (
                          <button
                            onClick={() => handleToggleStatus(o)}
                            className={`btn btn-sm ${o.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              color: o.isActive ? 'var(--red)' : 'var(--green)',
                            }}
                          >
                            {o.isActive ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
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
      {rejectingOwner && (
        <Modal
          isOpen={true}
          onClose={() => setRejectingOwner(null)}
          title={`Reject Application — ${rejectingOwner.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-soft)' }}>
              Provide the client with an explanation or internal note for why this account application is declined:
            </p>
            <textarea
              rows={3}
              className="input"
              placeholder="e.g. Unverified commercial registration certificate."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => setRejectingOwner(null)}
                disabled={processing}
              >
                Cancel
              </button>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleReject}
                disabled={processing}
              >
                {processing ? 'Processing...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Complete Multi-Tab Owner Profile Modal */}
      {selectedOwnerId && (
        <Modal
          isOpen={true}
          onClose={() => {
            setSelectedOwnerId(null);
            setDetailData(null);
          }}
          title={detailData ? `Owner Profile: ${detailData.owner?.name} (${detailData.owner?.companyName || 'Individual'})` : 'Loading Owner...'}
        >
          {loadingDetail || !detailData ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
              <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
              <div>Fetching client details & portfolio...</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '600px', maxWidth: '840px' }}>
              {/* Tab Navigation */}
              <div
                style={{
                  display: 'flex',
                  gap: '6px',
                  borderBottom: '1px solid var(--line)',
                  paddingBottom: '8px',
                  overflowX: 'auto',
                }}
              >
                {[
                  { id: 'overview', label: 'Overview' },
                  { id: 'properties', label: `Properties (${detailData.buildings?.length || 0})` },
                  { id: 'team', label: `Team (${detailData.team?.length || 0})` },
                  { id: 'subscriptions', label: `Subscriptions (${detailData.subscriptions?.length || 0})` },
                  { id: 'invoices', label: `Invoices (${detailData.invoices?.length || 0})` },
                  { id: 'payments', label: `Rental Payments (${detailData.rentalPayments?.length || 0})` },
                  { id: 'documents', label: `Documents (${detailData.documents?.length || 0})` },
                  { id: 'activity', label: 'Activity Trail' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveTab(t.id)}
                    className={`btn btn-sm ${activeTab === t.id ? 'btn-primary' : 'btn-ghost'}`}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'overview' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', fontSize: '13px' }}>
                  <div style={{ background: 'var(--paper)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600 }}>CONTACT & BUSINESS</div>
                    <div style={{ marginTop: '6px', fontWeight: 600, color: 'var(--ink)' }}>{detailData.owner.name}</div>
                    <div style={{ color: 'var(--ink-soft)' }}>{detailData.owner.companyName || 'No Company Specified'}</div>
                    <div style={{ marginTop: '4px' }}>Email: {detailData.owner.email}</div>
                    <div>Phone: {detailData.owner.phone || '—'}</div>
                  </div>

                  <div style={{ background: 'var(--paper)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600 }}>ACCOUNT STATE</div>
                    <div style={{ marginTop: '6px' }}>
                      Status: <strong style={{ color: detailData.owner.isActive ? 'var(--green)' : 'var(--red)' }}>
                        {detailData.owner.isActive ? 'Active' : 'Suspended'}
                      </strong>
                    </div>
                    <div>Approval: <strong>{detailData.owner.approvalStatus}</strong></div>
                    <div>Joined: {fmtDate(detailData.owner.createdAt)}</div>
                  </div>

                  {detailData.owner.notes && (
                    <div style={{ gridColumn: 'span 2', background: 'var(--paper)', padding: '12px', borderRadius: '8px', border: '1px solid var(--line)' }}>
                      <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600 }}>INTERNAL NOTES</div>
                      <div style={{ marginTop: '4px', color: 'var(--ink)' }}>{detailData.owner.notes}</div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'properties' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detailData.buildings?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No properties registered under this owner yet.
                    </div>
                  ) : (
                    detailData.buildings.map((b) => (
                      <div
                        key={b.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'var(--paper)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{b.name}</div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                            {b.address} • {b.floors} Floors • {b.offices?.length || 0} Offices
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'team' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.team?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No managers or accountants registered for this client.
                    </div>
                  ) : (
                    detailData.team.map((m) => (
                      <div
                        key={m.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--paper)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12.5px',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--ink)' }}>{m.name}</strong> ({m.role})
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>{m.email} • {m.phone || '—'}</div>
                        </div>
                        <span style={{ fontSize: '11px', color: m.isActive ? 'var(--green)' : 'var(--red)', fontWeight: 600 }}>
                          {m.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'subscriptions' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detailData.subscriptions?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No subscriptions found for this owner.
                    </div>
                  ) : (
                    detailData.subscriptions.map((s) => (
                      <div
                        key={s.id}
                        style={{
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'var(--paper)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--ink)' }}>
                            {s.plan?.name || 'Standard'} Plan ({s.billingCycle})
                          </div>
                          <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
                            Valid from {fmtDate(s.startDate)} to {fmtDate(s.endDate)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 700,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: s.status === 'ACTIVE' ? 'var(--green-soft)' : 'var(--amber-soft)',
                              color: s.status === 'ACTIVE' ? 'var(--green)' : '#b45309',
                            }}
                          >
                            {s.status}
                          </span>
                          <div style={{ fontSize: '12.5px', fontWeight: 600, fontFamily: 'var(--font-num)', marginTop: '2px' }}>
                            {ETB(s.amount)}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'invoices' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.invoices?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No subscription invoices generated for this client.
                    </div>
                  ) : (
                    detailData.invoices.map((inv) => (
                      <div
                        key={inv.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--paper)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12.5px',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--ink)' }}>{inv.invoiceNumber}</strong> • {inv.period}
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>{inv.paymentMethod}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--font-num)' }}>{ETB(inv.amount)}</div>
                          <span style={{ fontSize: '10.5px', color: inv.status === 'APPROVED' ? 'var(--green)' : '#b45309', fontWeight: 600 }}>
                            {inv.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'payments' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.rentalPayments?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No tenant rental payments recorded for this owner's properties.
                    </div>
                  ) : (
                    detailData.rentalPayments.map((p) => (
                      <div
                        key={p.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--paper)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12.5px',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--ink)' }}>{p.tenant?.fullName || 'Tenant'}</strong> • {p.building?.name} (Unit {p.office?.number})
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                            Period: {p.period} • Method: {p.method}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontWeight: 700, fontFamily: 'var(--font-num)' }}>{ETB(p.amount)}</div>
                          <span style={{ fontSize: '10.5px', color: p.status === 'APPROVED' ? 'var(--green)' : p.status === 'PENDING' ? '#b45309' : 'var(--red)', fontWeight: 600 }}>
                            {p.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'documents' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.documents?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No submitted documents found for this owner.
                    </div>
                  ) : (
                    detailData.documents.map((d) => (
                      <div
                        key={d.id}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '6px',
                          background: 'var(--paper)',
                          border: '1px solid var(--line)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12.5px',
                        }}
                      >
                        <div>
                          <strong style={{ color: 'var(--ink)' }}>{d.name}</strong> ({d.type})
                          <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                            {d.buildingName} • Unit {d.officeNumber} • Tenant: {d.tenantName}
                          </div>
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                          {fmtDate(d.uploadedAt)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detailData.activity?.length === 0 ? (
                    <div style={{ padding: '20px', textAlign: 'center', color: 'var(--ink-soft)' }}>
                      No audit activity logged for this owner.
                    </div>
                  ) : (
                    detailData.activity.map((a) => (
                      <div
                        key={a.id}
                        style={{
                          padding: '8px 10px',
                          borderRadius: '6px',
                          background: 'var(--paper)',
                          fontSize: '12px',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <strong style={{ color: 'var(--ink)' }}>{a.action}</strong>
                          <span style={{ color: 'var(--ink-soft)' }}>{fmtDate(a.createdAt)}</span>
                        </div>
                        <div style={{ color: 'var(--ink-soft)', marginTop: '2px' }}>
                          By {a.actorName} • {a.meta ? (typeof a.meta === 'string' ? a.meta : JSON.stringify(a.meta)) : 'Activity'}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default SystemAdminOwnersPage;
