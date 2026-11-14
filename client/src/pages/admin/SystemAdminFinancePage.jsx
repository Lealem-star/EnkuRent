import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import StatCard from '../../components/StatCard';
import { ETB, fmtDate } from '../../utils/formatters';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Search,
  CheckCircle2,
  Clock,
  Layers,
  Building2,
} from 'lucide-react';

export const SystemAdminFinancePage = () => {
  const { toast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('saas'); // saas | rental
  const [search, setSearch] = useState('');

  const fetchFinance = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/admin/finance/overview');
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load financial records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchFinance();
  }, [fetchFinance]);

  const handleExportExcel = () => {
    window.open('http://localhost:5000/api/admin/finance/export/excel', '_blank');
  };

  const handleExportPDF = () => {
    window.open('http://localhost:5000/api/admin/finance/export/pdf', '_blank');
  };

  if (loading) {
    return (
      <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
        <RefreshCw className="spin" size={26} style={{ margin: '0 auto 10px', color: 'var(--gold)' }} />
        <div>Loading financial ledgers & transaction aggregates...</div>
      </div>
    );
  }

  const saas = data?.saasRevenue || {};
  const rental = data?.landlordRentVolume || {};
  const recentInvoices = (data?.recentSubInvoices || []).filter((inv) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inv.invoiceNumber?.toLowerCase().includes(q) ||
      inv.owner?.name?.toLowerCase().includes(q) ||
      inv.owner?.companyName?.toLowerCase().includes(q) ||
      inv.period?.toLowerCase().includes(q)
    );
  });

  const recentRental = (data?.recentRentalTransactions || []).filter((p) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      p.tenant?.fullName?.toLowerCase().includes(q) ||
      p.building?.name?.toLowerCase().includes(q) ||
      p.period?.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
      {/* Top Header & Export Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Platform Finance & Revenue Operations
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Strict separation between Enqopa SaaS software income and managed landlords' rental payments
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => fetchFinance(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileSpreadsheet size={15} style={{ color: '#16a34a' }} />
            <span>Export Excel</span>
          </button>
          <button
            onClick={handleExportPDF}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <FileText size={15} />
            <span>Export PDF Statement</span>
          </button>
        </div>
      </div>

      {/* KPI CARDS (Enqopa SaaS Revenue) */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(11, 34, 57, 0.04) 0%, rgba(245, 158, 11, 0.09) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.28)',
          borderRadius: '12px',
          padding: '20px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: 'var(--gold)',
                display: 'inline-block',
              }}
            />
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
              Enqopa SaaS Subscription Revenue (Company Income)
            </h3>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--gold-hover)', fontWeight: 600 }}>
            {saas.activePayingOwners || 0} Active Paying Subscriptions
          </span>
        </div>

        <div className="stats-grid">
          <StatCard
            label="Monthly Recurring Revenue (MRR)"
            value={ETB(saas.mrr || 0)}
            sub="Active recurring monthly run-rate"
            icon={TrendingUp}
          />
          <StatCard
            label="Annual Recurring Revenue (ARR)"
            value={ETB(saas.arr || 0)}
            sub="Projected annual contract value"
            icon={CreditCard}
          />
          <StatCard
            label="Total Subscription Collected"
            value={ETB(saas.totalCollected || 0)}
            sub={`${saas.approvedInvoicesCount || 0} approved platform invoices`}
            icon={DollarSign}
          />
          <StatCard
            label="Pending Subscription Invoices"
            value={ETB(saas.pendingRevenue || 0)}
            sub={`${saas.pendingInvoicesCount || 0} unpaid / trial invoices`}
            icon={Clock}
          />
        </div>
      </div>

      {/* MANAGED CLIENT RENTAL VOLUME SUMMARY (Clear Boundary) */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          background: 'var(--paper)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <div style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Managed Landlord Rental Volume (Client Escrow)
          </div>
          <div style={{ fontSize: '19px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)', marginTop: '2px' }}>
            {ETB(rental.totalCollectedRent || 0)}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
            Total rent paid by commercial tenants to property owners • {rental.approvedPaymentsCount || 0} verified transactions
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Pending Tenant Rent Verification:</div>
          <div style={{ fontSize: '15px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
            {ETB(rental.pendingRent || 0)}
          </div>
        </div>
      </div>

      {/* PLAN REVENUE BREAKDOWN */}
      {saas.planBreakdown && saas.planBreakdown.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <h4 style={{ fontSize: '14.5px', fontWeight: 700, margin: '0 0 14px', color: 'var(--ink)' }}>
            Subscription Revenue Breakdown by Plan Tier
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            {saas.planBreakdown.map((p) => (
              <div
                key={p.planId}
                style={{
                  padding: '14px',
                  borderRadius: '8px',
                  background: 'var(--paper)',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong style={{ fontSize: '14px', color: 'var(--ink)' }}>{p.planName}</strong>
                  <span style={{ fontSize: '11px', color: 'var(--gold)', fontWeight: 600 }}>
                    {p.activeCount} {p.activeCount === 1 ? 'Owner' : 'Owners'}
                  </span>
                </div>
                <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)', marginTop: '6px' }}>
                  {ETB(p.totalRevenue)}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                  Active software licenses
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LEDGER TABS & TRANSACTION FEED */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setActiveTab('saas')}
              className={`btn btn-sm ${activeTab === 'saas' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px' }}
            >
              Enqopa SaaS Invoices ({recentInvoices.length})
            </button>
            <button
              onClick={() => setActiveTab('rental')}
              className={`btn btn-sm ${activeTab === 'rental' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px' }}
            >
              Landlord Rental Payments ({recentRental.length})
            </button>
          </div>

          <div style={{ position: 'relative', width: '260px' }}>
            <Search size={14} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
            <input
              type="text"
              className="input"
              placeholder="Search records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '30px', fontSize: '12.5px', height: '34px' }}
            />
          </div>
        </div>

        {activeTab === 'saas' ? (
          recentInvoices.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-soft)' }}>
              No subscription invoices match your search.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>INVOICE #</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>OWNER / COMPANY</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>TIER</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>PERIOD</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>METHOD</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>AMOUNT</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvoices.map((inv) => (
                    <tr key={inv.id} style={{ borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>
                        {inv.invoiceNumber}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{inv.owner?.name}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>{inv.owner?.companyName || inv.owner?.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: 'var(--gold-soft)', color: 'var(--gold-hover)' }}>
                          {inv.subscription?.plan?.name || 'Standard'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>
                        {inv.period}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
                        {inv.paymentMethod}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
                        {ETB(inv.amount)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: inv.status === 'APPROVED' ? 'var(--green-soft)' : 'var(--amber-soft)', color: inv.status === 'APPROVED' ? 'var(--green)' : '#b45309' }}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          recentRental.length === 0 ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--ink-soft)' }}>
              No rental transactions match your search.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>TENANT</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>BUILDING / UNIT</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>PERIOD</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>METHOD</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>AMOUNT</th>
                    <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>STATUS</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRental.map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>
                        {p.tenant?.fullName || '—'}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div>{p.building?.name || '—'}</div>
                        <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Unit {p.office?.number || '—'}</div>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>
                        {p.period}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
                        {p.method}
                      </td>
                      <td style={{ padding: '12px 16px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
                        {ETB(p.amount)}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 7px', borderRadius: '4px', background: p.status === 'APPROVED' ? 'var(--green-soft)' : p.status === 'PENDING' ? 'var(--amber-soft)' : 'var(--red-soft)', color: p.status === 'APPROVED' ? 'var(--green)' : p.status === 'PENDING' ? '#b45309' : 'var(--red)' }}>
                          {p.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default SystemAdminFinancePage;
