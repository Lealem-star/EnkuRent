import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { ETB, fmtDate } from '../utils/formatters';

export const OwnerDashboardPage = () => {
  const { buildings, refreshBuildings } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    total: 0,
    occupied: 0,
    available: 0,
    expected: 0,
    collected: 0,
    outstanding: 0,
    late: 0,
    pending: 0,
    collectionRate: 0,
    occupancyRate: 0,
    monthlyTrend: [
      { label: 'Jun', expected: 0, collected: 0 },
      { label: 'Jul', expected: 0, collected: 0 },
      { label: 'Aug', expected: 0, collected: 0 },
      { label: 'Sep', expected: 0, collected: 0 },
    ],
  });

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Add Building Modal
  const [showAddBld, setShowAddBld] = useState(false);
  const [bldName, setBldName] = useState('');
  const [bldAddress, setBldAddress] = useState('');
  const [bldFloors, setBldFloors] = useState(2);
  const [bldOffices, setBldOffices] = useState(6);
  const [savingBld, setSavingBld] = useState(false);

  const fetchOwnerData = useCallback(async () => {
    setLoading(true);
    try {
      const [resOverview, resUsers] = await Promise.all([
        api.get('/reports/overview'),
        api.get('/users'),
      ]);

      if (resOverview.data?.success) {
        setStats(resOverview.data.data);
      }
      if (resUsers.data?.success) {
        setUsers(resUsers.data.data);
      }
    } catch (err) {
      console.warn('Owner dashboard error:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOwnerData();
  }, [fetchOwnerData]);

  const handleCreateBuilding = async (e) => {
    e.preventDefault();
    if (!bldName.trim()) {
      toast('Enter a building name.');
      return;
    }

    setSavingBld(true);
    try {
      const res = await api.post('/buildings', {
        name: bldName.trim(),
        address: bldAddress.trim() || 'Addis Ababa',
        floors: Number(bldFloors) || 1,
        officesPerFloor: Number(bldOffices) || 6,
      });

      if (res.data?.success) {
        toast('Building added to portfolio.');
        setShowAddBld(false);
        setBldName('');
        setBldAddress('');
        await refreshBuildings();
        navigate(`/owner/properties/${res.data.data.id}`);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to create building');
    } finally {
      setSavingBld(false);
    }
  };

  const maxVal = Math.max(...stats.monthlyTrend.map((m) => m.expected), 1);

  return (
    <div>
      {/* Executive Quick Actions */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddBld(true)}>
          + Add Building
        </button>
        <button className="btn btn-sm" onClick={() => navigate('/owner/users')}>
          + Invite Manager
        </button>
        <button className="btn btn-sm btn-ghost" onClick={() => navigate('/owner/reports')}>
          Export Financials (PDF/Excel)
        </button>
      </div>

      {/* Portfolio Executive KPI Cards */}
      <div className="stat-grid">
        <StatCard label="Total Portfolio Value" value={ETB(stats.expected)} />
        <StatCard
          label="Actual Collections"
          value={ETB(stats.collected)}
          flag={{
            text: `${stats.collectionRate}% collected`,
            style: { background: 'var(--green-soft)', color: 'var(--green)' },
          }}
        />
        <StatCard label="Outstanding Balance" value={ETB(stats.outstanding)} />
        <StatCard
          label="Total Properties"
          value={buildings.length}
          subtext={` · ${stats.total} total offices`}
        />
        <StatCard
          label="Portfolio Occupancy"
          value={`${stats.occupancyRate}%`}
          subtext={` (${stats.occupied}/${stats.total} leased)`}
        />
        <StatCard
          label="Late Accounts"
          value={stats.late}
          valueStyle={{ color: stats.late > 0 ? 'var(--red)' : 'var(--ink)' }}
        />
        <StatCard
          label="Pending Approvals"
          value={stats.pending}
          valueStyle={{ color: stats.pending > 0 ? 'var(--amber)' : 'var(--ink)' }}
        />
      </div>

      {/* Building Portfolio Performance */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Building Portfolio Performance</h3>
            <div className="panel-sub">Breakdown of commercial assets and managers in charge</div>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('/owner/properties')}>
            View all properties
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Property</th>
                <th>Address</th>
                <th>Floors</th>
                <th>Offices</th>
                <th>Occupancy</th>
                <th>Monthly Revenue</th>
                <th>Overdue</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((b) => {
                const bStats = b.stats || { total: 0, occupied: 0, expectedRent: 0, late: 0 };
                const occPercent = bStats.total ? Math.round((bStats.occupied / bStats.total) * 100) : 0;

                return (
                  <tr key={b.id}>
                    <td className="cell-strong">{b.name}</td>
                    <td>{b.address}</td>
                    <td>{b.floors}</td>
                    <td>{bStats.total}</td>
                    <td>
                      <span className="amt">{occPercent}%</span>{' '}
                      <small style={{ color: 'var(--ink-soft)' }}>
                        ({bStats.occupied}/{bStats.total})
                      </small>
                    </td>
                    <td className="amt">{ETB(bStats.expectedRent)}</td>
                    <td style={{ color: bStats.late > 0 ? 'var(--red)' : 'var(--ink)', fontWeight: 600 }}>
                      {bStats.late || 0}
                    </td>
                    <td>
                      <button
                        className="btn btn-sm btn-ghost"
                        onClick={() => navigate(`/owner/properties/${b.id}`)}
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio Revenue Trend */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Portfolio Collection Trend</h3>
            <div className="panel-sub">Expected vs. collected rent over the last 4 billing cycles</div>
          </div>
          <div className="chip-row">
            <span className="chip active">Monthly</span>
            <span className="chip">Quarterly</span>
            <span className="chip">Yearly</span>
          </div>
        </div>
        <div className="panel-body">
          <div className="chart-legend">
            <span>
              <span className="legend-dot" style={{ background: 'var(--line-soft)' }}></span>
              Expected
            </span>
            <span>
              <span className="legend-dot" style={{ background: 'var(--gold)' }}></span>
              Collected
            </span>
          </div>
          <div className="chart">
            {stats.monthlyTrend.map((m, idx) => (
              <div key={idx} className="chart-col">
                <div className="chart-bars">
                  <div
                    className="chart-bar-track"
                    style={{ height: `${Math.max(6, (m.expected / maxVal) * 100)}%` }}
                  ></div>
                  <div
                    className="chart-bar-fill"
                    style={{ height: `${Math.max(3, (m.collected / maxVal) * 100)}%` }}
                  ></div>
                </div>
                <div className="chart-label">{m.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Property Management Team */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Management &amp; Accounting Team</h3>
            <div className="panel-sub">Assigned managers, accountants, and building coverage</div>
          </div>
          <button className="btn btn-sm btn-primary" onClick={() => navigate('/owner/users')}>
            + Manage Permissions
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
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="cell-strong">{u.name}</td>
                  <td>{u.title || u.role}</td>
                  <td>
                    {u.role === 'OWNER'
                      ? 'Full Portfolio (Owner)'
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
                        background: u.isActive ? 'var(--green-soft)' : 'var(--line-soft)',
                        color: u.isActive ? 'var(--green)' : 'var(--ink-soft)',
                      }}
                    >
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Building Modal */}
      <Modal
        isOpen={showAddBld}
        onClose={() => setShowAddBld(false)}
        title="Add Commercial Building"
        footer={
          <>
            <button className="btn" onClick={() => setShowAddBld(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBuilding}
              disabled={savingBld}
            >
              {savingBld ? 'Creating...' : 'Create Building & Floor Grid'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Building Name</label>
          <input
            placeholder="e.g. Merkato Trade Center"
            value={bldName}
            onChange={(e) => setBldName(e.target.value)}
          />
        </div>
        <div className="field">
          <label>Address / Sub-City</label>
          <input
            placeholder="e.g. Merkato, Addis Ababa"
            value={bldAddress}
            onChange={(e) => setBldAddress(e.target.value)}
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label>Floors</label>
            <input
              type="number"
              min="1"
              value={bldFloors}
              onChange={(e) => setBldFloors(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Offices per Floor</label>
            <input
              type="number"
              min="1"
              value={bldOffices}
              onChange={(e) => setBldOffices(e.target.value)}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default OwnerDashboardPage;

