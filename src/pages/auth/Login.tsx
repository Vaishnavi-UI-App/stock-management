import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Mail, Lock, ArrowRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const user = await login(email, password);
      if (user) {
        navigate('/dashboard');
      } else {
        setError('Invalid email or password');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Left side - branding */}
      <div className="login-brand">
        <div className="login-brand-content">
          <img src="/logo.png" alt="DynamicInventory" className="login-brand-logo" />
          <h1 className="login-brand-title">DynamicInventory</h1>
          <p className="login-brand-subtitle">ERP Stock Management System</p>
          <div className="login-brand-features">
            <div className="login-feature">
              <div className="login-feature-dot"></div>
              <span>Real-time inventory tracking</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot"></div>
              <span>Multi-branch management</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot"></div>
              <span>Sales & performance analytics</span>
            </div>
            <div className="login-feature">
              <div className="login-feature-dot"></div>
              <span>Employee & payroll management</span>
            </div>
          </div>
        </div>
        <div className="login-brand-bg"></div>
      </div>

      {/* Right side - form */}
      <div className="login-form-side">
        <div className="login-form-container">
          <div className="login-form-header">
            <h2>Welcome back</h2>
            <p>Enter your credentials to access your account</p>
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

            <div className="login-field">
              <label>Password</label>
              <div className="login-input-wrapper">
                <Lock size={18} className="login-input-icon" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
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

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? (
                <div className="login-spinner"></div>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-footer-text">
            Contact your administrator if you don't have login credentials
          </p>
        </div>
      </div>
    </div>
  );
}
