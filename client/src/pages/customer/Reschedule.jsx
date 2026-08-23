import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api';

export default function Reschedule() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    ordersApi.get(id).then(d => setOrder(d.order)).catch(e => setError(e.message));
  }, [id]);

  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await ordersApi.reschedule(id, { requested_date: date });
      setSuccess(true);
      setTimeout(() => navigate(`/orders/${id}`), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="d-flex align-items-center justify-content-center" style={{minHeight:'60vh'}}>
        <div className="text-center fade-in-up">
          <div style={{fontSize:'4rem'}}>📅</div>
          <h3 className="fw-bold mt-3">Reschedule Submitted!</h3>
          <p className="text-muted mt-2">New delivery date: <strong>{date}</strong></p>
          <p className="text-muted">Redirecting to your order...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reschedule Delivery</h1>
          <p className="page-subtitle">Order #{id} — Choose a new delivery date</p>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row justify-content-center">
        <div className="col-md-5">
          <div className="dt-card">
            {order && (
              <div className="mb-4 p-3 rounded" style={{background:'#fef3c7',border:'1px solid #fcd34d'}}>
                <p className="fw-bold mb-1 text-warning">⚠️ Failed Delivery</p>
                <p className="small mb-0 text-muted">
                  Drop: {order.drop_address}<br />
                  Original charge: <strong>₹{order.charge_total}</strong>
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="form-label fw-bold">New Delivery Date</label>
                <input
                  id="reschedule-date"
                  type="date"
                  className="form-control form-control-lg"
                  value={date}
                  min={minDateStr}
                  onChange={e => setDate(e.target.value)}
                  required
                />
                <div className="form-text">Earliest available: tomorrow ({minDateStr})</div>
              </div>
              <button id="reschedule-submit" type="submit" className="btn btn-primary w-100 py-2" disabled={loading}>
                {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-calendar2-check me-2" />}
                Submit Reschedule Request
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
