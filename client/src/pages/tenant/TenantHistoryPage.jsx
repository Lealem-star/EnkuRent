import React, { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import api from '../../services/api';
import { ETB, fmtDate } from '../../utils/formatters';

export const TenantHistoryPage = () => {
  const { currentTenant } = useOutletContext();
  const [payments, setPayments] = useState([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!currentTenant) return;
      try {
        const res = await api.get(`/payments?search=${encodeURIComponent(currentTenant.fullName)}`);
        if (res.data?.success) {
          setPayments(res.data.data?.payments || res.data.data || []);
        }
      } catch {
        // fallback
      }
    };
    fetchHistory();
  }, [currentTenant]);

  if (!currentTenant) {
    return <div className="empty">No tenant selected.</div>;
  }

  return (
    <div className="t-section" style={{ marginTop: '16px' }}>
      <h4>Payment History</h4>
      {payments.length > 0 ? (
        payments.map((p) => {
          const isPaid = p.status === 'paid' || p.status === 'APPROVED';
          const isPending = p.status === 'pending' || p.status === 'PENDING';
          const isRejected = p.status === 'rejected' || p.status === 'REJECTED';

          return (
            <div key={p.id} className="t-hist-item">
              <div>
                <div className="m">{p.period}</div>
                <div className="d">
                  {isPaid && `Paid ${fmtDate(p.paymentDate)}`}
                  {isPending && 'Pending review'}
                  {isRejected && `Rejected — ${p.rejectionReason || 'Contact management'}`}
                </div>
              </div>
              <div className="a">{ETB(p.amount)}</div>
            </div>
          );
        })
      ) : (
        <div className="empty">No payment history recorded yet.</div>
      )}
    </div>
  );
};

export default TenantHistoryPage;

