import React, { useState } from 'react';
import { useOutletContext, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';

export const TenantReceiptsPage = () => {
  const { currentTenant } = useOutletContext();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [amount, setAmount] = useState(currentTenant?.contract?.rent || 20000);
  const [date, setDate] = useState('2026-09-21');
  const [method, setMethod] = useState('Bank Transfer');
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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
        navigate('/tenant');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to submit receipt');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="t-section" style={{ marginTop: '16px' }}>
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
  );
};

export default TenantReceiptsPage;

