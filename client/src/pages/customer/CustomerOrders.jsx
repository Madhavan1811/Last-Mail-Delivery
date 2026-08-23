import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ordersApi } from '../../api';

export default function CustomerOrders() {
  const navigate = useNavigate();
  const [orders, setOrders]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filterStatus, setFilter] = useState('ALL');
  const [search, setSearch]       = useState('');

  const loadOrders = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const data = await ordersApi.list({ limit: 50 });
      setOrders(data.orders || []);
    } catch (err) {
      setError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders(true);
    const interval = setInterval(() => loadOrders(false), 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = orders.filter(o => {
    const matchesStatus = filterStatus === 'ALL' || o.current_status === filterStatus;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      String(o.id).includes(q) ||
      (o.pickup_address && o.pickup_address.toLowerCase().includes(q)) ||
      (o.drop_address && o.drop_address.toLowerCase().includes(q)) ||
      (o.pickup_zone_name && o.pickup_zone_name.toLowerCase().includes(q)) ||
      (o.drop_zone_name && o.drop_zone_name.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const activeCount    = orders.filter(o => !['Delivered', 'Failed'].includes(o.current_status)).length;
  const deliveredCount = orders.filter(o => o.current_status === 'Delivered').length;
  const failedCount    = orders.filter(o => o.current_status === 'Failed').length;

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">My Shipments</h1>
          <p className="page-subtitle">Track live status and view historical delivery details</p>
        </div>
        <Link to="/orders/new" className="btn btn-primary">
          <i className="bi bi-plus-lg me-1" /> New Shipment
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible mb-3">
          {error} <button className="btn-close" onClick={() => setError('')} />
        </div>
      )}

      {/* Metrics Row */}
      <div className="row g-3 mb-4">
        <div className="col-6 col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-value">{orders.length}</div>
                <div className="stat-label">Total Orders</div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: '#60a5fa' }}>
                <i className="bi bi-box-seam" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-value text-primary">{activeCount}</div>
                <div className="stat-label">Active / In Transit</div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(14,165,233,0.15)', color: '#38bdf8' }}>
                <i className="bi bi-truck" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-value text-success">{deliveredCount}</div>
                <div className="stat-label">Delivered</div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(35,134,54,0.15)', color: '#4ade80' }}>
                <i className="bi bi-check-circle" />
              </div>
            </div>
          </div>
        </div>

        <div className="col-6 col-md-3">
          <div className="stat-card">
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <div className="stat-value text-danger">{failedCount}</div>
                <div className="stat-label">Action Needed</div>
              </div>
              <div className="stat-icon" style={{ background: 'rgba(218,54,51,0.15)', color: '#f87171' }}>
                <i className="bi bi-exclamation-triangle" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search controls */}
      <div className="dt-card mb-4">
        <div className="row g-2 align-items-center">
          <div className="col-md-6">
            <div className="input-group">
              <span className="input-group-text bg-dark border-secondary text-muted" style={{ background: 'var(--dt-surface-2) !important', borderColor: 'var(--dt-border) !important' }}>
                <i className="bi bi-search" />
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by Order ID, address, or zone..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className="btn btn-outline-secondary" onClick={() => setSearch('')}>✕</button>
              )}
            </div>
          </div>
          <div className="col-md-4">
            <select
              className="form-select"
              value={filterStatus}
              onChange={e => setFilter(e.target.value)}
            >
              <option value="ALL">All Statuses</option>
              <option value="Created">Created</option>
              <option value="Assigned">Assigned</option>
              <option value="Picked Up">Picked Up</option>
              <option value="In Transit">In Transit</option>
              <option value="Out for Delivery">Out for Delivery</option>
              <option value="Delivered">Delivered</option>
              <option value="Failed">Failed</option>
              <option value="Rescheduled">Rescheduled</option>
            </select>
          </div>
          <div className="col-md-2 text-end">
            <button className="btn btn-outline-secondary w-100" onClick={loadOrders}>
              <i className="bi bi-arrow-clockwise me-1" /> Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="dt-card">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h6 className="fw-bold mb-0">Shipment History ({filtered.length})</h6>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" />
            <div className="mt-2 text-muted small">Loading shipments...</div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-5">
            <div style={{ fontSize: '2.5rem' }}>📦</div>
            <h6 className="mt-2 text-muted">No shipments found</h6>
            <p className="text-muted small">
              {search || filterStatus !== 'ALL'
                ? 'Try adjusting your search or filter parameters.'
                : 'Create your first delivery request to start tracking shipments!'}
            </p>
            {!search && filterStatus === 'ALL' && (
              <Link to="/orders/new" className="btn btn-primary btn-sm mt-2">
                Create Shipment
              </Link>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table dt-table mb-0">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Route</th>
                  <th>Weight & Type</th>
                  <th>Payment</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th className="text-end">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(order => (
                  <tr key={order.id}>
                    <td>
                      <Link to={`/orders/${order.id}`} className="fw-bold text-decoration-none text-primary">
                        #{order.id}
                      </Link>
                    </td>
                    <td>
                      <div className="small">{new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</div>
                      <div className="text-muted" style={{ fontSize: '0.72rem' }}>
                        {new Date(order.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <div className="fw-semibold small">{order.pickup_zone_name} → {order.drop_zone_name}</div>
                      <div className="text-muted text-truncate" style={{ fontSize: '0.75rem', maxWidth: 220 }}>
                        {order.pickup_address} to {order.drop_address}
                      </div>
                    </td>
                    <td>
                      <div className="small">{order.actual_weight} kg</div>
                      <span className="badge bg-primary" style={{ fontSize: '0.65rem' }}>{order.order_type}</span>
                    </td>
                    <td>
                      <span className={`badge ${order.payment_type === 'COD' ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.68rem' }}>
                        {order.payment_type}
                      </span>
                    </td>
                    <td className="fw-bold text-primary">₹{order.charge_total}</td>
                    <td>
                      <span className={`status-badge status-${order.current_status.replace(/\s/g, '\\.')}`}>
                        {order.current_status}
                      </span>
                    </td>
                    <td className="text-end">
                      <div className="d-flex gap-1 justify-content-end">
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => navigate(`/orders/${order.id}`)}
                          title="View Details & Live Route Map"
                        >
                          <i className="bi bi-geo-alt me-1" /> Track
                        </button>
                        {order.current_status === 'Failed' && (
                          <button
                            className="btn btn-sm btn-warning"
                            onClick={() => navigate(`/orders/${order.id}/reschedule`)}
                            title="Reschedule Failed Shipment"
                          >
                            <i className="bi bi-calendar2" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
