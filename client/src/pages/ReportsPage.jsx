import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ETB } from '../utils/formatters';

export const ReportsPage = () => {
  const { activeBuildingId } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const bQuery = activeBuildingId && activeBuildingId !== '__all__' ? `?buildingId=${activeBuildingId}` : '';
        const res = await api.get(`/reports/overview${bQuery}`);
        if (res.data?.success) {
          setStats(res.data.data);
        }
      } catch {
        // fallback
      }
    };
    fetchStats();
  }, [activeBuildingId]);

  const handleExport = (type, format) => {
    toast(`Preparing ${format.toUpperCase()} export for ${type}...`);
    const bQuery = activeBuildingId && activeBuildingId !== '__all__' ? `?buildingId=${activeBuildingId}` : '';
    const token = localStorage.getItem('token');
    const url = `http://localhost:5000/api/reports/export/${type}/${format}${bQuery}`;

    // Trigger file download
    fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Export failed');
        return res.blob();
      })
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `enqopa_${type}_report.${format}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast(`${format.toUpperCase()} export downloaded successfully.`);
      })
      .catch((err) => {
        toast('Export error: ' + err.message);
      });
  };

  const reports = [
    {
      id: 'revenue',
      name: 'Monthly Revenue Report',
      desc: stats
        ? `Expected ${ETB(stats.expected)} · Collected ${ETB(stats.collected)} · Outstanding ${ETB(stats.outstanding)}`
        : 'Monthly expected vs. collected income summary.',
    },
    {
      id: 'payments',
      name: 'Payment Report',
      desc: 'Every payment, bank slip, and verification recorded in the selected period.',
    },
    {
      id: 'overdue',
      name: 'Overdue Report',
      desc: stats
        ? `${stats.late} tenant${stats.late === 1 ? '' : 's'} currently past the due date.`
        : 'All accounts past due date with active balances.',
    },
    {
      id: 'tenant-history',
      name: 'Tenant Payment History',
      desc: 'Full lifetime payment and ledger record for individual tenants.',
    },
    {
      id: 'occupancy',
      name: 'Occupancy Report',
      desc: stats
        ? `${stats.occupied}/${stats.total} offices occupied (${stats.occupancyRate}%).`
        : 'Occupancy and vacancy breakdown per property and floor.',
    },
  ];

  return (
    <div className="report-grid">
      {reports.map((r) => (
        <div key={r.id} className="report-card">
          <h4>{r.name}</h4>
          <p>{r.desc}</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn btn-sm"
              onClick={() => handleExport(r.id, 'pdf')}
            >
              Export PDF
            </button>
            <button
              className="btn btn-sm"
              onClick={() => handleExport(r.id, 'xlsx')}
            >
              Export Excel
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ReportsPage;

