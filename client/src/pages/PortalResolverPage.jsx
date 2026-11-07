import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const PortalResolverPage = () => {
  const { officeId } = useParams();
  const { setActiveTenantId, switchRole } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [officeData, setOfficeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('phone'); // phone | otp
  const [devOtp, setDevOtp] = useState('');
  const [verifying, setVerifying] = useState(false);

  useEffect(() => {
    const resolveOffice = async () => {
      try {
        const res = await api.get(`/auth/portal/o/${officeId}`);
        if (res.data?.success) {
          setOfficeData(res.data.data);
          if (res.data.data.tenant?.phone) {
            setPhone(res.data.data.tenant.phone);
          }
        }
      } catch (err) {
        toast('Invalid or expired office portal link.');
      } finally {
        setLoading(false);
      }
    };
    resolveOffice();
  }, [officeId, toast]);

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast('Enter your registered phone number.');
      return;
    }

    setVerifying(true);
    try {
      const res = await api.post('/auth/otp/request', { phone });
      if (res.data?.success) {
        toast('OTP code sent to your phone.');
        if (res.data.data?.devOtpHint) {
          setDevOtp(res.data.data.devOtpHint);
          setOtp(res.data.data.devOtpHint);
        }
        setStep('otp');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setVerifying(true);
    try {
      const res = await api.post('/auth/otp/verify', { phone, otp });
      if (res.data?.success) {
        toast('Verified successfully. Welcome!');
        const tenant = res.data.data.user.tenant;
        if (tenant) {
          setActiveTenantId(tenant.id);
        }
        await switchRole('tenant');
        navigate('/tenant');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Invalid OTP code');
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return <div className="empty">Resolving office portal link...</div>;
  }

  if (!officeData) {
    return (
      <div className="tenant-shell" style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h3>Invalid Office QR Code</h3>
        <p style={{ color: 'var(--ink-soft)' }}>
          This portal link is not registered or the office does not exist.
        </p>
        <button className="btn btn-primary" onClick={() => navigate('/')}>
          Back to EnkuRent
        </button>
      </div>
    );
  }

  const { office, tenant } = officeData;

  return (
    <div className="tenant-shell" style={{ padding: '30px 20px' }}>
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div className="brand-mark" style={{ margin: '0 auto 12px', width: '40px', height: '40px', fontSize: '20px' }}>
          A
        </div>
        <h2>Office {office.number} Portal</h2>
        <div style={{ color: 'var(--ink-soft)', fontSize: '13px' }}>
          {office.buildingName} · Floor {office.floor}
        </div>
      </div>

      <div className="panel" style={{ padding: '20px' }}>
        {step === 'phone' ? (
          <form onSubmit={handleRequestOtp}>
            <div className="field">
              <label>Tenant Phone Number</label>
              <input
                type="tel"
                placeholder="09XXXXXXXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
              <div className="field-hint">
                Enter your phone number to sign in to your office portal.
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={verifying}
            >
              {verifying ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            {devOtp && (
              <div className="warn-box" style={{ background: 'var(--green-soft)', color: 'var(--green)' }}>
                Demo SMS OTP Code: <b>{devOtp}</b>
              </div>
            )}
            <div className="field">
              <label>6-Digit Verification Code</label>
              <input
                type="text"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                maxLength={6}
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '10px' }}
              disabled={verifying}
            >
              {verifying ? 'Verifying...' : 'Verify & Enter Portal'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default PortalResolverPage;

