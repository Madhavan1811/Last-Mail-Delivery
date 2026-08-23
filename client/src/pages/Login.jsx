import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'admin') navigate('/admin');
      else if (user.role === 'agent') navigate('/agent');
      else navigate('/orders/new');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (email, password) => setForm({ email, password });

  return (
    <div className="auth-split-page">
      {/* Left panel */}
      <div className="auth-split-left">
        <div className="auth-split-left-inner">
          <Link to="/" className="auth-split-brand">DeliveryTrack</Link>
          <div className="auth-split-tagline">
            <h2>The smarter way to manage last-mile delivery.</h2>
            <p>Real-time tracking, intelligent dispatch, and a complete audit trail — all in one platform.</p>
          </div>
          <ul className="auth-split-bullets">
            <li><i className="bi bi-check-circle-fill" />Real-time order status updates</li>
            <li><i className="bi bi-check-circle-fill" />Automated agent assignment by zone</li>
            <li><i className="bi bi-check-circle-fill" />Immutable audit log for every order</li>
            <li><i className="bi bi-check-circle-fill" />Role-based dashboards (Admin / Agent / Customer)</li>
          </ul>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-split-right">
        <div className="auth-split-form-wrap fade-in-up">
          <h2 className="auth-split-title">Welcome back</h2>
          <p className="auth-split-sub">Sign in to your account to continue</p>

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Email</label>
              <input id="login-email" type="email" className="form-control" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Password</label>
              <input id="login-password" type="password" className="form-control" placeholder="••••••••"
                value={form.password} onChange={set('password')} required />
            </div>
            <button id="login-submit" type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Sign In
            </button>
          </form>

          {/* Demo credentials */}
          <div className="mt-4 p-3 rounded" style={{background:'#f8fafc',border:'1px solid #e2e8f0'}}>
            <p className="fw-semibold mb-2" style={{fontSize:'0.78rem',color:'#64748b'}}>DEMO ACCOUNTS</p>
            <div className="d-flex flex-column gap-1">
              {[
                { label: 'Admin', email: 'admin@delivery.com', pw: 'password' },
                { label: 'Agent', email: 'ravi@delivery.com',  pw: 'password' },
                { label: 'Customer', email: 'customer@test.com', pw: 'password' },
              ].map(d => (
                <button key={d.email} type="button" className="btn btn-outline-secondary btn-sm text-start"
                  onClick={() => fillDemo(d.email, d.pw)}>
                  {d.label} — {d.email}
                </button>
              ))}
            </div>
            <p className="mt-2 mb-0 text-muted" style={{fontSize:'0.72rem'}}>All passwords: <code>password</code></p>
          </div>

          <p className="text-center mt-3 text-muted" style={{fontSize:'0.85rem'}}>
            No account? <Link to="/register" className="text-primary fw-semibold">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
