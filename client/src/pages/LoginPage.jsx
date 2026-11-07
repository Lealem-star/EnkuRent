import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export const LoginPage = () => {
  const { login, isAuthenticated, role } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // If already authenticated, redirect to role home
  useEffect(() => {
    if (isAuthenticated && role) {
      if (role === 'SUPER_ADMIN') navigate('/admin/dashboard', { replace: true });
      else if (role === 'OWNER') navigate('/owner/dashboard', { replace: true });
      else if (role === 'MANAGER') navigate('/manager/dashboard', { replace: true });
      else if (role === 'TENANT') navigate('/tenant', { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast('Please enter both your email address and password.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      toast(`Signed in as ${result.user.name}`);
      const redirectRole = result.user.role;
      if (redirectRole === 'SUPER_ADMIN') navigate('/admin/dashboard');
      else if (redirectRole === 'OWNER') navigate('/owner/dashboard');
      else if (redirectRole === 'MANAGER') navigate('/manager/dashboard');
      else navigate('/tenant');
    } else {
      toast(result.message || 'Invalid email or password.');
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
        padding: '24px 16px',
      }}
    >
      <div
        className="panel"
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '36px 30px',
          boxShadow: '0 10px 40px rgba(0,0,0,0.08)',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            className="brand-mark"
            style={{
              margin: '0 auto 12px',
              width: '46px',
              height: '46px',
              fontSize: '22px',
              background: 'var(--gold)',
              color: '#211804',
              fontWeight: 700,
            }}
          >
            ⚡
          </div>
          <h2 style={{ margin: 0, fontSize: '22px' }}>Sign In to EnkuRent</h2>
          <div style={{ color: 'var(--ink-soft)', fontSize: '13px', marginTop: '6px' }}>
            Property &amp; Rent Management Platform
          </div>
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleEmailLogin}>
          <div className="field">
            <label>Email Address</label>
            <input
              type="email"
              placeholder="e.g. admin@enkurent.et or owner@bekele.et"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
          </div>

          <div className="field" style={{ marginTop: '14px' }}>
            <label>Password</label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '18px',
              padding: '11px',
              fontSize: '13.5px',
            }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        {/* Building Owner Registration Link */}
        <div
          style={{
            marginTop: '26px',
            textAlign: 'center',
            fontSize: '13px',
            color: 'var(--ink-soft)',
            borderTop: '1px solid var(--line)',
            paddingTop: '18px',
          }}
        >
          New Building Owner?{' '}
          <Link
            to="/register"
            style={{ color: 'var(--gold)', fontWeight: 600, textDecoration: 'none' }}
          >
            Register as Building Owner →
          </Link>
        </div>

        {/* Back to Home Link */}
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px' }}>
          <Link to="/" style={{ color: 'var(--ink-soft)', textDecoration: 'none' }}>
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
