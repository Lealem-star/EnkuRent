import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ADMIN_NAV = [
  {
    path: '/admin/dashboard',
    label: 'Dashboard & Approvals',
    icon: (
      <svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18, display: 'block', flexShrink: 0 }}>
        <rect x="2.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="11.5" y="2.5" width="6" height="6" rx="1" />
        <rect x="2.5" y="11.5" width="6" height="6" rx="1" />
        <rect x="11.5" y="11.5" width="6" height="6" rx="1" />
      </svg>
    ),
  },
  {
    path: '/admin/owners',
    label: 'Building Owners',
    icon: (
      <svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18, display: 'block', flexShrink: 0 }}>
        <path d="M3 17V7l7-4 7 4v10" />
        <path d="M8 17v-6h4v6" />
      </svg>
    ),
  },
  {
    path: '/admin/audit',
    label: 'Platform Audit Log',
    icon: (
      <svg width={18} height={18} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" style={{ width: 18, height: 18, display: 'block', flexShrink: 0 }}>
        <circle cx="9" cy="10" r="6.5" />
        <path d="M9 6.5V10l2.5 1.5" />
      </svg>
    ),
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
        title: 'Platform Overview & Approvals',
        sub: 'Review pending building owner registrations and platform analytics',
      };
    }
    if (path.includes('/owners')) {
      return {
        title: 'Building Owners Directory',
        sub: 'Manage registered real estate clients and portfolio access',
      };
    }
    if (path.includes('/audit')) {
      return {
        title: 'Platform Audit Log',
        sub: 'Global administrative activity trail across all operations',
      };
    }
    return {
      title: 'System Administrator',
      sub: 'EnkuRent Property Management Platform',
    };
  };

  const header = getHeaderInfo();

  return (
    <div id="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="brand">
          <div
            className="brand-mark"
            style={{
              background: 'var(--gold)',
              color: '#211804',
              fontWeight: 700,
            }}
          >
            ⚡
          </div>
          <div>
            <div className="brand-name">EnkuRent</div>
            <div className="brand-sub">System Administrator</div>
          </div>
        </div>

        {/* User Identity Box */}
        <div
          style={{
            background: 'rgba(255,255,255,0.06)',
            borderRadius: '8px',
            padding: '10px 12px',
            marginBottom: '16px',
          }}
        >
          <div
            style={{
              fontSize: '12.5px',
              fontWeight: 600,
              color: '#fff',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              overflow: 'hidden',
            }}
          >
            {user?.name || 'System Admin'}
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
              SUPER ADMIN
            </span>
            <span
              style={{
                fontSize: '11px',
                color: '#9AA2BE',
                whiteSpace: 'nowrap',
                textOverflow: 'ellipsis',
                overflow: 'hidden',
              }}
            >
              {user?.email || 'admin@enkurent.et'}
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav">
          {ADMIN_NAV.map((item) => (
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
            style={{
              width: '100%',
              color: '#EDECE6',
              justifyContent: 'flex-start',
              padding: '6px 8px',
            }}
          >
            ← Sign Out
          </button>
          <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#7C83A0' }}>
            EnkuRent Platform Control
          </div>
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
              <h1>{header.title}</h1>
              {header.sub && <div className="topbar-sub">{header.sub}</div>}
            </div>
          </div>

          <div className="topbar-right">
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                color: 'var(--green)',
                background: 'var(--green-soft)',
                padding: '4px 10px',
                borderRadius: '12px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <span style={{ fontSize: '8px' }}>●</span> Platform Live
            </span>
          </div>
        </div>

        {/* Page Content */}
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SystemAdminLayout;
