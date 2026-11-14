import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';

export const UsersPage = () => {
  const { buildings } = useAuth();
  const { toast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Invite Modal State
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [title, setTitle] = useState('Manager');
  const [selectedBuildingIds, setSelectedBuildingIds] = useState([]);
  const [saving, setSaving] = useState(false);

  // Manage User Modal State
  const [editingUser, setEditingUser] = useState(null);
  const [editTitle, setEditTitle] = useState('');
  const [editActive, setEditActive] = useState(true);
  const [editBuildingIds, setEditBuildingIds] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users');
      if (res.data?.success) {
        setUsers(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInviteUser = async (e) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast('Name and email are required.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/users', {
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        role: 'MANAGER',
        title,
        buildingIds: selectedBuildingIds,
      });

      if (res.data?.success) {
        toast('User invited successfully.');
        setShowInviteModal(false);
        setName('');
        setEmail('');
        setPhone('');
        setSelectedBuildingIds([]);
        fetchUsers();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to invite user');
    } finally {
      setSaving(false);
    }
  };

  const toggleBuilding = (bId) => {
    setSelectedBuildingIds((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    );
  };

  const openManageModal = (u) => {
    setEditingUser(u);
    setEditTitle(u.title || 'Manager');
    setEditActive(u.isActive !== false);
    setEditBuildingIds(u.buildingIds || []);
  };

  const toggleEditBuilding = (bId) => {
    setEditBuildingIds((prev) =>
      prev.includes(bId) ? prev.filter((id) => id !== bId) : [...prev, bId]
    );
  };

  const handleSaveUserPermissions = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      const res = await api.put(`/users/${editingUser.id}`, {
        title: editTitle,
        isActive: editActive,
        buildingIds: editBuildingIds,
      });

      if (res.data?.success) {
        toast(`Permissions updated for ${editingUser.name}.`);
        setEditingUser(null);
        fetchUsers();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update user permissions');
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>Managers &amp; Accountants</h3>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => {
            setSelectedBuildingIds(buildings.map((b) => b.id));
            setShowInviteModal(true);
          }}
        >
          + Invite User
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role / Title</th>
              <th>Assigned Coverage</th>
              <th>Email</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.name}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 700,
                        background:
                          u.title?.toLowerCase().includes('accountant')
                            ? 'rgba(16, 185, 129, 0.12)'
                            : u.role === 'OWNER'
                            ? 'rgba(245, 158, 11, 0.15)'
                            : 'rgba(11, 34, 57, 0.08)',
                        color:
                          u.title?.toLowerCase().includes('accountant')
                            ? '#10B981'
                            : u.role === 'OWNER'
                            ? '#D97706'
                            : '#0B2239',
                      }}
                    >
                      {u.title || u.role}
                    </span>
                  </td>
                  <td>
                    {u.role === 'OWNER'
                      ? 'All Properties (Owner)'
                      : u.buildings && u.buildings.length > 0
                      ? u.buildings.map((b) => b.name).join(', ')
                      : 'None assigned'}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <span
                      style={{
                        padding: '2px 8px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: u.isActive !== false ? 'var(--green-soft)' : 'var(--line-soft)',
                        color: u.isActive !== false ? 'var(--green)' : 'var(--ink-soft)',
                      }}
                    >
                      {u.isActive !== false ? 'Active' : 'Suspended'}
                    </span>
                  </td>
                  <td>
                    {u.role !== 'OWNER' && (
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => openManageModal(u)}
                      >
                        Manage
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" className="empty">
                  {loading ? 'Loading users...' : 'No users found.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite User Modal */}
      <Modal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        title="Invite Manager / Accountant"
        footer={
          <>
            <button className="btn" onClick={() => setShowInviteModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleInviteUser}
              disabled={saving}
            >
              {saving ? 'Inviting...' : 'Send Invitation'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Full Name</label>
          <input
            placeholder="e.g. Dawit Haile"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="user@enqoparentpro.et"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Phone Number (optional)</label>
            <input
              placeholder="09XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Role / Job Title</label>
          <select value={title} onChange={(e) => setTitle(e.target.value)}>
            <option value="Manager">Property Manager</option>
            <option value="Accountant">Accountant</option>
            <option value="Supervisor">Supervisor</option>
          </select>
        </div>
        <div className="field">
          <label>Assigned Buildings</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
            {buildings.map((b) => (
              <label
                key={b.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: '13px',
                }}
              >
                <input
                  type="checkbox"
                  style={{ width: 'auto' }}
                  checked={selectedBuildingIds.includes(b.id)}
                  onChange={() => toggleBuilding(b.id)}
                />
                {b.name} ({b.address})
              </label>
            ))}
          </div>
        </div>
      </Modal>

      {/* Edit Staff Permissions Modal */}
      {editingUser && (
        <Modal
          isOpen={true}
          onClose={() => setEditingUser(null)}
          title={`Staff Permissions — ${editingUser.name}`}
          footer={
            <>
              <button className="btn" onClick={() => setEditingUser(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveUserPermissions}
                disabled={savingEdit}
              >
                {savingEdit ? 'Saving...' : 'Save Permissions'}
              </button>
            </>
          }
        >
          <div style={{ marginBottom: '14px', background: 'var(--surface-sunken)', padding: '10px 12px', borderRadius: '6px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{editingUser.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>{editingUser.email} · {editingUser.phone || 'No phone'}</div>
          </div>

          <div className="field">
            <label>Assigned Role / Title</label>
            <select value={editTitle} onChange={(e) => setEditTitle(e.target.value)}>
              <option value="Manager">Property Manager (Operational)</option>
              <option value="Accountant">Property Accountant (Financial &amp; Slips)</option>
              <option value="Supervisor">Building Supervisor</option>
            </select>
          </div>

          <div className="field">
            <label>Account Status</label>
            <div style={{ display: 'flex', gap: '16px', marginTop: '6px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="radio"
                  name="userActive"
                  style={{ width: 'auto' }}
                  checked={editActive === true}
                  onChange={() => setEditActive(true)}
                />
                Active (Can log in)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '13px' }}>
                <input
                  type="radio"
                  name="userActive"
                  style={{ width: 'auto' }}
                  checked={editActive === false}
                  onChange={() => setEditActive(false)}
                />
                Suspended (Access blocked)
              </label>
            </div>
          </div>

          <div className="field">
            <label>Building Portfolio Scoping</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
              {buildings.map((b) => (
                <label
                  key={b.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '13px',
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={editBuildingIds.includes(b.id)}
                    onChange={() => toggleEditBuilding(b.id)}
                  />
                  {b.name} ({b.address})
                </label>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default UsersPage;

