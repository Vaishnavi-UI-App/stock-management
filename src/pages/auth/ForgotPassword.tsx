import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { authApi } from '../../services/api';
import './Login.css';

export function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
      // Always show the same success state, regardless of whether the email
      // matched an account — the backend intentionally returns a generic
      // message so this endpoint can't be used to discover valid emails.
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-brand">
        <div className="login-brand-content">
          <img src="/logo.png" alt="DynamicIndia" className="login-brand-logo" />
          <h1 className="login-brand-title">DynamicIndia</h1>
          <p className="login-brand-subtitle">ERP System</p>
        </div>
        <div className="login-brand-bg"></div>
      </div>

      <div className="login-form-side">
        <div className="login-form-container">
          {submitted ? (
            <>
              <div className="login-form-header">
                <h2>Check your email</h2>
                <p>
                  If an account exists for <strong>{email}</strong>, we've sent a password
                  reset link to it. The link is valid for 1 hour.
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534', fontSize: '13px', fontWeight: 500, marginBottom: '20px' }}>
                <CheckCircle2 size={18} />
                <span>Request submitted successfully.</span>
              </div>
              <Link to="/login" className="login-submit" style={{ textDecoration: 'none' }}>
                <ArrowLeft size={18} />
                Back to Login
              </Link>
            </>
          ) : (
            <>
              <div className="login-form-header">
                <h2>Forgot password?</h2>
                <p>Enter the email address on your account and we'll send you a link to reset your password.</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="login-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="login-field">
                  <label>Email Address</label>
                  <div className="login-input-wrapper">
                    <Mail size={18} className="login-input-icon" />
                    <input
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>
                </div>

                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? <div className="login-spinner"></div> : 'Send reset link'}
                </button>
              </form>

              <p className="login-footer-text">
                <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Back to Login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
