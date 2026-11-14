import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { ETB } from '../../utils/formatters';
import {
  Building2,
  Search,
  RefreshCw,
  Building,
  CheckCircle2,
  Activity,
  Layers,
} from 'lucide-react';

export const SystemAdminPropertiesPage = () => {
  const { toast } = useToast();
  const [buildings, setBuildings] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProperties = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await api.get('/buildings');
      if (res.data?.success) {
        setBuildings(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load properties');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  const filtered = buildings.filter((b) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      b.name?.toLowerCase().includes(q) ||
      b.address?.toLowerCase().includes(q)
    );
  });

  const totalUnits = buildings.reduce((sum, b) => sum + (b.stats?.total || 0), 0);
  const totalOccupied = buildings.reduce((sum, b) => sum + (b.stats?.occupied || 0), 0);
  const totalExpectedRent = buildings.reduce((sum, b) => sum + (b.stats?.expectedRent || 0), 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '19px', fontWeight: 700, color: 'var(--ink)', margin: 0 }}>
            Global Property & Tower Oversight
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--ink-soft)' }}>
            Supervise all commercial buildings, towers, and tenant occupancy across Ethiopia
          </p>
        </div>

        <button
          onClick={() => fetchProperties(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
        >
          <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Aggregate Bar */}
      <div
        className="card"
        style={{
          padding: '16px 20px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Properties
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
            {buildings.length} Towers & Complexes
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>
            Total Rental Units
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
            {totalUnits} Units ({totalOccupied} Occupied)
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>
            Overall Occupancy Rate
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--gold-hover)' }}>
            {totalUnits > 0 ? Math.round((totalOccupied / totalUnits) * 100) : 0}%
          </div>
        </div>

        <div>
          <div style={{ fontSize: '11px', color: 'var(--ink-soft)', fontWeight: 600, textTransform: 'uppercase' }}>
            Expected Monthly Rent
          </div>
          <div style={{ fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
            {ETB(totalExpectedRent)}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', width: '300px' }}>
        <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--ink-soft)' }} />
        <input
          type="text"
          className="input"
          placeholder="Search by building name or location..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ paddingLeft: '32px', fontSize: '13px', height: '36px' }}
        />
      </div>

      {/* Buildings Grid */}
      {loading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <RefreshCw className="spin" size={24} style={{ margin: '0 auto 8px', color: 'var(--gold)' }} />
          <div>Loading property directory...</div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: '50px', textAlign: 'center', color: 'var(--ink-soft)' }}>
          <Building2 size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600 }}>No properties match search</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {filtered.map((b) => {
            const stats = b.stats || {};
            const occRate = stats.total > 0 ? Math.round((stats.occupied / stats.total) * 100) : 0;

            return (
              <div key={b.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ fontSize: '16.5px', fontWeight: 700, margin: 0, color: 'var(--ink)' }}>
                        {b.name}
                      </h3>
                      <div style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                        {b.address}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: 'var(--blue-soft)',
                        color: 'var(--blue)',
                      }}
                    >
                      {b.floors} Floors
                    </span>
                  </div>

                  {/* Occupancy Progress Bar */}
                  <div style={{ margin: '16px 0 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px' }}>
                      <span style={{ color: 'var(--ink-soft)' }}>Occupancy</span>
                      <strong style={{ color: 'var(--ink)' }}>{occRate}% ({stats.occupied} / {stats.total} Units)</strong>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--line)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${occRate}%`,
                          height: '100%',
                          background: occRate > 75 ? 'var(--green)' : occRate > 40 ? 'var(--gold)' : 'var(--red)',
                          transition: 'width 0.3s ease',
                        }}
                      />
                    </div>
                  </div>

                  {/* Stats Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '12px', marginBottom: '14px' }}>
                    <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--ink-soft)', fontSize: '10.5px' }}>AVAILABLE</div>
                      <strong style={{ color: 'var(--green)' }}>{stats.available || 0}</strong>
                    </div>
                    <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--ink-soft)', fontSize: '10.5px' }}>OCCUPIED</div>
                      <strong style={{ color: 'var(--blue)' }}>{stats.occupied || 0}</strong>
                    </div>
                    <div style={{ background: 'var(--paper)', padding: '8px', borderRadius: '6px', textAlign: 'center' }}>
                      <div style={{ color: 'var(--ink-soft)', fontSize: '10.5px' }}>MAINTENANCE</div>
                      <strong style={{ color: '#b45309' }}>{stats.maintenance || 0}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--line)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>Expected Rent:</span>
                  <span style={{ fontSize: '14px', fontWeight: 700, fontFamily: 'var(--font-num)', color: 'var(--ink)' }}>
                    {ETB(stats.expectedRent || 0)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SystemAdminPropertiesPage;
