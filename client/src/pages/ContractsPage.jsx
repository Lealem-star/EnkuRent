import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { ETB, fmtDate } from '../utils/formatters';

export const ContractsPage = () => {
  const { activeBuildingId, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [contracts, setContracts] = useState([]);
  const [expiringCount, setExpiringCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Renew Lease Modal State
  const [renewingContract, setRenewingContract] = useState(null);
  const [newEndDate, setNewEndDate] = useState('');
  const [newRent, setNewRent] = useState(0);
  const [submittingRenewal, setSubmittingRenewal] = useState(false);

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

  const openRenewModal = (c) => {
    setRenewingContract(c);
    setNewRent(c.rent);
    const currEnd = new Date(c.endDate);
    currEnd.setFullYear(currEnd.getFullYear() + 1);
    setNewEndDate(currEnd.toISOString().split('T')[0]);
  };

  const handleConfirmRenewal = async () => {
    if (!renewingContract || !newEndDate) {
      toast('Please choose a new contract end date.');
      return;
    }

    setSubmittingRenewal(true);
    try {
      const res = await api.post(`/contracts/${renewingContract.id}/renew`, {
        newEndDate,
        newRent: Number(newRent) || renewingContract.rent,
      });

      if (res.data?.success) {
        toast(`Lease renewed for ${renewingContract.tenantName} until ${newEndDate}.`);
        setRenewingContract(null);
        fetchContracts();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to renew contract');
    } finally {
      setSubmittingRenewal(false);
    }
  };

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
                <th>Building</th>
                <th>Rent</th>
                <th>Start</th>
                <th>End</th>
                <th>Status</th>
                <th></th>
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
                    <td>{c.buildingName}</td>
                    <td className="amt">{ETB(c.rent)}</td>
                    <td>{fmtDate(c.startDate)}</td>
                    <td>{fmtDate(c.endDate)}</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                    <td>
                      <button
                        className={`btn btn-sm ${c.status === 'expiring' ? 'btn-gold' : 'btn-ghost'}`}
                        onClick={() => openRenewModal(c)}
                      >
                        Renew Lease
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="empty">
                    {loading ? 'Loading contracts...' : 'No contracts found.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renew Lease Modal */}
      {renewingContract && (
        <Modal
          isOpen={true}
          onClose={() => setRenewingContract(null)}
          title={`Renew Lease — Office ${renewingContract.officeNumber}`}
          footer={
            <>
              <button className="btn" onClick={() => setRenewingContract(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleConfirmRenewal}
                disabled={submittingRenewal}
              >
                {submittingRenewal ? 'Renewing...' : 'Confirm Renewal'}
              </button>
            </>
          }
        >
          <div style={{ background: 'var(--surface-sunken)', padding: '12px 14px', borderRadius: '6px', marginBottom: '14px' }}>
            <div style={{ fontSize: '13.5px', fontWeight: 600 }}>{renewingContract.tenantName}</div>
            <div style={{ fontSize: '12px', color: 'var(--ink-soft)' }}>
              Office {renewingContract.officeNumber} · {renewingContract.buildingName} · Phone: {renewingContract.tenantPhone}
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Current Rent</label>
              <input value={ETB(renewingContract.rent)} disabled />
            </div>
            <div className="field">
              <label>Revised Monthly Rent (ETB)</label>
              <input
                type="number"
                value={newRent}
                onChange={(e) => setNewRent(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row">
            <div className="field">
              <label>Current End Date</label>
              <input value={fmtDate(renewingContract.endDate)} disabled />
            </div>
            <div className="field">
              <label>New End Date</label>
              <input
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '8px' }}>
            Renewing will extend the active contract, generate a historical rate ledger entry, and reset the 45-day expiring notification.
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ContractsPage;

