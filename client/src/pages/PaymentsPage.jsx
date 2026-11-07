import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import BuildingSwitcher from '../components/BuildingSwitcher';
import { ETB, fmtDate } from '../utils/formatters';

export const PaymentsPage = () => {
  const { activeBuildingId, tenants, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [payments, setPayments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter, setFilter] = useState('all'); // all | paid | pending | overdue | rejected
  const [search, setSearch] = useState('');
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

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeBuildingId && activeBuildingId !== '__all__') {
        params.append('buildingId', activeBuildingId);
      }
      if (filter !== 'all') {
        params.append('status', filter);
      }
      if (search.trim()) {
        params.append('search', search.trim());
      }

      const res = await api.get(`/payments?${params.toString()}`);
      if (res.data?.success) {
        setPayments(res.data.data?.payments || res.data.data || []);
        setPendingCount(res.data.data?.pendingCount || 0);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch payments');
    } finally {
      setLoading(false);
    }
  }, [activeBuildingId, filter, search, toast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Handle Approve in review modal
  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/payments/${id}/approve`);
      if (res.data?.success) {
        toast('Payment approved.');
        setReviewPayment(null);
        fetchPayments();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to approve payment');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Reject in review modal
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
        fetchPayments();
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
        fetchPayments();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record manual payment');
    } finally {
      setSavingRecord(false);
    }
  };

  return (
    <div className="panel">
      {/* Filter Row */}
      <div className="filter-row">
        <div className="chip-row">
          <span
            className={`chip ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </span>
          <span
            className={`chip ${filter === 'paid' ? 'active' : ''}`}
            onClick={() => setFilter('paid')}
          >
            Paid
          </span>
          <span
            className={`chip ${filter === 'pending' ? 'active' : ''}`}
            onClick={() => setFilter('pending')}
          >
            Pending{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </span>
          <span
            className={`chip ${filter === 'overdue' ? 'active' : ''}`}
            onClick={() => setFilter('overdue')}
          >
            Overdue
          </span>
          <span
            className={`chip ${filter === 'rejected' ? 'active' : ''}`}
            onClick={() => setFilter('rejected')}
          >
            Rejected
          </span>
        </div>

        <input
          type="text"
          placeholder="Search tenant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <BuildingSwitcher />

        <button
          className="btn btn-primary"
          style={{ marginLeft: 'auto' }}
          onClick={() => {
            if (tenants.length > 0) {
              setRecordTenantId(tenants[0].id);
              setRecordAmount(tenants[0].contract?.rent || 20000);
            }
            setShowRecordModal(true);
          }}
        >
          + Record Payment
        </button>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Tenant</th>
              <th>Office</th>
              <th>Amount</th>
              <th>Due Date</th>
              <th>Payment Date</th>
              <th>Method</th>
              <th>Status</th>
              <th>Verified By</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {payments.length > 0 ? (
              payments.map((p) => {
                const isPending = p.status === 'pending' || p.dbStatus === 'PENDING';
                const isOverdue = p.status === 'overdue';

                return (
                  <tr key={p.id}>
                    <td className="cell-strong">{p.tenantName}</td>
                    <td>{p.officeNumber}</td>
                    <td className="amt">{ETB(p.amount)}</td>
                    <td>{fmtDate(p.dueDate)}</td>
                    <td>{p.paymentDate ? fmtDate(p.paymentDate) : '—'}</td>
                    <td>{p.method}</td>
                    <td>
                      <StatusBadge status={p.status} />
                      {p.manual && <span className="badge badge-manual" style={{ marginLeft: '4px' }}>Manual</span>}
                    </td>
                    <td>{p.verifiedBy || '—'}</td>
                    <td>
                      {isPending ? (
                        <button
                          className="btn btn-sm btn-gold"
                          onClick={() => {
                            setReviewPayment(p);
                            setShowRejectBox(false);
                            setRejectReason('');
                          }}
                        >
                          Review
                        </button>
                      ) : isOverdue ? (
                        <button
                          className="btn btn-sm"
                          onClick={() => {
                            setRecordTenantId(p.tenantId);
                            setRecordAmount(p.amount);
                            setShowRecordModal(true);
                          }}
                        >
                          Record
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => navigate(`${basePath}/office/${p.officeId}`)}
                        >
                          Open
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9" className="empty">
                  {loading ? 'Loading payment records...' : 'No payments match this filter.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
            <label>Receipt</label>
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
                  View attached receipt file
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
                placeholder="e.g. Receipt does not match transaction or partial amount."
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
        title="Record Payment"
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
            placeholder="e.g. Paid in person at office, receipt given."
            value={recordNotes}
            onChange={(e) => setRecordNotes(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
};

export default PaymentsPage;

