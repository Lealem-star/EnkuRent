import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ETB, fmtDate } from '../../utils/formatters';

export const TenantHomePage = () => {
  const { currentTenant } = useOutletContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [payments, setPayments] = useState([]);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState('');
  const [paying, setPaying] = useState(false);

  const fetchTenantData = useCallback(async () => {
    if (!currentTenant) return;
    try {
      const res = await api.get(`/payments?search=${encodeURIComponent(currentTenant.fullName)}`);
      if (res.data?.success) {
        setPayments(res.data.data?.payments || res.data.data || []);
      }
    } catch {
      // fallback
    }
  }, [currentTenant]);

  useEffect(() => {
    fetchTenantData();
  }, [fetchTenantData]);

  if (!currentTenant) {
    return <div className="empty">No tenant selected.</div>;
  }

  const contract = currentTenant.contract;
  const currentPay = payments.find((p) => p.period === 'September 2026');

  let status = currentTenant.cycleStatus || 'unpaid';
  if (currentPay) {
    if (currentPay.status === 'paid' || currentPay.status === 'APPROVED') status = 'paid';
    else if (currentPay.status === 'pending' || currentPay.status === 'PENDING') status = 'pending';
    else if (currentPay.status === 'rejected' || currentPay.status === 'REJECTED') status = 'rejected';
  }

  const statusColor = {
    paid: 'var(--green)',
    pending: 'var(--amber)',
    unpaid: '#B9C0DA',
    overdue: '#F0A79E',
    rejected: '#F0A79E',
  }[status] || '#B9C0DA';

  const handleConfirmPayment = async () => {
    if (!selectedMethod) {
      toast('Please select a payment method.');
      return;
    }

    setPaying(true);
    try {
      const res = await api.post('/gateway/instant-pay', {
        tenantId: currentTenant.id,
        method: selectedMethod,
        amount: contract ? contract.rent : 20000,
        period: 'September 2026',
      });

      if (res.data?.success) {
        toast(
          ['Chapa', 'Telebirr', 'CBE Birr'].includes(selectedMethod)
            ? 'Payment confirmed — thank you!'
            : 'Payment submitted — pending verification.'
        );
        setShowPayModal(false);
        fetchTenantData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Payment initiation failed');
    } finally {
      setPaying(false);
    }
  };

  return (
    <div>
      {/* Rent Card */}
      <div className="rent-card">
        <div className="rent-label">Current Rent — {contract ? contract.frequency : 'Monthly'}</div>
        <div className="rent-amount">{ETB(contract ? contract.rent : 20000)}</div>
        <div className="rent-due">Due date: September 5, 2026</div>
        <div className="rent-status" style={{ color: statusColor, fontWeight: 700, fontSize: '13px' }}>
          {status === 'paid' && '✓ PAID'}
          {status === 'pending' && '⏳ PENDING VERIFICATION'}
          {status === 'overdue' && '! OVERDUE'}
          {status === 'rejected' && '× REJECTED — RESUBMIT'}
          {status === 'unpaid' && '○ UNPAID'}
        </div>

        {status !== 'paid' && status !== 'pending' && (
          <button className="rent-pay-btn" onClick={() => setShowPayModal(true)}>
            Pay Rent
          </button>
        )}

        {status === 'pending' && currentPay && (
          <div style={{ marginTop: '14px', fontSize: '11.5px', color: '#B9C0DA', position: 'relative' }}>
            Submitted {fmtDate(currentPay.paymentDate || currentPay.submittedDate)} · awaiting accountant review
          </div>
        )}
      </div>

      {/* Payment Instructions */}
      <div className="t-section">
        <h4>Payment Instructions</h4>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--line)',
            borderRadius: '10px',
            padding: '14px',
            fontSize: '12.5px',
            color: 'var(--ink-soft)',
          }}
        >
          Pay via Chapa, Telebirr or CBE Birr for instant confirmation, or transfer to the building
          account and upload your receipt for review.
        </div>
      </div>

      {/* Recent Payments */}
      <div className="t-section">
        <h4>Recent Payments</h4>
        {payments.slice(0, 3).map((p) => (
          <div key={p.id} className="t-hist-item">
            <div>
              <div className="m">{p.period}</div>
              <div className="d">
                {p.status === 'paid' || p.status === 'APPROVED'
                  ? `Paid ${fmtDate(p.paymentDate)}`
                  : p.status === 'pending' || p.status === 'PENDING'
                  ? 'Awaiting review'
                  : 'Rejected'}
              </div>
            </div>
            <div className="a">{ETB(p.amount)}</div>
          </div>
        ))}
      </div>

      {/* Pay Rent Modal */}
      <Modal
        isOpen={showPayModal}
        onClose={() => setShowPayModal(false)}
        title={`Pay Rent — ${ETB(contract ? contract.rent : 20000)}`}
        footer={
          <>
            <button className="btn" onClick={() => setShowPayModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleConfirmPayment}
              disabled={!selectedMethod || paying}
            >
              {paying ? 'Processing...' : 'Confirm Payment'}
            </button>
          </>
        }
      >
        <p style={{ fontSize: '12.5px', color: 'var(--ink-soft)', marginTop: 0 }}>
          Choose how you'd like to pay. Mobile money and card payments confirm instantly; bank
          transfer requires a quick review.
        </p>

        <div className="method-grid">
          <div
            className={`method-opt ${selectedMethod === 'Chapa' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('Chapa')}
          >
            <b>Chapa</b>
            <span>Card &amp; mobile money</span>
          </div>
          <div
            className={`method-opt ${selectedMethod === 'Telebirr' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('Telebirr')}
          >
            <b>Telebirr</b>
            <span>Instant confirmation</span>
          </div>
          <div
            className={`method-opt ${selectedMethod === 'CBE Birr' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('CBE Birr')}
          >
            <b>CBE Birr</b>
            <span>Instant confirmation</span>
          </div>
          <div
            className={`method-opt ${selectedMethod === 'Bank Transfer' ? 'selected' : ''}`}
            onClick={() => setSelectedMethod('Bank Transfer')}
          >
            <b>Bank Transfer</b>
            <span>Needs verification</span>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TenantHomePage;

