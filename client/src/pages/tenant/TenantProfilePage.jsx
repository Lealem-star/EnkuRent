import React from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { fmtDate } from '../../utils/formatters';

export const TenantProfilePage = () => {
  const { currentTenant } = useOutletContext();
  const { switchRole } = useAuth();
  const navigate = useNavigate();

  if (!currentTenant) {
    return <div className="empty">No tenant details available.</div>;
  }

  const office = currentTenant.office;
  const contract = currentTenant.contract;

  const handleSwitchToAdmin = async () => {
    await switchRole('owner');
    navigate('/dashboard');
  };

  return (
    <div className="t-section" style={{ marginTop: '16px' }}>
      <h4>Your Details</h4>
      <div className="kv-grid" style={{ gridTemplateColumns: '1fr', gap: '12px' }}>
        <div>
          <div className="kv-label">Name</div>
          <div className="kv-value">{currentTenant.fullName}</div>
        </div>
        <div>
          <div className="kv-label">Phone</div>
          <div className="kv-value mono">{currentTenant.phone}</div>
        </div>
        <div>
          <div className="kv-label">Office</div>
          <div className="kv-value">
            {office ? `Office ${office.number}, ${office.buildingName}` : '—'}
          </div>
        </div>
        {contract && (
          <div>
            <div className="kv-label">Contract</div>
            <div className="kv-value" style={{ fontSize: '13.5px' }}>
              {fmtDate(contract.startDate)} – {fmtDate(contract.endDate)}
            </div>
          </div>
        )}
      </div>

      <button
        className="btn btn-sm"
        style={{ marginTop: '20px' }}
        onClick={handleSwitchToAdmin}
      >
        Switch to Owner / Accountant view
      </button>
    </div>
  );
};

export default TenantProfilePage;

