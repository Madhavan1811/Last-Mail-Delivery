import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'customer', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const user = await register(form);
      if (user.role === 'agent') navigate('/agent');
      else navigate('/orders/new');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split-page">
      {/* Left panel */}
      <div className="auth-split-left">
        <div className="auth-split-left-inner">
          <Link to="/" className="auth-split-brand">DeliveryTrack</Link>
          <div className="auth-split-tagline">
            <h2>Join the platform powering modern deliveries.</h2>
            <p>Whether you're sending packages or making deliveries, DeliveryTrack has you covered.</p>
          </div>
          <ul className="auth-split-bullets">
            <li><i className="bi bi-check-circle-fill" />Free to get started</li>
            <li><i className="bi bi-check-circle-fill" />Order as a customer or join as an agent</li>
            <li><i className="bi bi-check-circle-fill" />Track every delivery in real time</li>
            <li><i className="bi bi-check-circle-fill" />Secure, session-based authentication</li>
          </ul>
        </div>
      </div>

      {/* Right panel */}
      <div className="auth-split-right">
        <div className="auth-split-form-wrap fade-in-up">
          <h2 className="auth-split-title">Create account</h2>
          <p className="auth-split-sub">Join as a customer or delivery agent</p>

          {error && <div className="alert alert-danger py-2 mb-3">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Full Name</label>
              <input id="reg-name" type="text" className="form-control" placeholder="Your full name"
                value={form.name} onChange={set('name')} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Email</label>
              <input id="reg-email" type="email" className="form-control" placeholder="you@example.com"
                value={form.email} onChange={set('email')} required />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Phone</label>
              <input id="reg-phone" type="tel" className="form-control" placeholder="10-digit mobile number"
                value={form.phone} onChange={set('phone')} />
            </div>
            <div className="mb-3">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Password</label>
              <input id="reg-password" type="password" className="form-control" placeholder="Min 8 characters"
                value={form.password} onChange={set('password')} required />
            </div>
            <div className="mb-4">
              <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>I want to register as</label>
              <div className="d-flex gap-3">
                {['customer','agent'].map(r => (
                  <label key={r} className="d-flex align-items-center gap-2" style={{cursor:'pointer'}}>
                    <input type="radio" name="role" value={r}
                      checked={form.role === r} onChange={set('role')} />
                    <span className="text-capitalize">{r === 'customer' ? 'Customer' : 'Delivery Agent'}</span>
                  </label>
                ))}
              </div>
            </div>
            <button id="reg-submit" type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : null}
              Create Account
            </button>
          </form>

          <p className="text-center mt-3 text-muted" style={{fontSize:'0.85rem'}}>
            Already have an account? <Link to="/login" className="text-primary fw-semibold">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
