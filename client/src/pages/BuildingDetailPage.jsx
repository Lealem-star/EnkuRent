import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import { ETB } from '../utils/formatters';

export const BuildingDetailPage = () => {
  const { id } = useParams();
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [building, setBuilding] = useState(null);
  const [offices, setOffices] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Tenant Modal
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [selectedOfficeId, setSelectedOfficeId] = useState('');
  const [tenantName, setTenantName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [rent, setRent] = useState(20000);
  const [frequency, setFrequency] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('2026-09-21');
  const [endDate, setEndDate] = useState('2027-09-21');
  const [dueDay, setDueDay] = useState(5);
  const [savingTenant, setSavingTenant] = useState(false);

  const fetchBuildingData = useCallback(async () => {
    setLoading(true);
    try {
      const [resBld, resOffices] = await Promise.all([
        api.get(`/buildings/${id}`),
        api.get(`/offices?buildingId=${id}`),
      ]);

      if (resBld.data?.success) {
        setBuilding(resBld.data.data);
      }
      if (resOffices.data?.success) {
        setOffices(resOffices.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load building data');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchBuildingData();
  }, [fetchBuildingData]);

  const vacantOffices = offices.filter((o) => o.status === 'AVAILABLE');

  const handleAssignTenant = async () => {
    if (!tenantName.trim()) {
      toast('Enter a tenant full name.');
      return;
    }
    const targetOfficeId = selectedOfficeId || (vacantOffices.length > 0 ? vacantOffices[0].id : '');
    if (!targetOfficeId) {
      toast('Choose an available office.');
      return;
    }

    setSavingTenant(true);
    try {
      const res = await api.post('/tenants', {
        fullName: tenantName.trim(),
        phone: phone.trim() || '0911000000',
        email: email.trim(),
        officeId: targetOfficeId,
        rent: Number(rent),
        frequency,
        startDate,
        endDate,
        dueDay: Number(dueDay) || 5,
      });

      if (res.data?.success) {
        toast('Tenant assigned and portal link generated.');
        setShowAddTenant(false);
        setTenantName('');
        setPhone('');
        setEmail('');
        fetchBuildingData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to assign tenant');
    } finally {
      setSavingTenant(false);
    }
  };

  if (loading || !building) {
    return <div className="empty">Loading property details...</div>;
  }

  const floors = [...new Set(offices.map((o) => o.floor))].sort((a, b) => a - b);
  const stats = building.stats || {
    total: offices.length,
    occupied: offices.filter((o) => o.status === 'OCCUPIED').length,
    available: offices.filter((o) => o.status === 'AVAILABLE').length,
    expectedRent: offices.reduce((sum, o) => sum + (o.rent || 0), 0),
    collectedRent: 0,
  };

  return (
    <div>
      {/* Building Summary Panel */}
      <div className="panel">
        <div className="panel-body">
          <div className="kv-grid">
            <div>
              <div className="kv-label">Address</div>
              <div className="kv-value" style={{ fontSize: '14px' }}>
                {building.address}
              </div>
            </div>
            <div>
              <div className="kv-label">Floors</div>
              <div className="kv-value">{building.floors}</div>
            </div>
            <div>
              <div className="kv-label">Offices</div>
              <div className="kv-value">{stats.total}</div>
            </div>
            <div>
              <div className="kv-label">Occupied / Available</div>
              <div className="kv-value">
                {stats.occupied} / {stats.available}
              </div>
            </div>
            <div>
              <div className="kv-label">Monthly Expected Rent</div>
              <div className="kv-value mono">{ETB(stats.expectedRent)}</div>
            </div>
            <div>
              <div className="kv-label">Current Collection</div>
              <div className="kv-value mono" style={{ color: 'var(--green)' }}>
                {ETB(stats.collectedRent || 0)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Floor Plan Panel */}
      <div className="panel">
        <div className="panel-head">
          <h3>Floor Plan</h3>
          <button
            className="btn btn-sm"
            onClick={() => {
              if (vacantOffices.length > 0) {
                setSelectedOfficeId(vacantOffices[0].id);
              }
              setShowAddTenant(true);
            }}
          >
            + Assign Tenant
          </button>
        </div>

        <div className="panel-body">
          {floors.map((floorNum) => {
            const floorOffices = offices.filter((o) => o.floor === floorNum);
            return (
              <div key={floorNum} className="floor-block">
                <div className="floor-title">Floor {floorNum}</div>
                <div className="office-grid">
                  {floorOffices.map((o) => {
                    const isAvailable = o.status === 'AVAILABLE';
                    return (
                      <div
                        key={o.id}
                        className={`office-card ${isAvailable ? 'st-available' : ''}`}
                        onClick={() => navigate(`${basePath}/office/${o.id}`)}
                      >
                        <div className="office-num">Office {o.number}</div>
                        <div className="office-tenant">
                          {o.tenantName ||
                            (o.status === 'MAINTENANCE' ? 'Under maintenance' : 'Vacant')}
                        </div>
                        <StatusBadge status={o.cycleStatus || o.status} />
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Assign Tenant Modal */}
      <Modal
        isOpen={showAddTenant}
        onClose={() => setShowAddTenant(false)}
        title="Add Tenant & Assign Office"
        footer={
          <>
            <button className="btn" onClick={() => setShowAddTenant(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleAssignTenant}
              disabled={savingTenant}
            >
              {savingTenant ? 'Assigning...' : 'Add Tenant & Generate Portal'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Full Name</label>
          <input
            placeholder="e.g. Solomon Girma"
            value={tenantName}
            onChange={(e) => setTenantName(e.target.value)}
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
                  {building.name} — Office {o.number} (Floor {o.floor})
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

export default BuildingDetailPage;

