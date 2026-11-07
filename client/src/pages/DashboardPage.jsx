import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import { ETB, fmtDate } from '../utils/formatters';

export const DashboardPage = () => {
  const { activeBuildingId, role, user } = useAuth();
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

  const [pendingPayments, setPendingPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Review modal state
  const [reviewPayment, setReviewPayment] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchData = useCallback(async () => {
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
      console.warn('Dashboard fetch error:', err.message);
    } finally {
      setLoading(false);
    }
  }, [activeBuildingId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Handle Approve
  const handleApprove = async (id) => {
    setActionLoading(true);
    try {
      const res = await api.post(`/payments/${id}/approve`);
      if (res.data?.success) {
        toast('Payment approved.');
        setReviewPayment(null);
        fetchData();
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
      toast('Please enter a reason for rejection.');
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
        fetchData();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to reject payment');
    } finally {
      setActionLoading(false);
    }
  };

  const maxVal = Math.max(...stats.monthlyTrend.map((m) => m.expected), 1);

  return (
    <div>
      {/* Stat Grid */}
      <div className="stat-grid">
        <StatCard label="Total Offices" value={stats.total} />
        <StatCard
          label="Occupied"
          value={stats.occupied}
          subtext={` / ${stats.total} · ${stats.occupancyRate}%`}
        />
        <StatCard label="Available" value={stats.available} />
        <StatCard label="Expected Rent" value={ETB(stats.expected)} />
        <StatCard
          label="Collected"
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
          label="Pending Verification"
          value={stats.pending}
          valueStyle={{ color: stats.pending > 0 ? 'var(--amber)' : 'var(--ink)' }}
        />
      </div>

      {/* Payment Collection Overview Chart */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Payment Collection Overview</h3>
            <div className="panel-sub">Expected vs. collected rent, last 4 months</div>
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

      {/* Payments Awaiting Verification */}
      <div className="panel">
        <div className="panel-head">
          <div>
            <h3>Payments Awaiting Verification</h3>
            <div className="panel-sub">
              {pendingPayments.length} payment{pendingPayments.length === 1 ? '' : 's'} need review
            </div>
          </div>
          <button className="btn btn-sm" onClick={() => navigate('/payments')}>
            View all
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
                {pendingPayments.slice(0, 6).map((p) => (
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
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">Nothing waiting on your review right now.</div>
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
                <>
                  receipt_{reviewPayment.txnRef}.jpg — <span className="cell-link">View slip record</span>
                </>
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
                placeholder="e.g. Receipt does not match transaction or incorrect amount."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                autoFocus
              />
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

export default DashboardPage;

