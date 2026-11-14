import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BuildingSwitcher from '../components/BuildingSwitcher';
import Modal from '../components/Modal';
import api from '../services/api';
import { ETB, fmtDate } from '../utils/formatters';

const OWNER_NAV = [
  {
    path: '/owner/dashboard',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    path: '/owner/properties',
    label: 'Properties',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 17V7l7-4 7 4v10" />
        <path d="M8 17v-6h4v6" />
      </svg>
    ),
  },
  {
    path: '/owner/tenants',
    label: 'Tenants',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="7" cy="6.5" r="2.5" />
        <path d="M2 17c0-3 2.5-5 5-5s5 2 5 5" />
        <circle cx="14.5" cy="7.5" r="2" />
        <path d="M12.7 12.2c2.2.2 4.3 1.8 4.3 4.8" />
      </svg>
    ),
  },
  {
    path: '/owner/payments',
    label: 'Payments',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="5" width="16" height="11" rx="1.5" />
        <path d="M2 9h16" />
        <path d="M5 13h3" />
      </svg>
    ),
  },
  {
    path: '/owner/contracts',
    label: 'Contracts',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 2.5h7l3 3V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
        <path d="M7 8h6M7 11h6M7 14h4" />
      </svg>
    ),
  },
  {
    path: '/owner/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 16V6M9 16V3M14 16v-8" />
        <path d="M2.5 17.5h15" />
      </svg>
    ),
  },
  {
    path: '/owner/audit',
    label: 'Audit Log',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="10" r="6.5" />
        <path d="M9 6.5V10l2.5 1.5" />
      </svg>
    ),
  },
  {
    path: '/owner/users',
    label: 'Users & Managers',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="10" cy="6.5" r="3" />
        <path d="M4 17c0-3.5 2.7-6 6-6s6 2.5 6 6" />
      </svg>
    ),
  },
];

export const OwnerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [subData, setSubData] = useState(null);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchSub = async () => {
      try {
        const res = await api.get('/subscriptions/my-subscription');
        if (res.data?.success) {
          setSubData(res.data.data);
        }
      } catch {
        // fallback
      }
    };
    fetchSub();
  }, []);

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) {
      return { title: 'Executive Overview', sub: 'Portfolio-wide financial & tenancy health' };
    }
    if (path.includes('/properties')) {
      return { title: 'Properties & Buildings', sub: 'Manage buildings and floor plan inventory' };
    }
    if (path.includes('/tenants')) {
      return { title: 'Tenants Directory', sub: 'Active commercial leases and occupant files' };
    }
    if (path.includes('/payments')) {
      return { title: 'Rent Collections & Payments', sub: 'Audit and review all payment submissions' };
    }
    if (path.includes('/contracts')) {
      return { title: 'Contracts & Renewals', sub: 'Contract terms and 45-day expiring alerts' };
    }
    if (path.includes('/reports')) {
      return { title: 'Financial & Occupancy Reports', sub: 'Export monthly balance statements to PDF & Excel' };
    }
    if (path.includes('/audit')) {
      return { title: 'Audit Trail', sub: 'Immutable log of administrative & tenant activity' };
    }
    if (path.includes('/users')) {
      return { title: 'Users & Managers', sub: 'Assign property permissions to accountants & managers' };
    }
    return { title: 'Owner Console', sub: 'Enqopa RentPro' };
  };

  const header = getHeaderInfo();

  return (
    <div id="app">
      {/* Mobile Drawer Overlay Backdrop */}
      {sidebarOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 34, 57, 0.55)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            zIndex: 38,
          }}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="brand" style={{ padding: '0 4px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '16px' }}>
          <img
            src="/logo.jpg"
            alt="Enqopa RentPro"
            style={{
              height: '36px',
              width: 'auto',
              borderRadius: '6px',
              background: '#ffffff',
              padding: '2px 6px',
              objectFit: 'contain',
            }}
          />
        </div>

        {/* User Identity Box */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '10px',
          }}
        >
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
            {user?.name || 'Meseret Alemayehu'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                background: 'var(--gold)',
                color: '#211804',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              OWNER
            </span>
            <span style={{ fontSize: '11px', color: '#9AA2BE' }}>All Properties</span>
          </div>
        </div>

        {/* Subscription Tier & Quota Meter Widget */}
        <div
          onClick={() => setShowPlanModal(true)}
          style={{
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(11, 34, 57, 0.3) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.25)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '16px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          title="Click to view plan details & quotas"
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {subData?.plan?.name || 'Professional Plan'}
            </span>
            <span
              style={{
                fontSize: '9.5px',
                padding: '1px 5px',
                borderRadius: '4px',
                background: subData?.subscription?.status === 'ACTIVE' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: subData?.subscription?.status === 'ACTIVE' ? '#10B981' : '#F59E0B',
                fontWeight: 600,
              }}
            >
              {subData?.subscription?.status || 'ACTIVE'}
            </span>
          </div>

          <div style={{ fontSize: '10.5px', color: '#B9C0DA', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Properties:</span>
              <b style={{ color: '#fff' }}>
                {subData?.usage?.buildings?.current || 2} / {subData?.usage?.buildings?.max || 10}
              </b>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Offices:</span>
              <b style={{ color: '#fff' }}>
                {subData?.usage?.offices?.current || 30} / {subData?.usage?.offices?.max || 75}
              </b>
            </div>
          </div>

          <div style={{ marginTop: '6px', fontSize: '10px', color: '#F59E0B', fontWeight: 600, textAlign: 'right' }}>
            View Plan Details →
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav">
          {OWNER_NAV.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => (isActive ? 'active' : '')}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Sign Out & Footer */}
        <div className="sidebar-foot">
          <button
            onClick={handleSignOut}
            className="btn btn-sm btn-ghost"
            style={{ width: '100%', color: '#EDECE6', justifyContent: 'flex-start', padding: '6px 8px' }}
          >
            ← Sign Out
          </button>
          <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#7C83A0' }}>
            Addis Ababa, Ethiopia
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main">
        <div className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              className="menu-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle navigation menu"
            >
              ☰
            </button>
            <div>
              <h1>{header.title}</h1>
              {header.sub && <div className="topbar-sub">{header.sub}</div>}
            </div>
          </div>

          <div className="topbar-right">
            <BuildingSwitcher />
          </div>
        </div>

        <div className="content">
          <Outlet />
        </div>
      </div>

      {/* Subscription Plan & Entitlements Modal */}
      {showPlanModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowPlanModal(false)}
          title={`Enqopa SaaS Subscription — ${subData?.plan?.name || 'Professional Plan'}`}
          footer={
            <button className="btn btn-primary" onClick={() => setShowPlanModal(false)}>
              Close
            </button>
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', background: 'var(--surface-sunken)', padding: '12px 16px', borderRadius: '8px' }}>
            <div>
              <div style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-soft)' }}>
                Current Subscription
              </div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--ink)' }}>
                {subData?.plan?.name || 'Professional Plan'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                {subData?.subscription?.billingCycle || 'YEARLY'} Billing · Status: <b style={{ color: 'var(--green)' }}>{subData?.subscription?.status || 'ACTIVE'}</b>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Renews / Valid Until</div>
              <div style={{ fontSize: '14px', fontWeight: 700 }} className="mono">
                {subData?.subscription?.endDate ? fmtDate(subData.subscription.endDate) : 'Oct 24, 2027'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <h4 style={{ fontSize: '13px', margin: '0 0 8px', color: 'var(--ink)' }}>Portfolio Usage vs Plan Limits</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Properties</div>
                <div style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0' }}>
                  {subData?.usage?.buildings?.current || 2} / {subData?.usage?.buildings?.max || 10}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>Active in Portfolio</div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Rental Units</div>
                <div style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0' }}>
                  {subData?.usage?.offices?.current || 30} / {subData?.usage?.offices?.max || 75}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>Floor Plan Units</div>
              </div>
              <div style={{ border: '1px solid var(--line)', borderRadius: '6px', padding: '10px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Staff Accounts</div>
                <div style={{ fontSize: '16px', fontWeight: 700, margin: '4px 0' }}>
                  {subData?.usage?.staff?.current || 2} / {subData?.usage?.staff?.max || 5}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--green)', fontWeight: 600 }}>Managers &amp; Accountants</div>
              </div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: '13px', margin: '0 0 8px', color: 'var(--ink)' }}>Included Features</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Chapa, Telebirr &amp; CBE Birr Gateway</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Bank Deposit Slip Verification</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Automated PDF &amp; Excel Reports</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Tenant Mobile Portals &amp; QR Codes</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Contract Expiry Alerts (45 Days)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>✓ Immutable Platform Audit Trail</div>
            </div>
          </div>

          <div style={{ marginTop: '16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '6px', padding: '10px 14px', fontSize: '11.5px', color: 'var(--ink)' }}>
            Need more properties or custom enterprise workflows? Contact Enqopa Technologies platform support at <b>support@enqoparentpro.et</b> or <b>+251 911 000 000</b> to upgrade your tier.
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OwnerLayout;

