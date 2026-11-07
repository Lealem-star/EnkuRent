import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { ETB, fmtDate } from '../utils/formatters';

export const ManagerDashboardPage = () => {
  const { user, activeBuildingId, buildings, tenants } = useAuth();
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
  });

  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review Modal state
  const [reviewPayment, setReviewPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Record Payment Modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordTenantId, setRecordTenantId] = useState('');
  const [recordAmount, setRecordAmount] = useState(20000);
  const [recordDate, setRecordDate] = useState('2026-09-21');
  const [recordMethod, setRecordMethod] = useState('Cash');
  const [recordRef, setRecordRef] = useState('');
  const [recordNotes, setRecordNotes] = useState('');
  const [savingRecord, setSavingRecord] = useState(false);

  const fetchManagerData = useCallback(async () => {
    setLoading(true);
    try {
      const bQuery = activeBuildingId && activeBuildingId !== '__all__' ? `?buildingId=${activeBuildingId}` : '';
      const [resOverview, resPayments] = await Promise.all([
        api.get(`/reports/overview${bQuery}`),
        api.get(`/payments?status=pending${activeBuildingId && activeBuildingId !== '__all__' ? `&buildingId=${activeBuildingId}` : ''}`),
      ]);

      if (resOverview.data?.success) {
        setStats(resOverview.data.data);
      }
      if (resPayments.data?.success) {
        const list = resPayments.data.data?.payments || resPayments.data.data || [];
        setPendingPayments(list.filter((p) => p.status === 'pending' || p.dbStatus === 'PENDING'));
      }
    } catch (err) {
      console.warn('Manager dashboard error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeBuildingId]);

  useEffect(() => {
    fetchManagerData();
  }, [fetchManagerData]);

  // Handle Approve
  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/payments/${id}/approve`);
      if (res.data?.success) {
        toast('Payment approved.');
        setReviewPayment(null);
        fetchManagerData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to approve payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject
  const handleReject = async (id) => {
    if (!showRejectBox) {
      setShowRejectBox(true);
      return;
    }

    if (!rejectReason.trim()) {
      toast('Please enter a rejection reason.');
      return;
    }

    setActionLoading(true);
    try {
      const res = await api.post(`/payments/${id}/reject`, { reason: rejectReason.trim() });
      if (res.data?.success) {
        toast('Payment rejected.');
        setReviewPayment(null);
        setShowRejectBox(false);
        setRejectReason('');
        fetchManagerData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reject payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Save Manual Payment
  const handleSaveManualPayment = async () => {
    if (!recordTenantId) {
      toast('Select a tenant.');
      return;
    }

    setSavingRecord(true);
    try {
      const res = await api.post('/payments/manual', {
        tenantId: recordTenantId,
        amount: Number(recordAmount),
        paymentDate: recordDate,
        method: recordMethod.toUpperCase().replace(/\s+/g, '_'),
        txnRef: recordRef || '—',
        note: recordNotes,
      });

      if (res.data?.success) {
        toast('Payment recorded.');
        setShowRecordModal(false);
        setRecordRef('');
        setRecordNotes('');
        fetchManagerData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div>
      {/* Quick Action Row */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <button
          className="btn btn-primary btn-sm"
          onClick={() => {
            if (tenants.length > 0) {
              setRecordTenantId(tenants[0].id);
              setRecordAmount(tenants[0].contract?.rent || 20000);
            }
            setShowRecordModal(true);
          }}
        >
          + Record Tenant Payment
        </button>
        <button
          className="btn btn-sm"
          onClick={() => navigate('/manager/properties')}
        >
          View Floor Plans
        </button>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => navigate('/manager/reports')}
        >
          Export Collection Report
        </button>
      </div>

      {/* Operational Stats Grid */}
      <div className="stat-grid">
        <StatCard
          label="Offices Managed"
          value={stats.total}
          subtext={` (${stats.occupied} leased)`}
        />
        <StatCard
          label="Vacant Offices"
          value={stats.available}
          subtext=" Ready for leasing"
        />
        <StatCard label="Monthly Expected" value={ETB(stats.expected)} />
        <StatCard
          label="Collected This Cycle"
          value={ETB(stats.collected)}
          flag={{
            text: `${stats.collectionRate}% collected`,
            style: { background: 'var(--green-soft)', color: 'var(--green)' },
          }}
        />
        <StatCard label="Outstanding" value={ETB(stats.outstanding)} />
        <StatCard
          label="Late Payments"
          value={stats.late}
          valueStyle={{ color: stats.late > 0 ? 'var(--red)' : 'var(--ink)' }}
        />
        <StatCard
          label="Slips Awaiting Review"
          value={pendingPayments.length}
          valueStyle={{ color: pendingPayments.length > 0 ? 'var(--amber)' : 'var(--ink)' }}
        />
      </div>

      {/* Action Queue: Payments Awaiting Verification */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Payment Slips Awaiting Review</h3>
            <div className="panel-sub">
              {pendingPayments.length} submission{pendingPayments.length === 1 ? '' : 's'} waiting on your review
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('/manager/payments')}>
            View all payments
          </button>
        </div>

        {pendingPayments.length > 0 ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Office</th>
                  <th>Tenant</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Submitted</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {pendingPayments.map((p) => (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.officeNumber}</td>
                    <td>{p.tenantName}</td>
                    <td className="amt">{ETB(p.amount)}</td>
                    <td>{p.method}</td>
                    <td>{fmtDate(p.submittedDate || p.paymentDate)}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-gold"
                        onClick={() => {
                          setReviewPayment(p);
                          setShowRejectBox(false);
                          setRejectReason('');
                        }}
                      >
                        Review Slip
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">No pending payment slips right now. All submissions reviewed!</div>
        )}
      </div>

      {/* Review Modal */}
      {reviewPayment && (
        <Modal
          isOpen={true}
          onClose={() => setReviewPayment(null)}
          title={`Review Payment — Office ${reviewPayment.officeNumber}`}
          footer={
            <>
              <button
                className="btn btn-red"
                onClick={() => handleReject(reviewPayment.id)}
                disabled={actionLoading}
              >
                Reject Payment
              </button>
              <button
                className="btn btn-green"
                onClick={() => handleApprove(reviewPayment.id)}
                disabled={actionLoading}
              >
                Approve Payment
              </button>
            </>
          }
        >
          {reviewPayment.amount !== reviewPayment.expected && (
            <div className="warn-box">
              Amount does not match expected rent ({ETB(reviewPayment.expected)}).
            </div>
          )}

          <div className="kv-grid" style={{ marginBottom: '14px' }}>
            <div>
              <div className="kv-label">Tenant</div>
              <div className="kv-value">{reviewPayment.tenantName}</div>
            </div>
            <div>
              <div className="kv-label">Expected Rent</div>
              <div className="kv-value mono">{ETB(reviewPayment.expected)}</div>
            </div>
            <div>
              <div className="kv-label">Submitted Amount</div>
              <div
                className="kv-value mono"
                style={{
                  color:
                    reviewPayment.amount !== reviewPayment.expected
                      ? 'var(--red)'
                      : 'var(--ink)',
                }}
              >
                {ETB(reviewPayment.amount)}
              </div>
            </div>
            <div>
              <div className="kv-label">Payment Date</div>
              <div className="kv-value">{fmtDate(reviewPayment.paymentDate)}</div>
            </div>
            <div>
              <div className="kv-label">Payment Method</div>
              <div className="kv-value">{reviewPayment.method}</div>
            </div>
            <div>
              <div className="kv-label">Transaction ID</div>
              <div className="kv-value mono" style={{ fontSize: '13px' }}>
                {reviewPayment.txnRef}
              </div>
            </div>
          </div>

          <div className="field">
            <label>Receipt Attachment</label>
            <div
              style={{
                border: '1px dashed var(--line)',
                borderRadius: '6px',
                padding: '14px',
                textAlign: 'center',
                color: 'var(--ink-soft)',
                fontSize: '12.5px',
              }}
            >
              {reviewPayment.receiptUrl ? (
                <a
                  href={`http://localhost:5000${reviewPayment.receiptUrl}`}
                  target="_blank"
                  rel="noreferrer"
                  className="cell-link"
                >
                  View uploaded receipt slip
                </a>
              ) : (
                <>receipt_{reviewPayment.txnRef}.jpg — <span className="cell-link">View slip record</span></>
              )}
            </div>
          </div>

          {reviewPayment.note && (
            <div className="field">
              <label>Tenant Note</label>
              <div style={{ fontSize: '13px' }}>{reviewPayment.note}</div>
            </div>
          )}

          {showRejectBox && (
            <div className="field">
              <label>Reason for rejection</label>
              <textarea
                rows={2}
                placeholder="e.g. Deposit slip does not match transaction amount."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </Modal>
      )}

      {/* Record Payment Modal */}
      <Modal
        isOpen={showRecordModal}
        onClose={() => setShowRecordModal(false)}
        title="Record Tenant Payment"
        footer={
          <>
            <button className="btn" onClick={() => setShowRecordModal(false)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSaveManualPayment}
              disabled={savingRecord}
            >
              {savingRecord ? 'Saving...' : 'Save Payment'}
            </button>
          </>
        }
      >
        <div className="field">
          <label>Tenant</label>
          <select
            value={recordTenantId}
            onChange={(e) => {
              setRecordTenantId(e.target.value);
              const t = tenants.find((x) => x.id === e.target.value);
              if (t && t.contract) {
                setRecordAmount(t.contract.rent);
              }
            }}
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.fullName} {t.office ? `— Office ${t.office.number}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Amount (ETB)</label>
            <input
              type="number"
              value={recordAmount}
              onChange={(e) => setRecordAmount(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Payment Date</label>
            <input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label>Payment Method</label>
            <select
              value={recordMethod}
              onChange={(e) => setRecordMethod(e.target.value)}
            >
              <option value="Cash">Cash</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Chapa">Chapa</option>
              <option value="Telebirr">Telebirr</option>
              <option value="CBE Birr">CBE Birr</option>
            </select>
          </div>
          <div className="field">
            <label>Transaction / Reference No.</label>
            <input
              placeholder="Optional"
              value={recordRef}
              onChange={(e) => setRecordRef(e.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label>Notes</label>
          <textarea
            rows={2}
            placeholder="e.g. Paid cash at building office, physical receipt handed over."
            value={recordNotes}
            onChange={(e) => setRecordNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default ManagerDashboardPage;

