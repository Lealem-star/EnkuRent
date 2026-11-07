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
              <th>Role</th>
              <th>Buildings</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.name}</td>
                  <td>{u.title || u.role}</td>
                  <td>
                    {u.role === 'OWNER'
                      ? 'All Properties (Owner)'
                      : u.buildings && u.buildings.length > 0
                      ? u.buildings.map((b) => b.name).join(', ')
                      : 'None assigned'}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => toast(`Editing permissions for ${u.name}...`)}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="empty">
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
              placeholder="user@enkurent.et"
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
    </div>
  );
};

export default UsersPage;

