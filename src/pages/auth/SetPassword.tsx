import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, Lock } from 'lucide-react';
import { authApi } from '../../services/api';
import './Login.css';

// Landing page for the link emailed by /forgot-password (and for new-user
// account setup, which reuses the same reset-token mechanism). Verifies the
// token, lets the user pick a new password, then sends them back to Login —
// there's nothing useful for them to do here once the password is set.
export function SetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [checking, setChecking] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [email, setEmail] = useState('');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenError('This link is invalid.');
      setChecking(false);
      return;
    }
    authApi.verifySetPasswordToken(token)
      .then((res) => {
        setTokenValid(true);
        setEmail(res.email || '');
      })
      .catch((err: any) => {
        setTokenError(err.message || 'This link is invalid or has expired.');
      })
      .finally(() => setChecking(false));
  }, [token]);

  // Redirect to Login a moment after a successful reset, so the user lands
  // back where they can actually use their new password.
  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => navigate('/login'), 2500);
    return () => clearTimeout(timer);
  }, [success, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await authApi.setPassword(token!, newPassword);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to set password. Please try again.');
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
          {checking ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div className="login-spinner" style={{ borderTopColor: '#2563eb', margin: '0 auto' }}></div>
            </div>
          ) : success ? (
            <>
              <div className="login-form-header">
                <h2>Password set</h2>
                <p>Your password has been changed successfully. Taking you back to Login…</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', color: '#166534', fontSize: '13px', fontWeight: 500, marginBottom: '20px' }}>
                <CheckCircle2 size={18} />
                <span>You can now log in with your new password.</span>
              </div>
              <Link to="/login" className="login-submit" style={{ textDecoration: 'none' }}>
                Go to Login now
              </Link>
            </>
          ) : !tokenValid ? (
            <>
              <div className="login-form-header">
                <h2>Link invalid</h2>
                <p>{tokenError}</p>
              </div>
              <Link to="/forgot-password" className="login-submit" style={{ textDecoration: 'none' }}>
                Request a new link
              </Link>
              <p className="login-footer-text">
                <Link to="/login" style={{ color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}>
                  <ArrowLeft size={14} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                  Back to Login
                </Link>
              </p>
            </>
          ) : (
            <>
              <div className="login-form-header">
                <h2>Set a new password</h2>
                <p>{email ? <>for <strong>{email}</strong></> : 'Choose a new password for your account.'}</p>
              </div>

              <form className="login-form" onSubmit={handleSubmit}>
                {error && (
                  <div className="login-alert">
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className="login-field">
                  <label>New Password</label>
                  <div className="login-input-wrapper">
                    <Lock size={18} className="login-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="At least 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      className="login-password-toggle"
                      onClick={() => setShowPassword(!showPassword)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="login-field">
                  <label>Confirm Password</label>
                  <div className="login-input-wrapper">
                    <Lock size={18} className="login-input-icon" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="login-submit" disabled={loading}>
                  {loading ? <div className="login-spinner"></div> : 'Set password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
