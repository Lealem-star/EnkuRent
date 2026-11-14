import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TopNavUserProfile } from '../components/TopNavUserProfile';

export const TenantLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src="/logo.jpg" alt="Enqopa RentPro" className="h-8 w-auto object-contain" />
            <div>
              <span className="text-xs text-amber-700 font-semibold ml-2 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                Tenant Portal
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <TopNavUserProfile
              user={user}
              roleLabel="TENANT"
              subText="Tenant Portal"
              onSignOut={handleLogout}
            />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default TenantLayout;

