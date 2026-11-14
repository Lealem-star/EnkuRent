import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import { ETB, fmtDate, fmtDateTime } from '../utils/formatters';

export const OfficeDetailPage = () => {
  const { id } = useParams();
  const { role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const basePath = role === 'OWNER' ? '/owner' : '/manager';

  const [office, setOffice] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Modals
  const [showEndTenancy, setShowEndTenancy] = useState(false);
  const [showManualPay, setShowManualPay] = useState(false);
  const [payAmount, setPayAmount] = useState(0);
  const [payDate, setPayDate] = useState('2026-09-21');
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payNotes, setPayNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOffice = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/offices/${id}`);
      if (res.data?.success) {
        setOffice(res.data.data);
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to fetch office details');
    } finally {
      setLoading(false);
    }
  }, [id, toast]);

  useEffect(() => {
    fetchOffice();
  }, [fetchOffice]);

  if (loading || !office) {
    return <div className="empty">Loading office records...</div>;
  }

  const activeContract = office.activeContract || null;
  const tenant = activeContract?.tenant || null;
  const currentPay = office.currentPayment || null;

  // Handle End Tenancy
  const handleEndTenancy = async () => {
    if (!tenant) return;
    setSubmitting(true);
    try {
      const res = await api.post(`/tenants/${tenant.id}/end`);
      if (res.data?.success) {
        toast('Tenancy ended. History preserved.');
        setShowEndTenancy(false);
        fetchOffice();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to end tenancy');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Record Manual Payment
  const handleSaveManualPayment = async () => {
    if (!tenant) return;
    setSubmitting(true);
    try {
      const res = await api.post('/payments/manual', {
        tenantId: tenant.id,
        amount: Number(payAmount) || Number(activeContract.rent),
        paymentDate: payDate,
        method: payMethod.toUpperCase().replace(/\s+/g, '_'),
        txnRef: payRef || '—',
        note: payNotes,
      });

      if (res.data?.success) {
        toast('Payment recorded.');
        setShowManualPay(false);
        fetchOffice();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to record payment');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Toggle Maintenance
  const handleToggleMaintenance = async () => {
    const nextStatus = office.status === 'MAINTENANCE' ? 'AVAILABLE' : 'MAINTENANCE';
    try {
      const res = await api.patch(`/offices/${id}/status`, { status: nextStatus });
      if (res.data?.success) {
        toast(`Office status changed to ${nextStatus}.`);
        fetchOffice();
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to update office status');
    }
  };

  // Contract expiry calculations
  const contractDaysLeft = activeContract
    ? Math.round((new Date(activeContract.endDate) - new Date()) / (1000 * 60 * 60 * 24))
    : 0;
  const isExpiringSoon = contractDaysLeft >= 0 && contractDaysLeft < 45;

  const tabs = ['overview', 'tenant', 'contract', 'payments', 'history', 'documents', 'audit'];

  const portalUrl = `${window.location.origin}/#/portal/o/${office.id}`;

  return (
    <div>
      {/* Office Header Card with Tabs */}
      <div className="panel">
        <div className="tabs">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Tab Body */}
        {!tenant && office.status === 'AVAILABLE' && (
          <div className="panel-body">
            <div className="empty">This office is currently vacant and ready for leasing.</div>
            <div style={{ textAlign: 'center', display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`${basePath}/properties/${office.buildingId}`)}
              >
                + Assign a Tenant
              </button>
              <button
                className="btn btn-ghost"
                onClick={handleToggleMaintenance}
              >
                Mark Under Maintenance
              </button>
            </div>
          </div>
        )}

        {!tenant && office.status === 'MAINTENANCE' && (
          <div className="panel-body">
            <div className="empty" style={{ color: 'var(--amber)' }}>This office is currently marked under maintenance.</div>
            <div style={{ textAlign: 'center' }}>
              <button
                className="btn btn-primary"
                onClick={handleToggleMaintenance}
              >
                Mark Maintenance Complete (Make Available)
              </button>
            </div>
          </div>
        )}

        {tenant && activeTab === 'overview' && (
          <div className="panel-body">
            <div className="kv-grid">
              <div>
                <div className="kv-label">Tenant</div>
                <div className="kv-value">{tenant.fullName}</div>
              </div>
              <div>
                <div className="kv-label">Monthly Rent</div>
                <div className="kv-value mono">{ETB(activeContract.rent)}</div>
              </div>
              <div>
                <div className="kv-label">Payment Frequency</div>
                <div className="kv-value">{activeContract.frequency}</div>
              </div>
              <div>
                <div className="kv-label">Next Due Date</div>
                <div className="kv-value">Sep 5, 2026</div>
              </div>
              <div>
                <div className="kv-label">Current Status</div>
                <div className="kv-value">
                  <StatusBadge status={office.cycleStatus} />
                </div>
              </div>
              <div>
                <div className="kv-label">Contract</div>
                <div className="kv-value" style={{ fontSize: '13.5px' }}>
                  {fmtDate(activeContract.startDate)} – {fmtDate(activeContract.endDate)}
                </div>
              </div>
            </div>
          </div>
        )}

        {tenant && activeTab === 'tenant' && (
          <div className="panel-body">
            <div className="kv-grid">
              <div>
                <div className="kv-label">Full Name</div>
                <div className="kv-value">{tenant.fullName}</div>
              </div>
              <div>
                <div className="kv-label">Phone</div>
                <div className="kv-value mono">{tenant.phone}</div>
              </div>
              <div>
                <div className="kv-label">Email</div>
                <div className="kv-value" style={{ fontSize: '13.5px' }}>
                  {tenant.email}
                </div>
              </div>
              <div>
                <div className="kv-label">Office</div>
                <div className="kv-value">
                  {office.number}, {office.building?.name}
                </div>
              </div>
            </div>

            {role === 'owner' && (
              <div style={{ marginTop: '18px', display: 'flex', gap: '8px' }}>
                <button
                  className="btn btn-sm"
                  onClick={() => toast('Edit details saved.')}
                >
                  Edit Details
                </button>
                <button
                  className="btn btn-sm btn-red"
                  onClick={() => setShowEndTenancy(true)}
                >
                  End Tenancy
                </button>
              </div>
            )}
          </div>
        )}

        {tenant && activeTab === 'contract' && (
          <div className="panel-body">
            <div className="kv-grid">
              <div>
                <div className="kv-label">Rent Amount</div>
                <div className="kv-value mono">{ETB(activeContract.rent)}</div>
              </div>
              <div>
                <div className="kv-label">Payment Frequency</div>
                <div className="kv-value">{activeContract.frequency}</div>
              </div>
              <div>
                <div className="kv-label">Start Date</div>
                <div className="kv-value">{fmtDate(activeContract.startDate)}</div>
              </div>
              <div>
                <div className="kv-label">End Date</div>
                <div className="kv-value">{fmtDate(activeContract.endDate)}</div>
              </div>
              <div>
                <div className="kv-label">Due Day</div>
                <div className="kv-value">{activeContract.dueDay}th of each month</div>
              </div>
              <div>
                <div className="kv-label">Contract Status</div>
                <div className="kv-value">
                  <StatusBadge
                    status={isExpiringSoon ? 'expiring' : activeContract.status.toLowerCase()}
                  />
                </div>
              </div>
            </div>

            {isExpiringSoon && (
              <div className="warn-box" style={{ marginTop: '14px' }}>
                Contract for Office {office.number} expires {fmtDate(activeContract.endDate)} — renew soon.
              </div>
            )}

            {activeContract.rentHistories && activeContract.rentHistories.length > 1 && (
              <div style={{ marginTop: '16px' }}>
                <div className="kv-label" style={{ marginBottom: '8px' }}>
                  Rent History
                </div>
                <table>
                  <tbody>
                    {activeContract.rentHistories.map((rh, idx) => (
                      <tr key={idx}>
                        <td>
                          {fmtDate(rh.effectiveFrom)} – {rh.effectiveTo ? fmtDate(rh.effectiveTo) : 'Present'}
                        </td>
                        <td className="amt">{ETB(rh.rent)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tenant && activeTab === 'payments' && (
          <div className="panel-body">
            <div className="kv-grid" style={{ marginBottom: '16px' }}>
              <div>
                <div className="kv-label">Expected — September 2026</div>
                <div className="kv-value mono">{ETB(activeContract.rent)}</div>
              </div>
              <div>
                <div className="kv-label">Status</div>
                <div className="kv-value">
                  <StatusBadge status={office.cycleStatus} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              {office.cycleStatus === 'pending' && currentPay && (
                <button
                  className="btn btn-gold btn-sm"
                  onClick={() => navigate(`${basePath}/payments`)}
                >
                  Review Submitted Payment
                </button>
              )}
              {(office.cycleStatus === 'overdue' || office.cycleStatus === 'unpaid') && (
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    setPayAmount(activeContract.rent);
                    setShowManualPay(true);
                  }}
                >
                  + Record Payment
                </button>
              )}
            </div>
          </div>
        )}

        {tenant && activeTab === 'history' && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Method</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {office.payments && office.payments.length > 0 ? (
                  office.payments.map((p) => (
                    <tr key={p.id}>
                      <td>{p.period}</td>
                      <td className="amt">{ETB(p.amount)}</td>
                      <td>
                        <StatusBadge status={p.status === 'APPROVED' ? 'paid' : p.status.toLowerCase()} />
                        {p.isManual && <span className="badge badge-manual">Manual</span>}
                      </td>
                      <td>{fmtDate(p.paymentDate || p.submittedAt)}</td>
                      <td>{p.method}</td>
                      <td>
                        <button
                          className="btn btn-sm btn-ghost"
                          onClick={() => toast(`Downloading receipt for ${p.period}...`)}
                        >
                          Download
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="6" className="empty">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {tenant && activeTab === 'documents' && (
          <div className="panel-body">
            <table>
              <tbody>
                <tr>
                  <td className="cell-strong">Lease Agreement.pdf</td>
                  <td>Uploaded {fmtDate(activeContract.startDate)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => toast('Opening Lease Agreement.pdf...')}
                    >
                      View
                    </button>
                  </td>
                </tr>
                <tr>
                  <td className="cell-strong">Tenant ID Copy.pdf</td>
                  <td>Uploaded {fmtDate(activeContract.startDate)}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-ghost"
                      onClick={() => toast('Opening Tenant ID Copy.pdf...')}
                    >
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="panel-body">
            {office.auditEntries && office.auditEntries.length > 0 ? (
              office.auditEntries.map((a) => (
                <div key={a.id} className="audit-item">
                  <div className="audit-time">{fmtDateTime(a.createdAt)}</div>
                  <div className="audit-text">
                    <b>{a.actorName}</b> — {a.meta || a.action}
                  </div>
                </div>
              ))
            ) : (
              <div className="empty">No recorded activity yet.</div>
            )}
          </div>
        )}
      </div>

      {/* Tenant Portal Access Panel */}
      {tenant && (
        <div className="panel">
          <div className="panel-head">
            <h3>Tenant Portal Access</h3>
          </div>
          <div
            className="panel-body"
            style={{ display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap' }}
          >
            <div
              style={{
                width: '88px',
                height: '88px',
                border: '1px solid var(--line)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 'none',
                overflow: 'hidden',
                background: '#fff',
              }}
            >
              <img
                src={`http://localhost:5000/api/offices/${office.id}/qr`}
                alt="Office QR Code"
                style={{ width: '80px', height: '80px' }}
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>

            <div style={{ flex: 1, minWidth: '200px' }}>
              <div className="kv-label">Portal link</div>
              <div
                className="mono"
                style={{ fontSize: '12.5px', color: 'var(--blue)', wordBreak: 'break-all' }}
              >
                enqoparentpro.et/o/{office.id}
              </div>
              <div style={{ marginTop: '10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <a
                  href={`http://localhost:5000/api/offices/${office.id}/qr`}
                  download={`office-${office.number}-qr.svg`}
                  className="btn btn-sm"
                >
                  Download QR
                </a>
                <button
                  className="btn btn-sm"
                  onClick={() => {
                    const printWin = window.open(`http://localhost:5000/api/offices/${office.id}/qr`, '_blank');
                    if (printWin) {
                      printWin.onload = () => printWin.print();
                    }
                  }}
                >
                  Print QR
                </button>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={() => {
                    navigator.clipboard.writeText(portalUrl);
                    toast('Portal link copied to clipboard.');
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* End Tenancy Modal */}
      {tenant && (
        <Modal
          isOpen={showEndTenancy}
          onClose={() => setShowEndTenancy(false)}
          title={`End Tenancy — Office ${office.number}`}
          footer={
            <>
              <button className="btn" onClick={() => setShowEndTenancy(false)}>
                Cancel
              </button>
              <button
                className="btn btn-red"
                onClick={handleEndTenancy}
                disabled={submitting}
              >
                {submitting ? 'Ending...' : 'End Tenancy'}
              </button>
            </>
          }
        >
          <p style={{ fontSize: '13.5px', margin: 0 }}>
            This ends {tenant.fullName}'s active contract and marks Office {office.number} as available.
            Payment and contract history is preserved and stays visible on the office record.
          </p>
        </Modal>
      )}

      {/* Record Manual Payment Modal */}
      {tenant && (
        <Modal
          isOpen={showManualPay}
          onClose={() => setShowManualPay(false)}
          title={`Record Payment — Office ${office.number}`}
          footer={
            <>
              <button className="btn" onClick={() => setShowManualPay(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={handleSaveManualPayment}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save Payment'}
              </button>
            </>
          }
        >
          <div className="field">
            <label>Tenant</label>
            <input value={tenant.fullName} disabled />
          </div>
          <div className="field-row">
            <div className="field">
              <label>Amount (ETB)</label>
              <input
                type="number"
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Payment Date</label>
              <input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
              />
            </div>
          </div>
          <div className="field-row">
            <div className="field">
              <label>Payment Method</label>
              <select
                value={payMethod}
                onChange={(e) => setPayMethod(e.target.value)}
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
                value={payRef}
                onChange={(e) => setPayRef(e.target.value)}
              />
            </div>
          </div>
          <div className="field">
            <label>Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Paid in person at office, receipt given."
              value={payNotes}
              onChange={(e) => setPayNotes(e.target.value)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default OfficeDetailPage;

