import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { fmtDate } from '../../utils/formatters';
import {
  Bell,
  Plus,
  Trash2,
  RefreshCw,
  AlertTriangle,
  Info,
  Clock,
  Send,
  Users,
} from 'lucide-react';

export const SystemAdminNotificationsPage = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Composer Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    message: '',
    type: 'INFO',
    targetRole: 'ALL',
    expiresAt: '',
  });
  const [broadcasting, setBroadcasting] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/notifications');
      if (res.data?.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleBroadcast = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.message) {
      toast('Title and message are required');
      return;
    }
    setBroadcasting(true);
    try {
      const res = await api.post('/notifications', formData);
      if (res.data?.success) {
        toast('Announcement broadcasted successfully');
        setModalOpen(false);
        setFormData({
          title: '',
          message: '',
          type: 'INFO',
          targetRole: 'ALL',
          expiresAt: '',
        });
        fetchNotifications();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to broadcast');
    } finally {
      setBroadcasting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await api.delete(`/notifications/${id}`);
      if (res.data?.success) {
        toast('Announcement removed');
        fetchNotifications();
      }
    } catch (err) {
      toast('Failed to delete notification');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Platform Announcements & Broadcast Center
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Publish maintenance windows, system updates, and urgent notices to specific user roles
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => fetchNotifications(true)}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => setModalOpen(true)}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Compose Announcement</span>
          </button>
        </div>
      </div>

      {/* Notifications List */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
          <div>Loading announcements...</div>
        </div>
      ) : notifications.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <Bell size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600 }}>No active platform announcements</div>
          <div style={{ fontSize: '12.5px', marginTop: '2px' }}>Click "Compose Announcement" to broadcast to landlords or tenants.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {notifications.map((n) => (
            <div
              key={n.id}
              className="card"
              style={{
                padding: '18px 20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background:
                      n.type === 'MAINTENANCE'
                        ? 'var(--amber-soft)'
                        : n.type === 'WARNING'
                        ? 'var(--red-soft)'
                        : 'var(--blue-soft)',
                    color:
                      n.type === 'MAINTENANCE'
                        ? '#b45309'
                        : n.type === 'WARNING'
                        ? 'var(--red)'
                        : 'var(--blue)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {n.type === 'MAINTENANCE' ? <Clock size={18} /> : <Info size={18} />}
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                      {n.title}
                    </h3>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'var(--paper)',
                        border: '1px solid var(--line)',
                        color: 'var(--ink-soft)',
                      }}
                    >
                      Target: {n.targetRole}
                    </span>
                    <span
                      style={{
                        fontSize: '10.5px',
                        fontWeight: 700,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        background: 'var(--gold-soft)',
                        color: 'var(--gold-hover)',
                      }}
                    >
                      {n.type}
                    </span>
                  </div>

                  <p style={{ margin: '6px 0 8px', fontSize: '13px', color: 'var(--ink)', lineHeight: 1.5 }}>
                    {n.message}
                  </p>

                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)' }}>
                    Posted on {fmtDate(n.createdAt)}
                    {n.expiresAt && ` • Expires ${fmtDate(n.expiresAt)}`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(n.id)}
                className="btn btn-ghost btn-sm"
                title="Remove Announcement"
                style={{ color: 'var(--red)', padding: '6px' }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Compose Announcement Modal */}
      {modalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setModalOpen(false)}
          title="Compose Platform Announcement"
        >
          <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '14px', minWidth: '420px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Announcement Title *
              </label>
              <input
                type="text"
                required
                className="input"
                placeholder="e.g. Scheduled System Maintenance on Sunday"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Target Audience
                </label>
                <select
                  className="input"
                  value={formData.targetRole}
                  onChange={(e) => setFormData({ ...formData, targetRole: e.target.value })}
                >
                  <option value="ALL">All Users (Landlords, Staff, Tenants)</option>
                  <option value="OWNER">Building Owners Only</option>
                  <option value="MANAGER">Property Managers Only</option>
                  <option value="TENANT">Tenants Only</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Notice Category
                </label>
                <select
                  className="input"
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="INFO">Information / Update</option>
                  <option value="MAINTENANCE">Maintenance Notice</option>
                  <option value="BILLING">Billing & Payment Alert</option>
                  <option value="WARNING">Important Security Alert</option>
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                Announcement Message *
              </label>
              <textarea
                rows={4}
                required
                className="input"
                placeholder="Enter details visible on user dashboards..."
                value={formData.message}
                onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setModalOpen(false)}
                disabled={broadcasting}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary btn-sm" disabled={broadcasting}>
                {broadcasting ? 'Broadcasting...' : 'Publish Announcement'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SystemAdminNotificationsPage;
