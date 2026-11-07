import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ICONS = {
  home: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M3 10.5 10 4l7 6.5" />
      <path d="M5 9v7h10V9" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="10" cy="10" r="7" />
      <path d="M10 6v4l3 2" />
    </svg>
  ),
  receipt: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 2.5h10v15l-2-1.3-1.5 1.3-1.5-1.3-1.5 1.3L7 16.2l-2 1.3z" />
      <path d="M7.5 6.5h5M7.5 9.5h5" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="10" cy="7" r="3" />
      <path d="M4 17c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
    </svg>
  ),
};

export const TenantShell = () => {
  const { tenants, activeTenantId, setActiveTenantId } = useAuth();
  const navigate = useNavigate();

  const currentTenant = tenants.find((t) => t.id === activeTenantId) || tenants[0] || null;
  const office = currentTenant?.office || null;

  return (
    <div className="tenant-shell">
      {/* Top Header */}
      <div className="tenant-top">
        <div>
          <div className="tenant-top-office">
            {office ? `Office ${office.number} · ${office.buildingName}` : 'EnkuRent Portal'}
          </div>
          <h2>Hello, {currentTenant ? currentTenant.fullName.split(' ')[0] : 'Tenant'}</h2>
        </div>

        {/* Tenant Picker for quick demo switching */}
        {tenants.length > 0 && (
          <div className="tenant-switch">
            <select
              value={activeTenantId || ''}
              onChange={(e) => setActiveTenantId(e.target.value)}
              aria-label="Switch Tenant Profile"
            >
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.fullName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Main tab content */}
      <Outlet context={{ currentTenant }} />

      {/* Mobile-first bottom navigation bar */}
      <div className="tenant-nav">
        <NavLink
          to="/tenant"
          end
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {ICONS.home}
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/tenant/history"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {ICONS.history}
          <span>History</span>
        </NavLink>
        <NavLink
          to="/tenant/receipts"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {ICONS.receipt}
          <span>Receipts</span>
        </NavLink>
        <NavLink
          to="/tenant/profile"
          className={({ isActive }) => (isActive ? 'active' : '')}
        >
          {ICONS.profile}
          <span>Profile</span>
        </NavLink>
      </div>
    </div>
  );
};

export default TenantShell;

