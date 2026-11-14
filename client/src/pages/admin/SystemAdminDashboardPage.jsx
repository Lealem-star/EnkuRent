import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/StatCard';
import Modal from '../../components/Modal';
import { ETB, fmtDate } from '../../utils/formatters';
import {
  TrendingUp,
  CreditCard,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  ArrowRight,
  RefreshCw,
  Layers,
  DollarSign,
  Headphones,
  Activity,
  Filter,
  BarChart3,
  PieChart,
  Calendar,
} from 'lucide-react';

export const SystemAdminDashboardPage = () => {
  const { toast } = useToast();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState('all'); // all | 30d | 90d | ytd
  const [activeRevenueTab, setActiveRevenueTab] = useState('saas'); // saas | rental

  // Quick Approval / Reject Modal State
  const [rejectingOwner, setRejectingOwner] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(`/system/overview?dateRange=${dateRange}`);
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load executive metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [dateRange, toast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleApprove = async (owner) => {
    try {
      const res = await api.post(`/system/owners/${owner.id}/approve`);
      if (res.data?.success) {
        toast(`Approved and activated owner account: ${owner.name}`);
        fetchOverview();
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
        fetchOverview();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reject owner');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
        <RefreshCw className="spin" size={28} style={{ margin: '0 auto 12px', color: 'var(--gold)' }} />
        <div style={{ fontSize: '15px', fontWeight: 500 }}>Loading Enqopa RentPro Executive Dashboard...</div>
      </div>
    );
  }

  const saas = data?.saasFinance || {};
  const rental = data?.rentalFinance || {};
  const trends = data?.chartSeries?.monthlyTrends || [];
  const distribution = saas.subscriptionDistribution || [];
  const pendingOwners = data?.recentRegistrations?.filter((o) => o.approvalStatus === 'PENDING') || [];

  // Max value calculation for bar chart height normalization
  const maxSaasRevenue = Math.max(...trends.map((t) => t.saasRevenue), 1000);
  const maxRentalVolume = Math.max(...trends.map((t) => t.rentalVolume), 10000);
  const maxGrowth = Math.max(...trends.map((t) => Math.max(t.ownersCount, t.tenantsCount)), 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header & Period Filter Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Executive Platform Dashboard
          </h2>
          <p style={{ margin: '3px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Real-time SaaS recurring revenue, client property portfolios, and platform operations
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Date Filter Pills */}
          <div style={{ display: 'flex', background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: '8px', padding: '2px' }}>
            {[
              { id: 'all', label: 'All Time' },
              { id: '30d', label: 'Last 30 Days' },
              { id: '90d', label: 'Last 90 Days' },
              { id: 'ytd', label: 'This Year' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setDateRange(p.id)}
                className={`btn btn-sm ${dateRange === p.id ? 'btn-primary' : 'btn-ghost'}`}
                style={{ fontSize: '11.5px', padding: '4px 10px', height: '28px' }}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px' }}
          >
            <RefreshCw size={13} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>

          <Link
            to="/admin/finance"
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '32px' }}
          >
            <DollarSign size={14} />
            <span>Finance Ledger</span>
          </Link>
        </div>
      </div>

      {/* SECTION 1: REVENUE SPLIT & INTERACTIVE TOGGLE */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(11, 34, 57, 0.04) 0%, rgba(245, 158, 11, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--gold)',
                boxShadow: '0 0 8px var(--gold)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Revenue & Financial Performance Center
            </h3>
          </div>

          {/* Perspective Toggle Buttons */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setActiveRevenueTab('saas')}
              className={`btn btn-sm ${activeRevenueTab === 'saas' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
            >
              Enqopa SaaS Income (Software Revenue)
            </button>
            <button
              onClick={() => setActiveRevenueTab('rental')}
              className={`btn btn-sm ${activeRevenueTab === 'rental' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '11.5px', padding: '5px 12px' }}
            >
              Landlord Rental Flow (Client Volume)
            </button>
          </div>
        </div>

        {activeRevenueTab === 'saas' ? (
          <div className="stats-grid">
            <StatCard
              label="Monthly Recurring Revenue (MRR)"
              value={ETB(saas.mrr || 0)}
              sub="Active subscription run-rate"
              icon={TrendingUp}
            />
            <StatCard
              label="Annual Recurring Revenue (ARR)"
              value={ETB(saas.arr || 0)}
              sub="12-month forward projection"
              icon={CreditCard}
            />
            <StatCard
              label="Total SaaS Licenses Collected"
              value={ETB(saas.subscriptionRevenue || 0)}
              sub="Software license fees collected"
              icon={DollarSign}
            />
            <StatCard
              label="Active Paying Owners"
              value={String(saas.activeSubscriptionsCount || 0)}
              sub={`${saas.trialSubscriptionsCount || 0} active trial accounts`}
              icon={Users}
            />
          </div>
        ) : (
          <div className="stats-grid">
            <StatCard
              label="Verified Landlord Rent Volume"
              value={ETB(rental.totalVerifiedRentVolume || 0)}
              sub="Tenant rent collected across properties"
              icon={CheckCircle2}
            />
            <StatCard
              label="Registered Building Owners"
              value={String(data?.totalOwners || 0)}
              sub={`${data?.pendingOwners || 0} pending registration`}
              icon={Users}
            />
            <StatCard
              label="Total Commercial Properties"
              value={String(data?.totalBuildings || 0)}
              sub={`${data?.totalOffices || 0} total rental units`}
              icon={Building2}
            />
            <StatCard
              label="Platform Unit Occupancy"
              value={`${data?.occupancyRate || 0}%`}
              sub={`${data?.occupiedOffices || 0} occupied • ${data?.vacantOffices || 0} vacant`}
              icon={Activity}
            />
          </div>
        )}
      </div>

      {/* SECTION 2: VISUAL CHARTS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(440px, 1fr))', gap: '20px' }}>
        {/* CHART 1: Monthly SaaS Subscription Revenue Trend (MRR Bar Chart) */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <BarChart3 size={17} style={{ color: 'var(--gold)' }} />
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                  Monthly SaaS Revenue Trend (ETB)
                </h4>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Last 6 Months</span>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
              Enqopa subscription revenue generated from active commercial landlord tiers
            </p>

            {/* SVG Visual Bar Chart */}
            <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px' }}>
              {trends.map((t, idx) => {
                const heightPercent = Math.max(15, Math.round((t.saasRevenue / maxSaasRevenue) * 100));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ fontSize: '10.5px', fontWeight: 600, fontFamily: 'var(--font-num)', color: 'var(--ink)', marginBottom: '4px' }}>
                      {Math.round(t.saasRevenue / 1000)}k
                    </div>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '42px',
                        height: `${heightPercent}%`,
                        background: 'linear-gradient(180deg, #F59E0B 0%, #D97706 100%)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                      title={`${t.month}: ${ETB(t.saasRevenue)}`}
                    />
                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '8px', fontWeight: 600 }}>
                      {t.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: '16px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Current MRR Baseline:</span>
            <strong style={{ fontFamily: 'var(--font-num)', color: 'var(--gold-hover)' }}>{ETB(saas.mrr || 0)} / mo</strong>
          </div>
        </div>

        {/* CHART 2: Platform Growth (Owners & Tenants Multi-Metric Chart) */}
        <div className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <TrendingUp size={17} style={{ color: 'var(--green)' }} />
                <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                  Platform Growth & Client Adoption
                </h4>
              </div>
              <div style={{ display: 'flex', gap: '10px', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--ink)', borderRadius: '2px' }} />
                  Owners
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '8px', height: '8px', background: 'var(--green)', borderRadius: '2px' }} />
                  Tenants
                </span>
              </div>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
              Cumulative progression of registered building owners and active tenants
            </p>

            {/* Visual Grouped Progression */}
            <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px' }}>
              {trends.map((t, idx) => {
                const ownerH = Math.max(10, Math.round((t.ownersCount / maxGrowth) * 100));
                const tenantH = Math.max(15, Math.round((t.tenantsCount / maxGrowth) * 100));
                return (
                  <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '4px', width: '100%', maxWidth: '44px', alignItems: 'flex-end', height: '100%' }}>
                      <div
                        style={{
                          flex: 1,
                          height: `${ownerH}%`,
                          background: '#0B2239',
                          borderRadius: '3px 3px 0 0',
                        }}
                        title={`Owners: ${t.ownersCount}`}
                      />
                      <div
                        style={{
                          flex: 1,
                          height: `${tenantH}%`,
                          background: '#10B981',
                          borderRadius: '3px 3px 0 0',
                        }}
                        title={`Tenants: ${t.tenantsCount}`}
                      />
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '8px', fontWeight: 600 }}>
                      {t.month}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: '16px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Current Active Population:</span>
            <strong>{data?.totalOwners || 0} Landlords • {data?.totalTenants || 0} Tenants</strong>
          </div>
        </div>

        {/* CHART 3: Subscription Tier Distribution */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <PieChart size={17} style={{ color: 'var(--gold)' }} />
              <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                Subscription Distribution by Plan Tier
              </h4>
            </div>
            <Link to="/admin/plans" style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              Manage Tiers →
            </Link>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
            Active subscription share across Starter, Professional, and Enterprise packages
          </p>

          {/* Segmented Distribution Bar */}
          <div style={{ height: '14px', width: '100%', background: 'var(--line)', borderRadius: '9999px', overflow: 'hidden', display: 'flex', marginBottom: '16px' }}>
            {distribution.map((p) => (
              <div
                key={p.id}
                style={{
                  width: `${Math.max(p.sharePercent, 12)}%`,
                  height: '100%',
                  background: p.color,
                }}
                title={`${p.name}: ${p.count} subscribers (${p.sharePercent}%)`}
              />
            ))}
          </div>

          {/* Tier Cards Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {distribution.map((p) => (
              <div
                key={p.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '6px',
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                  fontSize: '12.5px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: p.color }} />
                  <strong style={{ color: 'var(--ink)' }}>{p.name}</strong>
                  <span style={{ color: 'var(--ink-soft)', fontSize: '11px' }}>({p.slug})</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>
                    {p.count} {p.count === 1 ? 'Owner' : 'Owners'}
                  </span>
                  <div style={{ fontSize: '11px', fontFamily: 'var(--font-num)', color: 'var(--ink-soft)' }}>
                    {ETB(p.revenue)} ARR
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CHART 4: Managed Landlord Rental Cash Flow */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CheckCircle2 size={17} style={{ color: 'var(--blue)' }} />
              <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                Managed Landlord Rental Collection Volume
              </h4>
            </div>
            <Link to="/admin/finance" style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              Full Ledger →
            </Link>
          </div>
          <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
            Total rent paid by commercial and residential tenants to landlords
          </p>

          {/* Visual Step Progression */}
          <div style={{ height: '160px', display: 'flex', alignItems: 'flex-end', gap: '14px', paddingTop: '10px' }}>
            {trends.map((t, idx) => {
              const h = Math.max(15, Math.round((t.rentalVolume / maxRentalVolume) * 100));
              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ fontSize: '10px', fontWeight: 600, fontFamily: 'var(--font-num)', color: 'var(--ink)', marginBottom: '4px' }}>
                    {Math.round(t.rentalVolume / 1000)}k
                  </div>
                  <div
                    style={{
                      width: '100%',
                      maxWidth: '42px',
                      height: `${h}%`,
                      background: 'linear-gradient(180deg, #0B2239 0%, #1e3a5f 100%)',
                      borderRadius: '4px 4px 0 0',
                    }}
                    title={`${t.month}: ${ETB(t.rentalVolume)}`}
                  />
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '8px', fontWeight: 600 }}>
                    {t.month}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ borderTop: '1px solid var(--line)', marginTop: '16px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
            <span style={{ color: 'var(--ink-soft)' }}>Cumulative Verified Rent:</span>
            <strong style={{ fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>{ETB(rental.totalVerifiedRentVolume || 0)}</strong>
          </div>
        </div>
      </div>

      {/* PENDING OWNER APPLICATIONS ACTION BANNER */}
      {data?.pendingOwners > 0 && (
        <div
          style={{
            background: 'var(--amber-soft)',
            border: '1px solid #fcd34d',
            borderRadius: '10px',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                background: '#fef3c7',
                border: '1px solid #f59e0b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#b45309',
                flexShrink: 0,
              }}
            >
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#92400e' }}>
                {data.pendingOwners} Building Owner Registration Application(s) Awaiting Review
              </div>
              <div style={{ fontSize: '12.5px', color: '#b45309', marginTop: '1px' }}>
                Verify client business information and approve their account to grant portal access.
              </div>
            </div>
          </div>

          <Link
            to="/admin/owners?status=PENDING"
            className="btn btn-sm"
            style={{
              background: '#b45309',
              color: '#ffffff',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              border: 'none',
              fontWeight: 600,
            }}
          >
            <span>Review Applications</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      )}

      {/* SECTION 3: RECENT ACTIVITIES & INVOICES SPLIT */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(460px, 1fr))', gap: '20px' }}>
        {/* Recent SaaS Invoices */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Recent Subscription Invoices
            </h4>
            <Link to="/admin/finance" style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              View All Invoices →
            </Link>
          </div>

          {(!data?.recentInvoices || data.recentInvoices.length === 0) ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '13px' }}>
              No subscription invoices generated yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recentInvoices.map((inv) => (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    background: 'var(--paper)',
                    border: '1px solid var(--line)',
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--ink)' }}>
                      {inv.owner?.companyName || inv.owner?.name || 'Client'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                      {inv.invoiceNumber} • {inv.period} • {inv.paymentMethod}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
                      {ETB(inv.amount)}
                    </div>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: inv.status === 'APPROVED' ? 'var(--green-soft)' : 'var(--amber-soft)',
                        color: inv.status === 'APPROVED' ? 'var(--green)' : '#b45309',
                      }}
                    >
                      {inv.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Audit Log Feed */}
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Recent Administrative Audit Events
            </h4>
            <Link to="/admin/audit" style={{ fontSize: '12px', color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}>
              Full Audit Trail →
            </Link>
          </div>

          {(!data?.recentAuditLogs || data.recentAuditLogs.length === 0) ? (
            <div style={{ padding: '30px 0', textAlign: 'center', color: 'var(--ink-soft)', fontSize: '13px' }}>
              No audit log entries recorded yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.recentAuditLogs.map((log) => (
                <div
                  key={log.id}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    background: 'var(--paper)',
                    fontSize: '12px',
                  }}
                >
                  <ShieldCheck size={16} style={{ color: 'var(--gold)', marginTop: '2px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{log.action}</span>
                      <span style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                        {fmtDate(log.createdAt)}
                      </span>
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      By {log.actorName} • {log.meta ? (typeof log.meta === 'string' ? log.meta : JSON.stringify(log.meta)) : 'System event'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Owner Modal */}
      {rejectingOwner && (
        <Modal
          isOpen={true}
          onClose={() => setRejectingOwner(null)}
          title={`Reject Application — ${rejectingOwner.name}`}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-soft)' }}>
              Please provide an internal reason or explanation for declining this registration:
            </p>
            <textarea
              rows={3}
              className="input"
              placeholder="e.g. Incomplete business license or unverifiable property documentation."
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
    </div>
  );
};

export default SystemAdminDashboardPage;
