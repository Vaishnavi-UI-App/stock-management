import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, EyeOff, AlertCircle } from 'lucide-react';
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
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo">
            <Package size={48} />
          </div>
          <h1>DynamicCrop ERP</h1>
          <p>DynamicCrop ERP System</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          {error && (
            <div className="alert alert-danger">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              type="email"
              className="form-input"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="login-demo">
          <h4>Demo Credentials</h4>
          <div className="demo-credentials">
            <div className="demo-item">
              <span className="demo-role">Stock Manager</span>
              <span className="demo-email">manager@stock.com</span>
              <span className="demo-pass">password123</span>
            </div>
            <div className="demo-item">
              <span className="demo-role">Branch Manager</span>
              <span className="demo-email">pune@branch.com</span>
              <span className="demo-pass">password123</span>
            </div>
            <div className="demo-item">
              <span className="demo-role">Salesman</span>
              <span className="demo-email">rajesh@sales.com</span>
              <span className="demo-pass">password123</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
