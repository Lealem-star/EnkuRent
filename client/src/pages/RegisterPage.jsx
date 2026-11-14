import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export const RegisterPage = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [portfolioDetails, setPortfolioDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      toast('Please enter your full name.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      toast('Please enter a valid email address.');
      return;
    }
    if (!phone.trim()) {
      toast('Please enter your phone number.');
      return;
    }
    if (password.length < 6) {
      toast('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      toast('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/register-owner', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        password,
        companyName: companyName.trim() || null,
        notes: portfolioDetails.trim() || null,
      });

      if (res.data?.success) {
        setSubmitted(true);
        setRegisteredEmail(email.trim().toLowerCase());
        toast('Registration submitted! Awaiting administrator approval.');
      }
    } catch (err) {
      toast(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        padding: '32px 16px',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '36px 32px',
          boxShadow: '0 12px 48px rgba(0,0,0,0.08)',
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '14px' }}>
            <img
              src="/logo.jpg"
              alt="Enqopa RentPro"
              style={{
                height: '52px',
                width: 'auto',
                objectFit: 'contain',
              }}
            />
          </div>
          <h2 style={{ margin: 0, fontFamily: 'Fraunces, serif', fontSize: '20px', color: 'var(--ink)' }}>
            Register as Building Owner
          </h2>
          <div style={{ color: 'var(--ink-soft)', fontSize: '12.5px', marginTop: '4px' }}>
            Enqopa RentPro — Smart Rental Management, Made Easy
          </div>
        </div>

        {submitted ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'var(--green-soft)',
                color: 'var(--green)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                fontSize: '24px',
              }}
            >
              ✓
            </div>
            <h3 style={{ margin: '0 0 10px', fontSize: '18px' }}>
              Registration Submitted!
            </h3>
            <p
              style={{
                fontSize: '13.5px',
                lineHeight: '1.6',
                color: 'var(--ink-soft)',
                marginBottom: '20px',
              }}
            >
              Thank you, <b>{name}</b>. Your building owner account for{' '}
              <b>{registeredEmail}</b> has been received and is currently{' '}
              <span
                style={{
                  display: 'inline-block',
                  background: 'var(--amber-soft)',
                  color: 'var(--amber)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontWeight: 600,
                  fontSize: '12px',
                }}
              >
                PENDING APPROVAL
              </span>{' '}
              by the System Administrator.
            </p>
            <div
              style={{
                background: 'var(--paper-2)',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '14px',
                textAlign: 'left',
                fontSize: '12.5px',
                color: 'var(--ink-soft)',
                marginBottom: '24px',
              }}
            >
              <b>What happens next?</b>
              <ul style={{ margin: '8px 0 0', paddingLeft: '18px', lineHeight: '1.6' }}>
                <li>The System Admin reviews your application and portfolio details.</li>
                <li>Once approved, you will be able to log in with your password.</li>
                <li>You will have full access to add buildings, invite managers/accountants, and assign tenants.</li>
              </ul>
            </div>
            <button
              className="btn btn-primary"
              style={{ width: '100%', padding: '10px' }}
              onClick={() => navigate('/login')}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister}>
            <div className="field-row">
              <div className="field">
                <label>Full Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Solomon Haile"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Company / Estate Name</label>
                <input
                  type="text"
                  placeholder="e.g. Haile Real Estate"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Email Address *</label>
                <input
                  type="email"
                  placeholder="owner@company.et"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  placeholder="0911223344"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field-row">
              <div className="field">
                <label>Password *</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label>Confirm Password *</label>
                <input
                  type="password"
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="field">
              <label>Building Portfolio Description</label>
              <textarea
                rows={2}
                placeholder="e.g. 2 commercial office towers in Bole (30 offices total)"
                value={portfolioDetails}
                onChange={(e) => setPortfolioDetails(e.target.value)}
              />
              <div className="field-hint">
                Brief overview of properties you intend to manage. The System Administrator will review this for approval.
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', marginTop: '16px', padding: '11px', fontSize: '14px' }}
              disabled={loading}
            >
              {loading ? 'Submitting Application...' : 'Submit Owner Registration'}
            </button>

            <div
              style={{
                marginTop: '22px',
                textAlign: 'center',
                fontSize: '13px',
                color: 'var(--ink-soft)',
              }}
            >
              Already have an approved account?{' '}
              <Link to="/login" style={{ color: 'var(--blue)', fontWeight: 600 }}>
                Sign In
              </Link>
            </div>
          </form>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '12px' }}>
          <Link to="/" style={{ color: 'var(--ink-muted)', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

