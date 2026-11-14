import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [activeBuildingId, setActiveBuildingId] = useState(
    localStorage.getItem('active_building_id') || '__all__'
  );
  const [buildings, setBuildings] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch current session from token
  const loadUserSession = useCallback(async () => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      if (res.data?.success) {
        const userData = res.data.data;
        setUser(userData);
        if (userData.tenant) {
          setActiveTenantId(userData.tenant.id);
        }
      } else {
        localStorage.removeItem('token');
        setUser(null);
      }
    } catch (err) {
      console.warn('Session verification failed, logging out:', err.message);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch accessible buildings for current user
  const fetchBuildings = useCallback(async () => {
    try {
      const res = await api.get('/buildings');
      if (res.data?.success) {
        setBuildings(res.data.data || []);
      }
    } catch (err) {
      console.warn('Failed to fetch buildings:', err.message);
    }
  }, []);

  // Fetch tenants
  const fetchTenants = useCallback(async () => {
    try {
      const res = await api.get('/tenants');
      if (res.data?.success) {
        const list = res.data.data || [];
        setTenants(list);
        if (list.length > 0 && !activeTenantId) {
          setActiveTenantId(list[0].id);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch tenants:', err.message);
    }
  }, [activeTenantId]);

  useEffect(() => {
    loadUserSession();
  }, [loadUserSession]);

  useEffect(() => {
    if (user) {
      fetchBuildings();
      fetchTenants();
    }
  }, [user, fetchBuildings, fetchTenants]);

  // Login with credentials
  const login = async (emailOrPhone, password) => {
    setLoading(true);
    try {
      const isEmail = emailOrPhone.includes('@');
      const payload = isEmail
        ? { email: emailOrPhone.trim().toLowerCase(), password }
        : { phone: emailOrPhone.trim(), password };

      const res = await api.post('/auth/login', payload);
      if (res.data?.success) {
        const { token: newToken, user: newUser } = res.data.data;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);
        if (newUser.tenant) {
          setActiveTenantId(newUser.tenant.id);
        }
        return { success: true, user: newUser };
      }
      return { success: false, message: res.data?.message || 'Login failed' };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Invalid email or password',
      };
    } finally {
      setLoading(false);
    }
  };

  // Demo Login Helper
  const loginAsDemo = async (roleName) => {
    setLoading(true);
    try {
      let targetEmail = 'owner@enqoparentpro.et';
      if (roleName === 'accountant') {
        targetEmail = 'selam.fikru@enqoparentpro.et';
      } else if (roleName === 'manager') {
        targetEmail = 'getnet.a@enqoparentpro.et';
      } else if (roleName === 'tenant') {
        targetEmail = 'abebe.kebede.101@gmail.com';
      }

      const res = await api.post('/auth/login', {
        email: targetEmail,
        password: 'password123',
      });

      if (res.data?.success) {
        const { token: newToken, user: newUser } = res.data.data;
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(newUser);

        if (newUser.tenant) {
          setActiveTenantId(newUser.tenant.id);
        }

        // Set default building scoping
        if (newUser.buildingIds && newUser.buildingIds.length > 0) {
          setActiveBuildingId(newUser.buildingIds[0]);
        } else {
          setActiveBuildingId('__all__');
        }

        return { success: true, user: newUser };
      }
      return { success: false, message: res.data?.message };
    } catch (err) {
      return {
        success: false,
        message: err.response?.data?.message || 'Demo login failed',
      };
    } finally {
      setLoading(false);
    }
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('active_building_id');
    setToken(null);
    setUser(null);
    setBuildings([]);
    setTenants([]);
  };

  const handleSetActiveBuildingId = (id) => {
    setActiveBuildingId(id);
    localStorage.setItem('active_building_id', id);
  };

  const role = user?.role || null;
  const isOwner = role === 'OWNER';
  const isManager = role === 'MANAGER';
  const isTenant = role === 'TENANT';

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        role,
        isOwner,
        isManager,
        isTenant,
        isAuthenticated: !!user,
        loading,
        login,
        loginAsDemo,
        logout,
        activeBuildingId,
        setActiveBuildingId: handleSetActiveBuildingId,
        buildings,
        refreshBuildings: fetchBuildings,
        tenants,
        refreshTenants: fetchTenants,
        activeTenantId,
        setActiveTenantId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
