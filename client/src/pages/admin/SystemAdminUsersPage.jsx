import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { fmtDate } from '../../utils/formatters';
import {
  Users,
  Search,
  KeyRound,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Building,
} from 'lucide-react';

export const SystemAdminUsersPage = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Force Password Reset Modal
  const [resettingUser, setResettingUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get(
        `/admin/users?role=${roleFilter}&status=${statusFilter}&search=${encodeURIComponent(search)}`
      );
      if (res.data?.success) {
        setUsers(res.data.data.users);
        setTotal(res.data.data.total);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load users');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [roleFilter, statusFilter, search, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    try {
      const res = await api.patch(`/admin/users/${user.id}/toggle-status`);
      if (res.data?.success) {
        toast(res.data.message || 'User status updated');
        fetchUsers();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!resettingUser || newPassword.length < 8) {
      toast('Password must be at least 8 characters');
      return;
    }
    setResetting(true);
    try {
      const res = await api.post(`/admin/users/${resettingUser.id}/reset-password`, {
        newPassword,
      });
      if (res.data?.success) {
        toast(res.data.message || 'Password reset successfully');
        setResettingUser(null);
        setNewPassword('');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Global Platform Users Directory
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Supervise all platform user accounts: Landlords, Managers, Accountants, and Tenants ({total} Total)
          </p>
        </div>

        <button
          onClick={() => fetchUsers(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['ALL', 'SUPER_ADMIN', 'OWNER', 'MANAGER', 'TENANT'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`btn btn-sm ${roleFilter === r ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '12px' }}
            >
              {r === 'ALL'
                ? 'All Roles'
                : r === 'SUPER_ADMIN'
                ? 'Super Admin'
                : r.charAt(0) + r.slice(1).toLowerCase() + 's'}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
          <input
            type="text"
            className="input"
            placeholder="Search by name, email, phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
            <div>Loading platform users...</div>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
            <Users size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600 }}>No users match criteria</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ margin: 0, width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--paper)', borderBottom: '1px solid var(--line)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>USER NAME & CONTACT</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>ROLE / TITLE</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>COMPANY / OWNER</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>ASSIGNED PROPERTIES</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>JOINED</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)' }}>STATUS</th>
                  <th style={{ padding: '12px 16px', fontSize: '11px', fontWeight: 700, color: 'var(--ink-soft)', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--line)', fontSize: '13px' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--ink)' }}>{u.name}</div>
                      <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)' }}>
                        {u.email} • {u.phone}
                      </div>
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background:
                            u.role === 'SUPER_ADMIN'
                              ? 'var(--gold-soft)'
                              : u.role === 'OWNER'
                              ? 'var(--blue-soft)'
                              : 'var(--paper)',
                          color:
                            u.role === 'SUPER_ADMIN'
                              ? 'var(--gold-hover)'
                              : u.role === 'OWNER'
                              ? 'var(--blue)'
                              : 'var(--ink)',
                          border: '1px solid var(--line)',
                        }}
                      >
                        {u.role}
                      </span>
                      {u.title && u.title !== '—' && (
                        <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                          {u.title}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>
                      <div>{u.companyName}</div>
                      {u.ownerName && (
                        <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>Staff of {u.ownerName}</div>
                      )}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
                      {u.assignedProperties && u.assignedProperties.length > 0
                        ? u.assignedProperties.join(', ')
                        : '—'}
                    </td>

                    <td style={{ padding: '12px 16px', fontSize: '12px', color: 'var(--ink-soft)' }}>
                      {fmtDate(u.createdAt)}
                    </td>

                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: '12px',
                          color: u.isActive ? 'var(--green)' : 'var(--red)',
                          fontWeight: 600,
                        }}
                      >
                        <span
                          style={{
                            width: '7px',
                            height: '7px',
                            borderRadius: '50%',
                            background: u.isActive ? 'var(--green)' : 'var(--red)',
                          }}
                        />
                        {u.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>

                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          onClick={() => setResettingUser(u)}
                          className="btn btn-secondary btn-sm"
                          title="Force Password Reset"
                          style={{ padding: '5px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <KeyRound size={13} />
                          <span>Reset</span>
                        </button>

                        {u.role !== 'SUPER_ADMIN' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`btn btn-sm ${u.isActive ? 'btn-ghost' : 'btn-secondary'}`}
                            style={{
                              padding: '5px 8px',
                              fontSize: '11.5px',
                              color: u.isActive ? 'var(--red)' : 'var(--green)',
                            }}
                          >
                            {u.isActive ? 'Suspend' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Force Password Reset Modal */}
      {resettingUser && (
        <Modal
          isOpen={true}
          onClose={() => setResettingUser(null)}
          title={`Reset Password — ${resettingUser.name}`}
        >
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '380px' }}>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--ink-soft)' }}>
              Enter a temporary password for <strong>{resettingUser.email}</strong>. They will use this password on their next sign-in.
            </p>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                New Password (Minimum 8 Characters) *
              </label>
              <input
                type="text"
                required
                minLength={8}
                className="input"
                placeholder="e.g. EnqopaPass2026!"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setResettingUser(null)}
                disabled={resetting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={resetting}>
                {resetting ? 'Resetting...' : 'Set Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SystemAdminUsersPage;
