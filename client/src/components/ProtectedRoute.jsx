import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, loading, user } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--paper)',
          color: 'var(--ink-soft)',
          fontSize: '13.5px',
        }}
      >
        Authenticating session...
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'OWNER') {
      return <Navigate to="/owner/dashboard" replace />;
    }
    if (user.role === 'MANAGER') {
      return <Navigate to="/manager/dashboard" replace />;
    }
    if (user.role === 'TENANT') {
      return <Navigate to="/tenant" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
