import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  DollarSign,
  Zap,
  Users,
  Building,
  Headphones,
  Bell,
  ShieldCheck,
  Activity,
  Sliders,
  LogOut,
  ChevronRight,
} from 'lucide-react';

const ADMIN_NAV_SECTIONS = [
  {
    title: 'PLATFORM OVERSIGHT',
    items: [
      { path: '/admin/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
      { path: '/admin/owners', label: 'Building Owners', icon: Building2 },
      { path: '/admin/properties', label: 'Property Oversight', icon: Building },
      { path: '/admin/users', label: 'Global Users', icon: Users },
    ],
  },
  {
    title: 'COMMERCIAL & SAAS',
    items: [
      { path: '/admin/plans', label: 'Subscription Plans', icon: Layers },
      { path: '/admin/subscriptions', label: 'Subscriptions', icon: CreditCard },
      { path: '/admin/finance', label: 'Platform Finance', icon: DollarSign },
      { path: '/admin/integrations/payments', label: 'Payment Gateways', icon: Zap },
    ],
  },
  {
    title: 'OPERATIONS & SYSTEM',
    items: [
      { path: '/admin/support', label: 'Support Center', icon: Headphones },
      { path: '/admin/notifications', label: 'Announcements', icon: Bell },
      { path: '/admin/audit', label: 'Platform Audit Log', icon: ShieldCheck },
      { path: '/admin/system', label: 'System Health', icon: Activity },
      { path: '/admin/settings', label: 'Platform Settings', icon: Sliders },
    ],
  },
];

export const SystemAdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) {
      return {
        title: 'Executive Platform Dashboard',
        sub: 'Real-time SaaS revenue, landlord client metrics, and platform operations',
      };
    }
    if (path.includes('/owners')) {
      return {
        title: 'Building Owners Directory',
        sub: 'Manage landlord client accounts, review registration applications, and portfolio access',
      };
    }
    if (path.includes('/plans')) {
      return {
        title: 'Subscription Plan Management',
        sub: 'Configure tiers, pricing, unit limits, trial periods, and feature entitlements',
      };
    }
    if (path.includes('/subscriptions')) {
      return {
        title: 'Subscription Lifecycle Management',
        sub: 'Monitor active subscriptions, grace periods, renewals, and plan assignments',
      };
    }
    if (path.includes('/finance')) {
      return {
        title: 'Platform Financial Center',
        sub: 'Enqopa SaaS revenue ledger, landlord rental volume separation, and financial exports',
      };
    }
    if (path.includes('/integrations/payments')) {
      return {
        title: 'Payment Gateway Integrations',
        sub: 'Configure Chapa, Telebirr, CBE Birr, and direct deposit verification parameters',
      };
    }
    if (path.includes('/users')) {
      return {
        title: 'Global User Management',
        sub: 'Directory of all platform users across landlords, managers, accountants, and tenants',
      };
    }
    if (path.includes('/properties')) {
      return {
        title: 'Global Property & Tower Oversight',
        sub: 'Monitor all commercial buildings, towers, and unit occupancy across Ethiopia',
      };
    }
    if (path.includes('/support')) {
      return {
        title: 'Customer Support Desk',
        sub: 'Manage inquiries, technical support tickets, and landlord client communications',
      };
    }
    if (path.includes('/notifications')) {
      return {
        title: 'Platform Announcements',
        sub: 'Broadcast maintenance alerts, billing notices, and system-wide announcements',
      };
    }
    if (path.includes('/audit')) {
      return {
        title: 'Platform Audit Log',
        sub: 'Immutable security and operational event trail across all platform users',
      };
    }
    if (path.includes('/system')) {
      return {
        title: 'System Health & Maintenance',
        sub: 'Monitor server uptime, TiDB Cloud database connectivity, memory, and scheduled jobs',
      };
    }
    if (path.includes('/settings')) {
      return {
        title: 'Platform Configuration',
        sub: 'Localization, VAT rates, currency standards, and operational preferences',
      };
    }
    return {
      title: 'Platform Administration',
      sub: 'Enqopa RentPro — Enqopa Technologies PLC',
    };
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
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
        {/* Brand Logo Header */}
        <div style={{ padding: '0 4px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
        </div>

        {/* User Identity Box */}
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#0b2239',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(245, 158, 11, 0.35)',
              }}
            >
              SO
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div
                style={{
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#f8fafc',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {user?.name || 'System Owner'}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  marginTop: '1px',
                }}
              >
                {user?.email || 'admin@enqoparentpro.et'}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginTop: '8px',
              paddingTop: '6px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                background: 'rgba(245, 158, 11, 0.18)',
                color: '#fbbf24',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                padding: '2px 7px',
                borderRadius: '9999px',
              }}
            >
              SUPER ADMIN
            </span>
            <span style={{ fontSize: '10.5px', color: '#64748b' }}>Root Control</span>
          </div>
        </div>

        {/* Navigation Grouped Sections */}
        <nav
          className="nav"
          style={{
            flex: 1,
            overflowY: 'auto',
            paddingRight: '4px',
            marginBottom: '12px',
          }}
        >
          {ADMIN_NAV_SECTIONS.map((section, idx) => (
            <div key={idx} style={{ marginBottom: '14px' }}>
              <div
                style={{
                  fontSize: '9.5px',
                  fontWeight: 700,
                  color: '#64748b',
                  letterSpacing: '0.08em',
                  padding: '4px 10px',
                  textTransform: 'uppercase',
                }}
              >
                {section.title}
              </div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) => (isActive ? 'active' : '')}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '9px',
                      padding: '7px 10px',
                      fontSize: '12.5px',
                      borderRadius: '6px',
                      marginBottom: '2px',
                    }}
                  >
                    <Icon size={16} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sign Out */}
        <div
          className="sidebar-foot"
          style={{
            marginTop: 'auto',
            paddingTop: '12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <button
            onClick={handleSignOut}
            className="btn btn-sm btn-ghost"
            style={{
              width: '100%',
              color: '#EDECE6',
              justifyContent: 'flex-start',
              padding: '8px 10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <LogOut size={15} style={{ color: '#94a3b8' }} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="main">
        {/* Topbar */}
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
              <h1 style={{ fontSize: '19px', letterSpacing: '-0.02em', margin: 0, color: 'var(--ink)' }}>
                {header.title}
              </h1>
              {header.sub && (
                <div className="topbar-sub" style={{ fontSize: '12px', marginTop: '2px', color: 'var(--ink-soft)' }}>
                  {header.sub}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="content" style={{ padding: '24px 28px', maxWidth: '1440px', margin: '0 auto', width: '100%' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SystemAdminLayout;
