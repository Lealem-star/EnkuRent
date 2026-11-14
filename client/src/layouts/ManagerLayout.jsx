import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopNavUserProfile } from '../components/TopNavUserProfile';
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
        <div
          style={{
            padding: '6px 6px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src="/logo.jpg"
            alt="Enqopa RentPro"
            style={{
              height: '40px',
              width: 'auto',
              borderRadius: '8px',
              background: '#ffffff',
              padding: '4px 12px',
              objectFit: 'contain',
              boxShadow: '0 2px 8px rgba(0,0,0,0.25)',
            }}
          />
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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

          {/* Top Right User Profile */}
          <div className="topbar-right">
            <TopNavUserProfile
              user={user}
              roleLabel={isAccountant ? 'ACCOUNTANT' : 'PROPERTY MANAGER'}
              subText={assignedBuildingNames}
              onSignOut={handleSignOut}
            />
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
