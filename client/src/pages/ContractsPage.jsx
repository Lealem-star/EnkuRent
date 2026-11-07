import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import { ETB, fmtDate } from '../utils/formatters';

export const ContractsPage = () => {
  const { activeBuildingId, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [contracts, setContracts] = useState([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchContracts = useCallback(async () => {
    setLoading(true);
    try {
      const bQuery = activeBuildingId && activeBuildingId !== '__all__' ? `?buildingId=${activeBuildingId}` : '';
      const res = await api.get(`/contracts${bQuery}`);
      if (res.data?.success) {
        setContracts(res.data.data?.contracts || []);
        setExpiringCount(res.data.data?.expiringCount || 0);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch contracts');
    } finally {
      setLoading(false);
    }
  }, [activeBuildingId, toast]);

  useEffect(() => {
    fetchContracts();
  }, [fetchContracts]);

  return (
    <div>
      {expiringCount > 0 && (
        <div className="warn-box" style={{ marginBottom: '16px' }}>
          {expiringCount} contract{expiringCount === 1 ? '' : 's'} expiring within 45 days. Review
          and initiate renewal with tenants.
        </div>
      )}

      <div className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Tenant</th>
                <th>Office</th>
                <th>Rent</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {contracts.length > 0 ? (
                contracts.map((c) => (
                  <tr key={c.id}>
                    <td className="cell-strong">{c.tenantName}</td>
                    <td>
                      <span
                        className="cell-link"
                        onClick={() => navigate(`${basePath}/office/${c.officeId}`)}
                      >
                        Office {c.officeNumber}
                      </span>
                    </td>
                    <td className="amt">{ETB(c.rent)}</td>
                    <td>{fmtDate(c.startDate)}</td>
                    <td>{fmtDate(c.endDate)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="empty">
                    {loading ? 'Loading contracts...' : 'No contracts found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ContractsPage;

