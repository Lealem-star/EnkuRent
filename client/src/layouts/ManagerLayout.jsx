import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  FileText,
  BarChart3,
  ShieldCheck,
  LogOut,
  Receipt,
  FileSpreadsheet,
} from 'lucide-react';

export const ManagerLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, buildings, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleSignOut = () => {
    logout();
    navigate('/login');
  };

  const isAccountant =
    user?.title?.toLowerCase().includes('accountant') || user?.role === 'ACCOUNTANT';

  // Role-scoped navigation menu
  const navItems = isAccountant
    ? [
        { path: '/manager/dashboard', label: 'Financial Dashboard', icon: LayoutDashboard },
        { path: '/manager/payments', label: 'Bank Slip Verification', icon: Receipt },
        { path: '/manager/contracts', label: 'Rent Schedules', icon: FileText },
        { path: '/manager/reports', label: 'Financial Statements', icon: BarChart3 },
        { path: '/manager/audit', label: 'Audit Trail', icon: ShieldCheck },
      ]
    : [
        { path: '/manager/dashboard', label: 'Operational Dashboard', icon: LayoutDashboard },
        { path: '/manager/properties', label: 'My Properties', icon: Building2 },
        { path: '/manager/tenants', label: 'Tenants & Onboarding', icon: Users },
        { path: '/manager/contracts', label: 'Leases & Contracts', icon: FileText },
        { path: '/manager/payments', label: 'Payments Oversight', icon: CreditCard },
        { path: '/manager/reports', label: 'Occupancy Reports', icon: BarChart3 },
        { path: '/manager/audit', label: 'Audit Trail', icon: ShieldCheck },
      ];

  const getHeaderInfo = () => {
    const path = location.pathname;
    if (path.includes('/dashboard')) {
      return {
        title: isAccountant ? 'Accounting Cash Flow & Verification' : 'Operational Dashboard',
        sub: isAccountant
          ? 'Review deposit slips, track outstanding balances, and verify receipts'
          : 'Building occupancy, tenant onboarding, and operational management',
      };
    }
    if (path.includes('/properties')) {
      return { title: 'My Properties', sub: 'Buildings and floor plans assigned to you' };
    }
    if (path.includes('/tenants')) {
      return { title: 'Tenants Directory', sub: 'Assigned tenant accounts, contacts, and leases' };
    }
    if (path.includes('/payments')) {
      return {
        title: isAccountant ? 'Bank Slip Verification Queue' : 'Payments & Verification',
        sub: 'Review uploaded bank slips, verify transfers, and record cash payments',
      };
    }
    if (path.includes('/contracts')) {
      return { title: 'Contracts & Leases', sub: 'Lease tracking, rent rates, and renewals' };
    }
    if (path.includes('/reports')) {
      return {
        title: isAccountant ? 'Financial Statements & Ledgers' : 'Property Reports',
        sub: isAccountant
          ? 'Income statements, collection rates, and reconciliation exports'
          : 'Occupancy statistics and rental collections for assigned properties',
      };
    }
    if (path.includes('/audit')) {
      return { title: 'Audit Trail', sub: 'Activity log for your assigned buildings' };
    }
    return {
      title: isAccountant ? 'Property Accountant Portal' : 'Property Manager Portal',
      sub: 'Enqopa RentPro — Enqopa Technologies PLC',
    };
  };

  const header = getHeaderInfo();
  const assignedBuildingNames =
    buildings
      .filter((b) => user?.buildingIds?.includes(b.id))
      .map((b) => b.name)
      .join(', ') || 'Assigned Properties';

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
        {/* Brand Logo Header */}
        <div style={{ padding: '0 4px 14px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '14px' }}>
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
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '10px',
            padding: '10px 12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: isAccountant
                  ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #0B2239 0%, #1e3a5f 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '12px',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              {isAccountant ? 'PA' : 'PM'}
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
                {user?.name || (isAccountant ? 'Selam Fikru' : 'Getnet A.')}
              </div>
              <div
                style={{
                  fontSize: '11px',
                  color: '#94a3b8',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                }}
              >
                {user?.email || 'staff@enqoparentpro.et'}
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
                fontSize: '9.5px',
                fontWeight: 700,
                letterSpacing: '0.05em',
                background: isAccountant ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                color: isAccountant ? '#34d399' : '#fbbf24',
                padding: '2px 7px',
                borderRadius: '9999px',
                border: `1px solid ${isAccountant ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'}`,
              }}
            >
              {isAccountant ? 'ACCOUNTANT' : 'PROPERTY MANAGER'}
            </span>
          </div>

          <div
            style={{
              fontSize: '10.5px',
              color: '#94a3b8',
              marginTop: '6px',
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
        <nav className="nav" style={{ flex: 1 }}>
          {navItems.map((item) => {
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
                  padding: '8px 10px',
                  fontSize: '12.5px',
                  borderRadius: '6px',
                  marginBottom: '2px',
                }}
              >
                <Icon size={16} style={{ flexShrink: 0 }} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
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

export default ManagerLayout;
