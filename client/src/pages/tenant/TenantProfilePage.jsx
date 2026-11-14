import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import api from '../../services/api';
import { ETB, fmtDate } from '../../utils/formatters';

export const TenantProfilePage = () => {
  const { currentTenant } = useOutletContext();
  const { switchRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [maintenanceTickets, setMaintenanceTickets] = useState([]);
  const [loadingTickets, setLoadingTickets] = useState(false);

  // New Maintenance Request Modal State
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('PLUMBING');
  const [priority, setPriority] = useState('MEDIUM');
  const [submitting, setSubmitting] = useState(false);

  const fetchTickets = async () => {
    setLoadingTickets(true);
    try {
      const res = await api.get('/support');
      if (res.data?.success) {
        setMaintenanceTickets(res.data.data || []);
      }
    } catch {
      // fallback
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, [currentTenant]);

  if (!currentTenant) {
    return <div className="empty">No tenant details available.</div>;
  }

  const office = currentTenant.office;
  const contract = currentTenant.contract;

  const handleSwitchToAdmin = async () => {
    await switchRole('owner');
    navigate('/dashboard');
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !description.trim()) {
      toast('Please enter both issue title and description.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await api.post('/support', {
        subject: `[${category}] ${subject.trim()}`,
        message: description.trim(),
        priority,
        category: 'MAINTENANCE',
      });

      if (res.data?.success) {
        toast('Maintenance request dispatched to building manager.');
        setShowRequestModal(false);
        setSubject('');
        setDescription('');
        fetchTickets();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit maintenance request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="t-section" style={{ marginTop: '16px' }}>
      <h4>Tenant &amp; Lease Profile</h4>
      <div className="kv-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
        <div>
          <div className="kv-label">Tenant Full Name</div>
          <div className="kv-value">{currentTenant.fullName}</div>
        </div>
        <div>
          <div className="kv-label">Contact Phone</div>
          <div className="kv-value mono">{currentTenant.phone}</div>
        </div>
        <div>
          <div className="kv-label">Rental Unit</div>
          <div className="kv-value">
            {office ? `Office ${office.number}, ${office.buildingName}` : '—'}
          </div>
        </div>
        {contract && (
          <>
            <div>
              <div className="kv-label">Monthly Rent Amount</div>
              <div className="kv-value mono" style={{ fontWeight: 700 }}>
                {ETB(contract.rent)} ({contract.frequency})
              </div>
            </div>
            <div>
              <div className="kv-label">Lease Duration</div>
              <div className="kv-value" style={{ fontSize: '13px' }}>
                {fmtDate(contract.startDate)} – {fmtDate(contract.endDate)} · Due {contract.dueDay || 5}th each month
              </div>
            </div>
          </>
        )}
      </div>

      {/* Maintenance Requests Section */}
      <div style={{ marginTop: '24px', borderTop: '1px solid var(--line)', paddingTop: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div>
            <h4 style={{ margin: 0 }}>Maintenance &amp; Repairs</h4>
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
              Report unit issues directly to building management
            </div>
          </div>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => setShowRequestModal(true)}
          >
            + New Request
          </button>
        </div>

        {maintenanceTickets.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {maintenanceTickets.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--line)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>{t.subject}</div>
                  <div style={{ fontSize: '11px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                    Ticket: <span className="mono">{t.ticketNumber}</span> · {fmtDate(t.createdAt)} · Priority: {t.priority}
                  </div>
                </div>
                <div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '12px',
                      background:
                        t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'var(--green-soft)'
                          : t.status === 'IN_PROGRESS'
                          ? 'rgba(59, 130, 246, 0.15)'
                          : 'rgba(245, 158, 11, 0.15)',
                      color:
                        t.status === 'RESOLVED' || t.status === 'CLOSED'
                          ? 'var(--green)'
                          : t.status === 'IN_PROGRESS'
                          ? '#2563EB'
                          : '#D97706',
                    }}
                  >
                    {t.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px dashed var(--line)',
              borderRadius: '8px',
              padding: '16px',
              textAlign: 'center',
              fontSize: '12px',
              color: 'var(--ink-soft)',
            }}
          >
            {loadingTickets ? 'Loading tickets...' : 'No maintenance requests filed. Everything is in order.'}
          </div>
        )}
      </div>

      <button
        className="btn btn-sm"
        style={{ marginTop: '24px', width: '100%' }}
        onClick={handleSwitchToAdmin}
      >
        Switch to Owner / Accountant console
      </button>

      {/* New Maintenance Request Modal */}
      {showRequestModal && (
        <Modal
          isOpen={true}
          onClose={() => setShowRequestModal(false)}
          title="Submit Maintenance Request"
          footer={
            <>
              <button className="btn" onClick={() => setShowRequestModal(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleCreateRequest}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Dispatch Request'}
              </button>
            </>
          }
        >
          <div className="field">
            <label>Issue Title</label>
            <input
              placeholder="e.g. Water leak in restroom, AC not cooling"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label>Category</label>
              <select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="PLUMBING">Plumbing &amp; Water</option>
                <option value="ELECTRICAL">Electrical &amp; Lighting</option>
                <option value="HVAC">HVAC / Air Conditioning</option>
                <option value="CARPENTRY">Carpentry &amp; Doors</option>
                <option value="PAINTING">Painting &amp; Walls</option>
                <option value="CLEANING">Janitorial &amp; Cleaning</option>
                <option value="OTHER">Other / Structural</option>
              </select>
            </div>
            <div className="field">
              <label>Urgency Level</label>
              <select value={priority} onChange={(e) => setPriority(e.target.value)}>
                <option value="LOW">Low (Routine)</option>
                <option value="MEDIUM">Medium (Standard)</option>
                <option value="HIGH">High (Affects Operations)</option>
                <option value="URGENT">Urgent (Emergency)</option>
              </select>
            </div>
          </div>

          <div className="field">
            <label>Detailed Description</label>
            <textarea
              rows={3}
              placeholder="Please describe the issue location, symptoms, and when it started..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TenantProfilePage;

