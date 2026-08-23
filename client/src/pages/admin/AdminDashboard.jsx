import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { ordersApi, agentsApi, zonesApi } from '../../api';

// India center coordinates
const INDIA_CENTER = [20.5937, 78.9629];

// Zone centre coordinates (approximate Indian cities for demo)
const ZONE_COORDS = {
  'North Zone': [28.6139, 77.2090],
  'South Zone': [13.0827, 80.2707],
  'East Zone':  [22.5726, 88.3639],
  'West Zone':  [19.0760, 72.8777],
  'Central Zone':[23.2599, 77.4126],
};
const DEFAULT_COORDS = [20.5937, 78.9629];

const STATUS_COLOR = {
  Created:'#60a5fa', Assigned:'#4ade80', 'Picked Up':'#fb923c',
  'In Transit':'#facc15', 'Out for Delivery':'#c084fc',
  Delivered:'#34d399', Failed:'#f87171', Rescheduled:'#a78bfa',
};

function ControlTowerMap({ orders }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true }).setView(INDIA_CENTER, 5);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker) map.removeLayer(layer);
    });

    const activeOrders = orders.filter(o => !['Delivered','Failed'].includes(o.current_status));
    activeOrders.forEach(order => {
      const zoneKey = Object.keys(ZONE_COORDS).find(k =>
        order.pickup_zone_name?.includes(k.split(' ')[0]) ||
        order.drop_zone_name?.includes(k.split(' ')[0])
      );
      const coords = ZONE_COORDS[zoneKey] || [
        DEFAULT_COORDS[0] + (order.id % 5) * 1.5 - 3,
        DEFAULT_COORDS[1] + (order.id % 7) * 1.5 - 4,
      ];
      const color = STATUS_COLOR[order.current_status] || '#60a5fa';

      const marker = L.circleMarker(coords, {
        radius: 8, color, fillColor: color, fillOpacity: 0.85, weight: 2
      });

      marker.bindPopup(`
        <div style="min-width:150px; font-family:sans-serif;">
          <strong style="color:#0f172a;">Order #${order.id}</strong><br/>
          <span style="color:#475569; font-size:0.78rem;">${order.customer_name}</span><br/>
          <span style="color:${color}; font-size:0.75rem; font-weight:600;">${order.current_status}</span><br/>
          <span style="color:#64748b; font-size:0.72rem;">${order.pickup_zone_name || ''} → ${order.drop_zone_name || ''}</span>
        </div>
      `);
      marker.addTo(map);
    });
  }, [orders]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%', borderRadius: 6 }} />;
}

function ZoneHeatmap({ zones, orders }) {
  const maxOrders = Math.max(1, ...zones.map(z =>
    orders.filter(o => o.pickup_zone_name === z.name || o.drop_zone_name === z.name).length
  ));
  return (
    <div>
      <div className="heatmap-strip" style={{ height: 60, alignItems: 'flex-end' }}>
        {zones.slice(0, 8).map(z => {
          const count = orders.filter(o => o.pickup_zone_name === z.name || o.drop_zone_name === z.name).length;
          const pct = count / maxOrders;
          const h = Math.max(8, Math.round(pct * 52));
          const color = pct > 0.7 ? '#ef4444' : pct > 0.4 ? '#f59e0b' : '#22c55e';
          return (
            <div key={z.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div className="heatmap-bar" style={{ height: h, background: color, width: '100%', opacity: 0.85 }}>
                <div className="heatmap-tooltip">{z.name}: {count} orders</div>
              </div>
              <div className="heatmap-label" style={{ maxWidth: '100%' }}>{z.name.split(' ')[0]}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STATUSES = ['Created','Assigned','Picked Up','In Transit','Out for Delivery','Delivered','Failed','Rescheduled'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders]   = useState([]);
  const [agents, setAgents]   = useState([]);
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', zone: '', agent_id: '' });
  const [assigning, setAssigning]   = useState({});
  const [overriding, setOverriding] = useState({});
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const loadAll = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const params = {};
      if (filters.status)   params.status   = filters.status;
      if (filters.zone)     params.zone     = filters.zone;
      if (filters.agent_id) params.agent_id = filters.agent_id;
      const [od, ag, zn] = await Promise.all([
        ordersApi.list(params), agentsApi.list(), zonesApi.list(),
      ]);
      setOrders(od.orders); setAgents(ag); setZones(zn);
    } catch (e) { console.error(e); }
    finally { if (showLoading) setLoading(false); }
  };

  useEffect(() => {
    loadAll(true);
    const interval = setInterval(() => loadAll(false), 5000);
    return () => clearInterval(interval);
  }, []);
  const applyFilters = (e) => { e.preventDefault(); loadAll(true); };

  const autoAssign = async (orderId) => {
    setAssigning(a => ({ ...a, [orderId]: true }));
    try { await ordersApi.assign(orderId, { auto: true }); loadAll(); }
    catch (e) { alert(e.message); }
    finally { setAssigning(a => ({ ...a, [orderId]: false })); }
  };

  const manualAssign = async (orderId, agentId) => {
    setAssigning(a => ({ ...a, [orderId]: true }));
    try { await ordersApi.assign(orderId, { agent_id: agentId }); loadAll(); }
    catch (e) { alert(e.message); }
    finally { setAssigning(a => ({ ...a, [orderId]: false })); }
  };

  const overrideStatus = async (orderId, status) => {
    if (!status) return;
    setOverriding(o => ({ ...o, [orderId]: true }));
    try { await ordersApi.updateStatus(orderId, { status, note: 'Admin override' }); loadAll(); }
    catch (e) { alert(e.message); }
    finally { setOverriding(o => ({ ...o, [orderId]: false })); }
  };

  const stats = {
    total:      orders.length,
    active:     orders.filter(o => !['Delivered','Failed'].includes(o.current_status)).length,
    delivered:  orders.filter(o => o.current_status === 'Delivered').length,
    failed:     orders.filter(o => o.current_status === 'Failed').length,
    unassigned: orders.filter(o => !o.assigned_agent_id && o.current_status === 'Created').length,
  };

  // Alerts
  const alerts = [
    ...orders.filter(o => o.current_status === 'Failed').map(o => ({
      type: 'danger', icon: 'bi-x-octagon', title: `Order #${o.id} Failed`,
      sub: `${o.customer_name} — ${o.drop_zone_name}`,
    })),
    ...orders.filter(o => !o.assigned_agent_id && o.current_status === 'Created').map(o => ({
      type: 'warning', icon: 'bi-exclamation-triangle', title: `Order #${o.id} Unassigned`,
      sub: `Awaiting agent — ${o.pickup_zone_name} → ${o.drop_zone_name}`,
    })),
    ...orders.filter(o => o.current_status === 'Rescheduled').map(o => ({
      type: 'info', icon: 'bi-calendar2-check', title: `Order #${o.id} Rescheduled`,
      sub: `${o.customer_name} requested new delivery time`,
    })),
  ].slice(0, 6);

  return (
    <div className="fade-in-up">
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize:'1.2rem', fontWeight:700, color:'var(--dt-text)', margin:0 }}>
            <span className="live-dot" />Control Tower
          </h1>
          <p style={{ color:'var(--dt-text-2)', fontSize:'0.78rem', margin:'2px 0 0' }}>
            Admin Dashboard — All orders, agents, and zones
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={loadAll} style={{ fontSize:'0.78rem' }}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {/* Stat Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {[
          { icon:'bi-box-seam',          label:'Total Orders', value: stats.total,      color:'#60a5fa' },
          { icon:'bi-truck',             label:'Active',       value: stats.active,     color:'#0ea5e9' },
          { icon:'bi-check-circle',      label:'Delivered',    value: stats.delivered,  color:'#34d399' },
          { icon:'bi-x-circle',          label:'Failed',       value: stats.failed,     color:'#f87171' },
          { icon:'bi-exclamation-circle',label:'Unassigned',   value: stats.unassigned, color:'#facc15' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div className="stat-value" style={{ color: s.color, fontSize:'1.6rem' }}>{s.value}</div>
                <div className="stat-label">{s.label}</div>
              </div>
              <div className="stat-icon" style={{ background: s.color+'18', color: s.color }}>
                <i className={`bi ${s.icon}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Operational Overview + Alerts row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:16, marginBottom:20 }}>
        {/* Zone Load & Active Telematics Overview */}
        <div className="dt-card" style={{ display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
          <div style={{ paddingBottom: 12, borderBottom:'1px solid var(--dt-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontWeight:600, fontSize:'0.83rem' }}>
              <i className="bi bi-bar-chart-line me-2 text-primary" />Zone Capacity & Volume Load
            </span>
            <span style={{ fontSize:'0.72rem', color:'var(--dt-text-2)' }}>
              {orders.filter(o => !['Delivered','Failed'].includes(o.current_status)).length} Active Orders In Flight
            </span>
          </div>
          <div style={{ padding:'20px 0' }}>
            <ZoneHeatmap zones={zones} orders={orders} />
          </div>
          <div style={{ paddingTop:12, borderTop:'1px solid var(--dt-border)', display:'flex', gap:24, fontSize:'0.75rem', color:'var(--dt-text-2)' }}>
            <div><span style={{ fontWeight:700, color:'var(--dt-text)' }}>{zones.length}</span> Active Logistics Hubs</div>
            <div><span style={{ fontWeight:700, color:'#34d399' }}>{agents.filter(a => a.is_available).length}</span> Agents Available</div>
            <div><span style={{ fontWeight:700, color:'#60a5fa' }}>{orders.filter(o => o.current_status === 'In Transit').length}</span> In Transit</div>
          </div>
        </div>

        {/* ALERTS */}
        <div className="dt-card" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ fontWeight:600, fontSize:'0.83rem', marginBottom:14, display:'flex', justifyContent:'space-between' }}>
            <span><i className="bi bi-shield-exclamation me-2" style={{ color:'#f87171' }} />Control Tower Alerts</span>
            <span style={{ background:'rgba(239,68,68,0.15)', color:'#f87171', fontSize:'0.68rem', padding:'2px 7px', borderRadius:10, fontWeight:700 }}>
              {alerts.length}
            </span>
          </div>
          {alerts.length === 0 ? (
            <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', color:'var(--dt-text-2)', fontSize:'0.8rem' }}>
              <div style={{ textAlign:'center' }}>
                <i className="bi bi-check-circle" style={{ fontSize:'1.5rem', color:'#34d399', display:'block', marginBottom:8 }} />
                All systems nominal
              </div>
            </div>
          ) : (
            <div className="alert-panel" style={{ flex:1, overflowY:'auto' }}>
              {alerts.map((a, i) => (
                <div key={i} className={`alert-item ${a.type}`}>
                  <i className={`bi ${a.icon} alert-item-icon`}
                    style={{ color: a.type==='danger'?'#f87171':a.type==='warning'?'#facc15':'#60a5fa' }} />
                  <div>
                    <div className="alert-item-title">{a.title}</div>
                    <div className="alert-item-sub">{a.sub}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          {/* Agent status */}
          <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid var(--dt-border)' }}>
            <div style={{ fontSize:'0.72rem', color:'var(--dt-text-2)', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.8px', fontWeight:600 }}>
              Agent Status
            </div>
            {agents.slice(0, 4).map(a => (
              <div key={a.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'5px 0', fontSize:'0.78rem' }}>
                <span style={{ color:'var(--dt-text)' }}>{a.name}</span>
                <span style={{
                  background: a.is_available ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                  color: a.is_available ? '#4ade80' : '#f87171',
                  fontSize:'0.65rem', fontWeight:700, padding:'2px 7px', borderRadius:10
                }}>{a.is_available ? 'Available' : 'Busy'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="dt-card" style={{ marginBottom:16 }}>
        <form onSubmit={applyFilters} style={{ display:'flex', gap:10, alignItems:'flex-end', flexWrap:'wrap' }}>
          <div style={{ flex:1, minWidth:120 }}>
            <label style={{ fontSize:'0.72rem', color:'var(--dt-text-2)', display:'block', marginBottom:4 }}>STATUS</label>
            <select className="form-select form-select-sm" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">All Statuses</option>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minWidth:120 }}>
            <label style={{ fontSize:'0.72rem', color:'var(--dt-text-2)', display:'block', marginBottom:4 }}>ZONE</label>
            <select className="form-select form-select-sm" value={filters.zone}
              onChange={e => setFilters(f => ({ ...f, zone: e.target.value }))}>
              <option value="">All Zones</option>
              {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
            </select>
          </div>
          <div style={{ flex:1, minWidth:120 }}>
            <label style={{ fontSize:'0.72rem', color:'var(--dt-text-2)', display:'block', marginBottom:4 }}>AGENT</label>
            <select className="form-select form-select-sm" value={filters.agent_id}
              onChange={e => setFilters(f => ({ ...f, agent_id: e.target.value }))}>
              <option value="">All Agents</option>
              {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button type="submit" className="btn btn-primary btn-sm" style={{ fontSize:'0.78rem', padding:'6px 14px' }}>
              <i className="bi bi-funnel me-1" />Filter
            </button>
            <button type="button" className="btn btn-outline-secondary btn-sm" style={{ fontSize:'0.78rem' }}
              onClick={() => { setFilters({ status:'',zone:'',agent_id:'' }); setTimeout(loadAll, 50); }}>
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* Orders Table */}
      <div className="table-dark-wrap">
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--dt-border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontWeight:600, fontSize:'0.83rem' }}>Orders ({orders.length})</span>
        </div>
        {loading ? (
          <div style={{ textAlign:'center', padding:'32px 0' }}><div className="spinner-border text-primary" /></div>
        ) : orders.length === 0 ? (
          <div style={{ textAlign:'center', padding:'32px 0', color:'var(--dt-text-2)', fontSize:'0.85rem' }}>
            <i className="bi bi-inbox" style={{ fontSize:'1.5rem', display:'block', marginBottom:8 }} />
            No orders found matching the filters.
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="table dt-table mb-0">
              <thead><tr>
                <th>Order</th><th>Customer</th><th>Route</th>
                <th>Type</th><th>Total</th><th>Status</th>
                <th>Agent</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {orders.map(order => (
                  <tr key={order.id}>
                    <td>
                      <span style={{ fontWeight:700, color:'var(--dt-text)', fontSize:'0.8rem' }}>#{order.id}</span>
                      <div style={{ fontSize:'0.68rem', color:'var(--dt-text-2)' }}>
                        {new Date(order.created_at).toLocaleDateString('en-IN')}
                      </div>
                    </td>
                    <td style={{ cursor: 'pointer' }} onClick={() => setSelectedCustomer({ id: order.customer_id, name: order.customer_name, email: order.customer_email })}>
                      <div style={{ fontWeight:600, fontSize:'0.83rem', color: '#60a5fa' }} className="d-flex align-items-center gap-1">
                        <span>{order.customer_name}</span>
                        <i className="bi bi-info-circle text-muted" style={{ fontSize: '0.75rem' }} />
                      </div>
                      <div style={{ fontSize:'0.68rem', color:'var(--dt-text-2)' }}>{order.customer_email}</div>
                    </td>
                    <td>
                      <div style={{ fontSize:'0.78rem' }}>{order.pickup_zone_name}</div>
                      <div style={{ fontSize:'0.7rem', color:'var(--dt-text-2)' }}>→ {order.drop_zone_name}</div>
                    </td>
                    <td><span className="badge bg-primary">{order.order_type}</span></td>
                    <td style={{ fontWeight:700, color:'#60a5fa', fontSize:'0.83rem' }}>₹{order.charge_total}</td>
                    <td>
                      <span className={`status-badge status-${order.current_status.replace(/\s/g,'\\.')}`}>
                        {order.current_status}
                      </span>
                    </td>
                    <td>
                      {order.agent_name ? (
                        <span style={{ fontSize:'0.78rem', color:'var(--dt-text)' }}>{order.agent_name}</span>
                      ) : (
                        <div style={{ display:'flex', gap:4 }}>
                          <button className="btn btn-success btn-sm" style={{ fontSize:'0.7rem', padding:'3px 8px' }}
                            disabled={assigning[order.id]}
                            onClick={() => autoAssign(order.id)}>
                            {assigning[order.id] ? '...' : 'Auto'}
                          </button>
                          <select className="form-select form-select-sm" style={{ fontSize:'0.7rem', width:90 }}
                            defaultValue=""
                            onChange={e => { if (e.target.value) manualAssign(order.id, e.target.value); }}>
                            <option value="">Pick...</option>
                            {agents.filter(a => a.is_available).map(a => (
                              <option key={a.id} value={a.id}>{a.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:4 }}>
                        <button className="btn btn-sm btn-outline-secondary" style={{ fontSize:'0.7rem', padding:'3px 7px' }}
                          onClick={() => navigate(`/orders/${order.id}`)}>
                          <i className="bi bi-eye" />
                        </button>
                        <select className="form-select form-select-sm" style={{ fontSize:'0.7rem', width:105 }}
                          defaultValue="" disabled={overriding[order.id]}
                          onChange={e => { if (e.target.value) overrideStatus(order.id, e.target.value); }}>
                          <option value="">Override...</option>
                          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Customer Details Modal Pop-out */}
      {selectedCustomer && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1050,
          padding: 20
        }}>
          <div className="dt-card fade-in-up" style={{
            maxWidth: 720, width: '100%', maxHeight: '90vh', overflowY: 'auto',
            border: '1px solid var(--dt-border)', background: 'var(--dt-surface-1)'
          }}>
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center mb-3 pb-2" style={{ borderBottom: '1px solid var(--dt-border)' }}>
              <div className="d-flex align-items-center gap-3">
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', background: 'var(--dt-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
                  fontWeight: 700, fontSize: '1.2rem'
                }}>
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h5 className="fw-bold mb-0 text-light">{selectedCustomer.name}</h5>
                  <div className="text-muted small">{selectedCustomer.email} · Customer #{selectedCustomer.id}</div>
                </div>
              </div>
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedCustomer(null)}>✕ Close</button>
            </div>

            {/* Customer Metrics */}
            {(() => {
              const custOrders = orders.filter(o => o.customer_id === selectedCustomer.id || o.customer_email === selectedCustomer.email);
              const activeCount = custOrders.filter(o => !['Delivered', 'Failed'].includes(o.current_status)).length;
              const totalSpent = custOrders.reduce((sum, o) => sum + parseFloat(o.charge_total || 0), 0);

              return (
                <div>
                  <div className="row g-2 mb-4">
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: 'var(--dt-surface-2)', border: '1px solid var(--dt-border)' }}>
                        <div className="text-muted small">Total Orders</div>
                        <div className="fw-bold fs-5 text-light">{custOrders.length}</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: 'var(--dt-surface-2)', border: '1px solid var(--dt-border)' }}>
                        <div className="text-muted small">Active Shipments</div>
                        <div className="fw-bold fs-5 text-primary">{activeCount}</div>
                      </div>
                    </div>
                    <div className="col-4">
                      <div className="p-3 rounded" style={{ background: 'var(--dt-surface-2)', border: '1px solid var(--dt-border)' }}>
                        <div className="text-muted small">Total Spent</div>
                        <div className="fw-bold fs-5 text-success">₹{totalSpent.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>

                  <h6 className="fw-bold mb-3 text-light"><i className="bi bi-box-seam me-2 text-primary" />Customer Orders & Assigned Agents</h6>
                  {custOrders.length === 0 ? (
                    <div className="text-center py-4 text-muted small">No orders recorded for this customer yet.</div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table dt-table mb-0" style={{ fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th>Order #</th>
                            <th>Route</th>
                            <th>Status</th>
                            <th>Assigned Agent</th>
                            <th>Amount</th>
                            <th className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {custOrders.map(o => (
                            <tr key={o.id}>
                              <td className="fw-bold text-primary">#{o.id}</td>
                              <td>{o.pickup_zone_name} → {o.drop_zone_name}</td>
                              <td>
                                <span className={`status-badge status-${o.current_status.replace(/\s/g, '\\.')}`}>
                                  {o.current_status}
                                </span>
                              </td>
                              <td>
                                {o.agent_name ? (
                                  <div>
                                    <div className="fw-semibold text-light">{o.agent_name}</div>
                                  </div>
                                ) : (
                                  <span className="text-warning small">Unassigned</span>
                                )}
                              </td>
                              <td className="fw-bold text-success">₹{o.charge_total}</td>
                              <td className="text-end">
                                <button
                                  className="btn btn-sm btn-outline-primary"
                                  onClick={() => {
                                    setSelectedCustomer(null);
                                    navigate(`/orders/${o.id}`);
                                  }}
                                >
                                  <i className="bi bi-geo-alt me-1" /> Track
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
