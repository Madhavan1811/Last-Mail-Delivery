import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api';

const STATUSES = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'];

const STATUS_COLORS = {
  Created: 'rgba(37,99,235,0.2)', Assigned: 'rgba(22,163,74,0.2)', 'Picked Up': 'rgba(234,88,12,0.2)',
  'In Transit': 'rgba(202,138,4,0.2)', 'Out for Delivery': 'rgba(168,85,247,0.2)',
  Delivered: 'rgba(16,185,129,0.2)', Failed: 'rgba(239,68,68,0.2)', Rescheduled: 'rgba(124,58,237,0.2)',
};

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState({});
  const [notes, setNotes] = useState({});

  const loadOrders = () => {
    setLoading(true);
    ordersApi.list()
      .then(d => setOrders(d.orders))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadOrders(); }, []);

  const updateStatus = async (orderId, status) => {
    setUpdating(u => ({ ...u, [orderId]: true }));
    try {
      await ordersApi.updateStatus(orderId, { status, note: notes[orderId] || '' });
      loadOrders();
    } catch (e) {
      alert(e.message);
    } finally {
      setUpdating(u => ({ ...u, [orderId]: false }));
      setNotes(n => ({ ...n, [orderId]: '' }));
    }
  };

  const active  = orders.filter(o => !['Delivered','Failed'].includes(o.current_status));
  const done    = orders.filter(o =>  ['Delivered','Failed'].includes(o.current_status));

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Deliveries</h1>
          <p className="page-subtitle">{active.length} active · {done.length} completed</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={loadOrders}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : orders.length === 0 ? (
        <div className="dt-card text-center py-5">
          <div style={{fontSize:'3rem'}}>📭</div>
          <h5 className="mt-3 text-muted">No assigned orders yet</h5>
          <p className="text-muted">Check back later — your admin will assign deliveries here.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-4">
              <h6 className="text-muted fw-semibold mb-3 text-uppercase" style={{fontSize:'0.75rem',letterSpacing:'0.5px'}}>
                Active ({active.length})
              </h6>
              <div className="row g-3">
                {active.map(order => (
                  <div key={order.id} className="col-md-6 col-xl-4">
                    <div className="dt-card h-100">
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <h6 className="fw-bold mb-0">Order #{order.id}</h6>
                          <small className="text-muted">{order.order_type} · {order.payment_type}</small>
                        </div>
                        <span className="status-badge" style={{
                          background: STATUS_COLORS[order.current_status] || '#f8fafc',
                          color: 'var(--dt-text)', fontSize:'0.7rem',
                        }}>{order.current_status}</span>
                      </div>

                      <div className="small mb-3">
                        <div className="text-muted mb-1">📍 From</div>
                        <div className="fw-semibold mb-2">{order.pickup_address}</div>
                        <div className="text-muted mb-1">📦 To</div>
                        <div className="fw-semibold">{order.drop_address}</div>
                      </div>

                      <div className="d-flex justify-content-between small text-muted mb-3">
                        <span>Customer: {order.customer_name}</span>
                        <span className="fw-bold text-primary">₹{order.charge_total}</span>
                      </div>

                      {/* Status update */}
                      <div>
                        <select
                          id={`status-select-${order.id}`}
                          className="form-select form-select-sm mb-2"
                          defaultValue=""
                          onChange={e => {
                            if (e.target.value) {
                              setNotes(n => ({ ...n, [order.id]: '' }));
                            }
                          }}
                        >
                          <option value="" disabled>Update status...</option>
                          {STATUSES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                        {['Failed'].includes(
                          document.getElementById(`status-select-${order.id}`)?.value
                        ) && (
                          <input className="form-control form-control-sm mb-2" placeholder="Note (reason for failure)"
                            value={notes[order.id] || ''}
                            onChange={e => setNotes(n => ({ ...n, [order.id]: e.target.value }))} />
                        )}
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-primary btn-sm flex-fill"
                            disabled={updating[order.id]}
                            onClick={() => {
                              const sel = document.getElementById(`status-select-${order.id}`);
                              if (!sel?.value) return alert('Please select a status');
                              updateStatus(order.id, sel.value);
                            }}
                          >
                            {updating[order.id] ? <span className="spinner-border spinner-border-sm" /> : 'Update Status'}
                          </button>
                          <button className="btn btn-outline-secondary btn-sm"
                            onClick={() => navigate(`/orders/${order.id}`)}>
                            <i className="bi bi-eye" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h6 className="text-muted fw-semibold mb-3 text-uppercase" style={{fontSize:'0.75rem',letterSpacing:'0.5px'}}>
                Completed ({done.length})
              </h6>
              <div className="dt-card">
                <table className="table dt-table mb-0">
                  <thead><tr>
                    <th>Order</th><th>Drop Address</th><th>Status</th><th>Total</th><th></th>
                  </tr></thead>
                  <tbody>
                    {done.map(o => (
                      <tr key={o.id}>
                        <td>#{o.id}</td>
                        <td>{o.drop_address}</td>
                        <td><span className="status-badge" style={{
                          background: STATUS_COLORS[o.current_status], color:'var(--dt-text)', fontSize:'0.7rem'
                        }}>{o.current_status}</span></td>
                        <td>₹{o.charge_total}</td>
                        <td><button className="btn btn-sm btn-outline-secondary" onClick={() => navigate(`/orders/${o.id}`)}>View</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
