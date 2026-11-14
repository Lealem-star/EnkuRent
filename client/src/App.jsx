import React from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Layouts
import SystemAdminLayout from './layouts/SystemAdminLayout';
import OwnerLayout from './layouts/OwnerLayout';
import ManagerLayout from './layouts/ManagerLayout';
import TenantShell from './layouts/TenantShell';

// Public & Auth Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import PortalResolverPage from './pages/PortalResolverPage';

// Dashboards & Super Admin SaaS Pages
import SystemAdminDashboardPage from './pages/admin/SystemAdminDashboardPage';
import SystemAdminOwnersPage from './pages/admin/SystemAdminOwnersPage';
import SystemAdminPlansPage from './pages/admin/SystemAdminPlansPage';
import SystemAdminSubscriptionsPage from './pages/admin/SystemAdminSubscriptionsPage';
import SystemAdminFinancePage from './pages/admin/SystemAdminFinancePage';
import SystemAdminGatewaysPage from './pages/admin/SystemAdminGatewaysPage';
import SystemAdminUsersPage from './pages/admin/SystemAdminUsersPage';
import SystemAdminPropertiesPage from './pages/admin/SystemAdminPropertiesPage';
import SystemAdminSupportPage from './pages/admin/SystemAdminSupportPage';
import SystemAdminNotificationsPage from './pages/admin/SystemAdminNotificationsPage';
import SystemAdminSystemPage from './pages/admin/SystemAdminSystemPage';
import SystemAdminSettingsPage from './pages/admin/SystemAdminSettingsPage';
import OwnerDashboardPage from './pages/OwnerDashboardPage';
import ManagerDashboardPage from './pages/ManagerDashboardPage';

// Shared Estate Pages
import PropertiesPage from './pages/PropertiesPage';
import BuildingDetailPage from './pages/BuildingDetailPage';
import OfficeDetailPage from './pages/OfficeDetailPage';
import TenantsPage from './pages/TenantsPage';
import PaymentsPage from './pages/PaymentsPage';
import ContractsPage from './pages/ContractsPage';
import ReportsPage from './pages/ReportsPage';
import AuditLogPage from './pages/AuditLogPage';
import UsersPage from './pages/UsersPage';

// Tenant Pages
import TenantHomePage from './pages/tenant/TenantHomePage';
import TenantHistoryPage from './pages/tenant/TenantHistoryPage';
import TenantReceiptsPage from './pages/tenant/TenantReceiptsPage';
import TenantProfilePage from './pages/tenant/TenantProfilePage';

// Smart navigation helpers for direct/legacy links
const SmartDashboardRedirect = () => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'OWNER') return <Navigate to="/owner/dashboard" replace />;
  if (user.role === 'MANAGER') return <Navigate to="/manager/dashboard" replace />;
  return <Navigate to="/tenant" replace />;
};

const SmartRoleRedirect = ({ target }) => {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  const prefix = user.role === 'OWNER' ? '/owner' : '/manager';
  return <Navigate to={`${prefix}/${target}`} replace />;
};

const SmartParamRedirect = ({ target }) => {
  const { id } = useParams();
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (user.role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  const prefix = user.role === 'OWNER' ? '/owner' : '/manager';
  return <Navigate to={`${prefix}/${target}/${id}`} replace />;
};

function App() {
  return (
    <Routes>
      {/* Public Pages */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/about" element={<LandingPage />} />
      <Route path="/pricing" element={<LandingPage />} />
      <Route path="/contact" element={<LandingPage />} />

      {/* Authentication & Registration */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/portal/o/:officeId" element={<PortalResolverPage />} />

      {/* Legacy / Direct Route Compatibility */}
      <Route path="/dashboard" element={<SmartDashboardRedirect />} />
      <Route path="/properties" element={<SmartRoleRedirect target="properties" />} />
      <Route path="/properties/:id" element={<SmartParamRedirect target="properties" />} />
      <Route path="/office/:id" element={<SmartParamRedirect target="office" />} />
      <Route path="/tenants" element={<SmartRoleRedirect target="tenants" />} />
      <Route path="/payments" element={<SmartRoleRedirect target="payments" />} />
      <Route path="/contracts" element={<SmartRoleRedirect target="contracts" />} />
      <Route path="/reports" element={<SmartRoleRedirect target="reports" />} />
      <Route path="/audit" element={<SmartRoleRedirect target="audit" />} />
      <Route path="/users" element={<Navigate to="/owner/users" replace />} />

      {/* System Owner / Super Admin Shell & Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
            <SystemAdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="dashboard" element={<SystemAdminDashboardPage />} />
        <Route path="owners" element={<SystemAdminOwnersPage />} />
        <Route path="properties" element={<SystemAdminPropertiesPage />} />
        <Route path="users" element={<SystemAdminUsersPage />} />
        <Route path="plans" element={<SystemAdminPlansPage />} />
        <Route path="subscriptions" element={<SystemAdminSubscriptionsPage />} />
        <Route path="finance" element={<SystemAdminFinancePage />} />
        <Route path="integrations/payments" element={<SystemAdminGatewaysPage />} />
        <Route path="support" element={<SystemAdminSupportPage />} />
        <Route path="notifications" element={<SystemAdminNotificationsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="system" element={<SystemAdminSystemPage />} />
        <Route path="settings" element={<SystemAdminSettingsPage />} />
      </Route>

      {/* Building Owner Dedicated Shell & Routes */}
      <Route
        path="/owner"
        element={
          <ProtectedRoute allowedRoles={['OWNER']}>
            <OwnerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/owner/dashboard" replace />} />
        <Route path="dashboard" element={<OwnerDashboardPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<BuildingDetailPage />} />
        <Route path="office/:id" element={<OfficeDetailPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
        <Route path="users" element={<UsersPage />} />
      </Route>

      {/* Manager / Accountant Dedicated Shell & Routes */}
      <Route
        path="/manager"
        element={
          <ProtectedRoute allowedRoles={['MANAGER', 'OWNER']}>
            <ManagerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/manager/dashboard" replace />} />
        <Route path="dashboard" element={<ManagerDashboardPage />} />
        <Route path="properties" element={<PropertiesPage />} />
        <Route path="properties/:id" element={<BuildingDetailPage />} />
        <Route path="office/:id" element={<OfficeDetailPage />} />
        <Route path="tenants" element={<TenantsPage />} />
        <Route path="payments" element={<PaymentsPage />} />
        <Route path="contracts" element={<ContractsPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="audit" element={<AuditLogPage />} />
      </Route>

      {/* Tenant Mobile Portal Shell & Routes */}
      <Route
        path="/tenant"
        element={
          <ProtectedRoute allowedRoles={['TENANT', 'OWNER']}>
            <TenantShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<TenantHomePage />} />
        <Route path="history" element={<TenantHistoryPage />} />
        <Route path="receipts" element={<TenantReceiptsPage />} />
        <Route path="profile" element={<TenantProfilePage />} />
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
