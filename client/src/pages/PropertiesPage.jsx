import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import Modal from '../components/Modal';

export const PropertiesPage = () => {
  const { buildings, refreshBuildings, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [floors, setFloors] = useState(2);
  const [officesPerFloor, setOfficesPerFloor] = useState(6);
  const [saving, setSaving] = useState(false);

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast('Enter a building name.');
      return;
    }

    setSaving(true);
    try {
      const res = await api.post('/buildings', {
        name: name.trim(),
        address: address.trim() || 'Addis Ababa',
        floors: Number(floors) || 1,
        officesPerFloor: Number(officesPerFloor) || 6,
      });

      if (res.data?.success) {
        toast('Building created successfully.');
        setShowAddModal(false);
        setName('');
        setAddress('');
        await refreshBuildings();
        navigate(`${basePath}/properties/${res.data.data.id}`);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create building');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {buildings.map((b) => (
        <div
          key={b.id}
          className="bld-card"
          onClick={() => navigate(`${basePath}/properties/${b.id}`)}
        >
          <div>
            <h3>{b.name}</h3>
            <div className="bld-meta">{b.address}</div>
          </div>
          <div className="bld-stats">
            <div className="bld-stat">
              <b>{b.stats ? b.stats.total : b.offices?.length || 0}</b>
              <span>Offices</span>
            </div>
            <div className="bld-stat">
              <b>{b.stats ? b.stats.occupied : 0}</b>
              <span>Occupied</span>
            </div>
            <div className="bld-stat">
              <b className="mono">
                {b.stats ? Math.round((b.stats.expectedRent || 0) / 1000) : 0}K
              </b>
              <span>Expected ETB</span>
            </div>
            <div className="bld-stat">
              <b
                style={{
                  color: b.stats && b.stats.late > 0 ? 'var(--red)' : 'var(--ink)',
                }}
              >
                {b.stats ? b.stats.late : 0}
              </b>
              <span>Late</span>
            </div>
          </div>
        </div>
      ))}

      {role === 'owner' && (
        <button
          className="btn"
          style={{ marginTop: '6px' }}
          onClick={() => setShowAddModal(true)}
        >
          + Add Building
        </button>
      )}

      {/* Add Building Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title="Add Building"
        footer={
          <>
            <button className="btn" onClick={() => setShowAddModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBuilding}
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Building'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Building Name</label>
          <input
            placeholder="e.g. Merkato Trade Center"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Address</label>
          <input
            placeholder="e.g. Merkato, Addis Ababa"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Number of Floors</label>
            <input
              type="number"
              min="1"
              value={floors}
              onChange={(e) => setFloors(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Offices per Floor</label>
            <input
              type="number"
              min="1"
              value={officesPerFloor}
              onChange={(e) => setOfficesPerFloor(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default PropertiesPage;

