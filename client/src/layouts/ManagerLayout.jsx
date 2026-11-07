import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BuildingSwitcher from '../components/BuildingSwitcher';

const MANAGER_NAV = [
  {
    path: '/manager/dashboard',
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
    path: '/manager/properties',
    label: 'My Properties',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 17V7l7-4 7 4v10" />
        <path d="M8 17v-6h4v6" />
      </svg>
    ),
  },
  {
    path: '/manager/tenants',
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
    path: '/manager/payments',
    label: 'Payments & Slips',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="2" y="5" width="16" height="11" rx="1.5" />
        <path d="M2 9h16" />
        <path d="M5 13h3" />
      </svg>
    ),
  },
  {
    path: '/manager/contracts',
    label: 'Contracts',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M5 2.5h7l3 3V17a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" />
        <path d="M7 8h6M7 11h6M7 14h4" />
      </svg>
    ),
  },
  {
    path: '/manager/reports',
    label: 'Reports',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 16V6M9 16V3M14 16v-8" />
        <path d="M2.5 17.5h15" />
      </svg>
    ),
  },
  {
    path: '/manager/audit',
    label: 'Audit Log',
    icon: (
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="9" cy="10" r="6.5" />
        <path d="M9 6.5V10l2.5 1.5" />
      </svg>
    ),
  },
];

export const ManagerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, buildings, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) {
      return { title: 'Operational Dashboard', sub: 'Building management & payment verification' };
    }
    if (path.includes('/properties')) {
      return { title: 'My Properties', sub: 'Buildings and floor plans assigned to you' };
    }
    if (path.includes('/tenants')) {
      return { title: 'Tenants Directory', sub: 'Assigned tenant accounts and contacts' };
    }
    if (path.includes('/payments')) {
      return { title: 'Payments & Verification', sub: 'Review tenant payment slips and record collections' };
    }
    if (path.includes('/contracts')) {
      return { title: 'Active Contracts', sub: 'Lease tracking and expiring contract alerts' };
    }
    if (path.includes('/reports')) {
      return { title: 'Financial Reports', sub: 'Revenue and collection summaries for your properties' };
    }
    if (path.includes('/audit')) {
      return { title: 'Audit Trail', sub: 'Activity log for your assigned buildings' };
    }
    return { title: 'Manager Portal', sub: 'EnkuRent' };
  };

  const header = getHeaderInfo();
  const assignedBuildingNames = buildings
    .filter((b) => user?.buildingIds?.includes(b.id))
    .map((b) => b.name)
    .join(', ') || 'Assigned Properties';

  return (
    <div id="app">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`} id="sidebar">
        <div className="brand">
          <div className="brand-mark">⚡</div>
          <div>
            <div className="brand-name">EnkuRent</div>
            <div className="brand-sub">Property Manager Portal</div>
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
          <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#fff' }}>
            {user?.name || 'Manager'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                background: 'var(--blue)',
                color: '#fff',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              {user?.title || 'MANAGER'}
            </span>
          </div>
          <div
            style={{
              fontSize: '10.5px',
              color: '#9AA2BE',
              marginTop: '4px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
            title={assignedBuildingNames}
          >
            📍 {assignedBuildingNames}
          </div>
        </div>

        {/* Navigation */}
        <nav className="nav">
          {MANAGER_NAV.map((item) => (
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
    </div>
  );
};

export default ManagerLayout;

