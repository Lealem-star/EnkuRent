import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import BuildingSwitcher from '../components/BuildingSwitcher';
import { ETB, fmtDate } from '../utils/formatters';

export const TenantsPage = () => {
  const { activeBuildingId, buildings, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [tenants, setTenants] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  // Add Tenant Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [vacantOffices, setVacantOffices] = useState([]);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rent, setRent] = useState(20000);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('2026-09-21');
  const [endDate, setEndDate] = useState('2027-09-21');
  const [dueDay, setDueDay] = useState(5);
  const [saving, setSaving] = useState(false);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeBuildingId && activeBuildingId !== '__all__') {
        params.append('buildingId', activeBuildingId);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.get(`/tenants?${params.toString()}`);
      if (res.data?.success) {
        setTenants(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch tenants');
    } finally {
      setLoading(false);
    }
  }, [activeBuildingId, search, toast]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Load vacant offices for Add Tenant Modal
  const openAddTenantModal = async () => {
    try {
      const bQuery = activeBuildingId && activeBuildingId !== '__all__' ? `?buildingId=${activeBuildingId}&status=AVAILABLE` : '?status=AVAILABLE';
      const res = await api.get(`/offices${bQuery}`);
      if (res.data?.success) {
        setVacantOffices(res.data.data);
        if (res.data.data.length > 0) {
          setSelectedOfficeId(res.data.data[0].id);
        }
      }
    } catch {
      // fallback
    }
    setShowAddModal(true);
  };

  const handleSaveTenant = async () => {
    if (!name.trim()) {
      toast('Enter a tenant full name.');
      return;
    }
    if (!selectedOfficeId) {
      toast('Choose an available office.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/tenants', {
        fullName: name.trim(),
        phone: phone.trim() || '0911000000',
        email: email.trim(),
        officeId: selectedOfficeId,
        rent: Number(rent),
        frequency,
        startDate,
        endDate,
        dueDay: Number(dueDay) || 5,
      });

      if (res.data?.success) {
        toast('Tenant added — portal link and QR code generated.');
        setShowAddModal(false);
        setName('');
        setPhone('');
        setEmail('');
        fetchTenants();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to add tenant');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="panel">
      <div className="filter-row">
        <input
          type="text"
          placeholder="Search tenants by name or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ minWidth: '240px' }}
        />
        <BuildingSwitcher />
        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={openAddTenantModal}
        >
          + Add Tenant
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Office</th>
              <th>Phone</th>
              <th>Rent</th>
              <th>Frequency</th>
              <th>Contract End</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {tenants.length > 0 ? (
              tenants.map((t) => (
                <tr key={t.id}>
                  <td className="cell-strong">{t.fullName}</td>
                  <td>
                    {t.office ? (
                      <span
                        className="cell-link"
                        onClick={() => navigate(`${basePath}/office/${t.office.id}`)}
                      >
                        Office {t.office.number}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="mono">{t.phone}</td>
                  <td className="amt">{t.contract ? ETB(t.contract.rent) : '—'}</td>
                  <td>{t.contract ? t.contract.frequency : '—'}</td>
                  <td>{t.contract ? fmtDate(t.contract.endDate) : '—'}</td>
                  <td>
                    <StatusBadge status={t.cycleStatus} />
                  </td>
                  <td>
                    {t.office && (
                      <span
                        className="cell-link"
                        onClick={() => navigate(`${basePath}/office/${t.office.id}`)}
                      >
                        View
                      </span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8" className="empty">
                  {loading ? 'Loading tenants...' : 'No tenants match your search.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Tenant Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Tenant"
        footer={
          <>
            <button className="btn" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveTenant}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Add Tenant & Generate Portal'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Full Name</label>
          <input
            placeholder="e.g. Solomon Girma"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Phone Number</label>
            <input
              placeholder="09XXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Email (optional)</label>
            <input
              placeholder="name@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Office</label>
          <select
            value={selectedOfficeId}
            onChange={(e) => setSelectedOfficeId(e.target.value)}
          >
            {vacantOffices.length > 0 ? (
              vacantOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.buildingName || 'Building'} — Office {o.number} (Floor {o.floor})
                </option>
              ))
            ) : (
              <option value="">No vacant offices available</option>
            )}
          </select>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Monthly Rent (ETB)</label>
            <input
              type="number"
              value={rent}
              onChange={(e) => setRent(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Payment Frequency</label>
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="MONTHLY">Monthly</option>
              <option value="QUARTERLY">Quarterly</option>
              <option value="YEARLY">Yearly</option>
            </select>
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label>Contract Start</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Contract End</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label>Due Day of Month</label>
          <input
            type="number"
            min="1"
            max="28"
            value={dueDay}
            onChange={(e) => setDueDay(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default TenantsPage;

