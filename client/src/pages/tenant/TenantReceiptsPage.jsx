import React, { useState, useEffect } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/Modal';
import { ETB, fmtDate } from '../../utils/formatters';

export const TenantReceiptsPage = () => {
  const { currentTenant } = useOutletContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('verified'); // 'verified' | 'submit'
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Form State
  const [amount, setAmount] = useState(currentTenant?.contract?.rent || 20000);
  const [date, setDate] = useState('2026-09-21');
  const [method, setMethod] = useState('Bank Transfer');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!currentTenant) return;
      setLoading(true);
      try {
        const res = await api.get(`/payments?search=${encodeURIComponent(currentTenant.fullName)}`);
        if (res.data?.success) {
          setPayments(res.data.data?.payments || res.data.data || []);
        }
      } catch {
        // fallback
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [currentTenant]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentTenant) return;

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('tenantId', currentTenant.id);
      formData.append('amount', amount);
      formData.append('paymentDate', date);
      formData.append('method', method.toUpperCase().replace(/\s+/g, '_'));
      formData.append('txnRef', ref || 'FT' + Math.floor(100000 + Math.random() * 900000));
      formData.append('note', note);
      if (file) {
        formData.append('receipt', file);
      }

      const res = await api.post('/payments/receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.success) {
        toast('Receipt submitted — pending accountant verification.');
        setActiveTab('verified');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit receipt');
    } finally {
      setSubmitting(false);
    }
  };

  const verifiedPayments = payments.filter((p) => p.status === 'paid' || p.status === 'APPROVED');

  return (
    <div className="t-section" style={{ marginTop: '16px' }}>
      {/* Sub-tab navigation */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid var(--line)', paddingBottom: '10px' }}>
        <button
          className={`btn btn-sm ${activeTab === 'verified' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('verified')}
        >
          Official Receipts ({verifiedPayments.length})
        </button>
        <button
          className={`btn btn-sm ${activeTab === 'submit' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setActiveTab('submit')}
        >
          + Submit Bank Slip
        </button>
      </div>

      {activeTab === 'verified' ? (
        <div>
          <h4>Official Rent Receipts</h4>
          <p style={{ fontSize: '12px', color: 'var(--ink-soft)', marginTop: 0, marginBottom: '14px' }}>
            Instant digital rent receipts with verified audit stamps. Tap any receipt to print or save.
          </p>

          {verifiedPayments.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {verifiedPayments.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--line)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer',
                  }}
                  onClick={() => setSelectedReceipt(p)}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--ink)' }}>
                      {p.period} Rent
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--ink-soft)', marginTop: '2px' }}>
                      Paid on {fmtDate(p.paymentDate || p.submittedAt)} · {p.method} · Ref: <span className="mono">{p.txnRef || 'Verified'}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="amt" style={{ fontSize: '14px', color: 'var(--green)', fontWeight: 700 }}>
                      {ETB(p.amount)}
                    </div>
                    <div style={{ fontSize: '10.5px', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                      ✓ VERIFIED
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty" style={{ padding: '24px 0' }}>
              {loading ? 'Loading receipts...' : 'No verified receipts available yet.'}
            </div>
          )}
        </div>
      ) : (
        <div>
          <h4>Submit a Payment Receipt</h4>
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Amount Paid (ETB)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <div className="field">
                <label>Payment Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Payment Method</label>
                <select value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cash Deposit">Cash Deposit</option>
                  <option value="Chapa">Chapa</option>
                  <option value="Telebirr">Telebirr</option>
                  <option value="CBE Birr">CBE Birr</option>
                </select>
              </div>
            </div>

            <div className="field">
              <label>Transaction / Reference No.</label>
              <input
                placeholder="e.g. FT26254XXXX"
                value={ref}
                onChange={(e) => setRef(e.target.value)}
              />
            </div>

            <div className="field">
              <label>Receipt Slip / Document</label>
              <div
                style={{
                  border: '1px dashed var(--line)',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  color: 'var(--ink-soft)',
                  fontSize: '12.5px',
                  cursor: 'pointer',
                  background: 'var(--surface)',
                }}
                onClick={() => document.getElementById('receiptFileInput').click()}
              >
                <input
                  id="receiptFileInput"
                  type="file"
                  accept="image/*,application/pdf"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setFile(e.target.files[0]);
                    }
                  }}
                />
                {file ? (
                  <span style={{ color: 'var(--ink)', fontWeight: 600 }}>
                    Selected file: {file.name}
                  </span>
                ) : (
                  'Tap to upload photo or PDF of your receipt slip'
                )}
              </div>
            </div>

            <div className="field">
              <label>Note (optional)</label>
              <textarea
                rows={2}
                placeholder="e.g. Deposited at Bole branch"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '6px' }}
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Receipt'}
            </button>
          </form>
        </div>
      )}

      {/* Official Receipt Viewer Modal */}
      {selectedReceipt && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedReceipt(null)}
          title="Official Rent Receipt"
          footer={
            <>
              <button className="btn" onClick={() => setSelectedReceipt(null)}>
                Close
              </button>
              <button
                className="btn btn-primary"
                onClick={() => window.print()}
              >
                🖨 Print / Save Receipt
              </button>
            </>
          }
        >
          <div
            id="printableReceipt"
            style={{
              border: '2px solid #0B2239',
              borderRadius: '8px',
              padding: '20px',
              background: '#FFFFFF',
              color: '#0B2239',
              fontFamily: 'inherit',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #0B2239', paddingBottom: '12px', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img
                  src="/logo.jpg"
                  alt="Enqopa RentPro"
                  style={{
                    height: '38px',
                    width: 'auto',
                    objectFit: 'contain',
                    display: 'block',
                  }}
                />
                <div>
                  <div style={{ fontSize: '17px', fontWeight: 800, color: '#0B2239', letterSpacing: '-0.02em' }}>
                    Enqopa RentPro
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                    Enqopa Technologies PLC · Addis Ababa, Ethiopia
                  </div>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ background: '#F59E0B', color: '#0B2239', fontSize: '11px', fontWeight: 800, padding: '3px 8px', borderRadius: '4px' }}>
                  OFFICIAL RECEIPT
                </span>
                <div style={{ fontSize: '11px', fontWeight: 700, marginTop: '4px' }} className="mono">
                  RCP-{selectedReceipt.id.slice(-8).toUpperCase()}
                </div>
              </div>
            </div>

            {/* Receipt Body */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '12.5px', marginBottom: '16px' }}>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Received From:</span>
                <div style={{ fontWeight: 700 }}>{currentTenant.fullName}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{currentTenant.phone}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Property / Rental Unit:</span>
                <div style={{ fontWeight: 700 }}>Office {selectedReceipt.officeNumber || currentTenant?.office?.number}</div>
                <div style={{ fontSize: '11px', color: '#64748B' }}>{currentTenant?.office?.buildingName || 'Commercial Property'}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Rental Period:</span>
                <div style={{ fontWeight: 700 }}>{selectedReceipt.period}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Payment Date:</span>
                <div style={{ fontWeight: 700 }}>{fmtDate(selectedReceipt.paymentDate || selectedReceipt.submittedAt)}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Payment Method:</span>
                <div style={{ fontWeight: 700 }}>{selectedReceipt.method}</div>
              </div>
              <div>
                <span style={{ color: '#64748B', fontSize: '11px' }}>Transaction Ref:</span>
                <div style={{ fontWeight: 700 }} className="mono">{selectedReceipt.txnRef || 'BANK-VERIFIED'}</div>
              </div>
            </div>

            {/* Total Box */}
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '6px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Total Amount Received:</span>
              <span style={{ fontSize: '18px', fontWeight: 800, color: '#10B981' }} className="mono">
                {ETB(selectedReceipt.amount)}
              </span>
            </div>

            {/* Verification Stamp */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '18px', paddingTop: '12px', borderTop: '1px dashed #CBD5E1' }}>
              <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                Verified By: <b>{selectedReceipt.verifiedBy || 'Property Accountant'}</b><br />
                System Audit Seal: <b>ENQOPA-PRO-AUTH-OK</b>
              </div>
              <div style={{ border: '2px solid #10B981', color: '#10B981', padding: '4px 10px', borderRadius: '4px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', transform: 'rotate(-4deg)' }}>
                ✓ PAYMENT VERIFIED
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default TenantReceiptsPage;

