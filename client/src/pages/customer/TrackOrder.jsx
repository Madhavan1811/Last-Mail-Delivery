import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import L from 'leaflet';
import { ordersApi } from '../../api';
import StatusTimeline from '../../components/StatusTimeline';
import ChargeBreakdown from '../../components/ChargeBreakdown';
import { useAuth } from '../../contexts/AuthContext';

// Approximate city centers for zones
const ZONE_COORDS = {
  'North': [28.6139, 77.2090], 'South': [13.0827, 80.2707],
  'East':  [22.5726, 88.3639], 'West':  [19.0760, 72.8777],
  'Central':[23.2599, 77.4126],
};
function getZoneCoords(zoneName) {
  if (!zoneName) return [20.5937, 78.9629];
  const key = Object.keys(ZONE_COORDS).find(k => zoneName.includes(k));
  return key ? ZONE_COORDS[key] : [20.5937, 78.9629];
}

function OrderZoneMap({ pickupZone, dropZone }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const pCoords = getZoneCoords(pickupZone);
    const dCoords = getZoneCoords(dropZone);

    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(pCoords, 5);
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);
      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;
    map.eachLayer((layer) => {
      if (layer instanceof L.CircleMarker || layer instanceof L.Polyline) {
        map.removeLayer(layer);
      }
    });

    // Draw route polyline outline (e.g. Chennai → Hyderabad)
    L.polyline([pCoords, dCoords], {
      color: '#00f2fe',
      weight: 4,
      opacity: 0.4,
    }).addTo(map);

    L.polyline([pCoords, dCoords], {
      color: '#38ef7d',
      weight: 2,
      opacity: 0.9,
      dashArray: '6, 6',
    }).addTo(map);

    // Markers
    const pMarker = L.circleMarker(pCoords, {
      radius: 9, color: '#00f2fe', fillColor: '#00f2fe', fillOpacity: 0.9, weight: 2
    }).bindPopup(`<strong style="color:#0f172a">Pickup Zone</strong><br/><span style="color:#64748b;font-size:0.78rem">${pickupZone || ''}</span>`);

    const dMarker = L.circleMarker(dCoords, {
      radius: 9, color: '#38ef7d', fillColor: '#38ef7d', fillOpacity: 0.9, weight: 2
    }).bindPopup(`<strong style="color:#0f172a">Delivery Zone</strong><br/><span style="color:#64748b;font-size:0.78rem">${dropZone || ''}</span>`);

    pMarker.addTo(map);
    dMarker.addTo(map);

    // Fit map bounds to show full route line
    const bounds = L.latLngBounds([pCoords, dCoords]);
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [pickupZone, dropZone]);

  return <div ref={mapRef} style={{ height: '100%', width: '100%' }} />;
}

const STATUS_STEPS = ['Created','Assigned','Picked Up','In Transit','Out for Delivery','Delivered'];

function StatusProgress({ current }) {
  const idx = STATUS_STEPS.indexOf(current);
  const isFailed = current === 'Failed' || current === 'Rescheduled';
  return (
    <div className="mb-4">
      <div className="d-flex justify-content-between mb-2">
        {STATUS_STEPS.map((s, i) => {
          const done = !isFailed && i <= idx;
          const active = !isFailed && i === idx;
          return (
            <div key={s} className="text-center flex-fill" style={{fontSize:'0.65rem'}}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%', margin: '0 auto 4px',
                background: done ? (active ? 'var(--dt-primary)' : 'var(--dt-success)') : 'var(--dt-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: done ? 'white' : 'var(--dt-muted)',
                fontWeight: 700, fontSize: '0.75rem',
                boxShadow: active ? '0 0 0 3px rgba(37,99,235,0.25)' : 'none',
                transition: 'all 0.3s',
              }}>
                {done && !active ? <i className="bi bi-check" style={{fontSize:'0.8rem'}} /> : i+1}
              </div>
              <span style={{color: done ? 'var(--dt-text)' : 'var(--dt-muted)', fontWeight: done ? 600 : 400}}>
                {s}
              </span>
            </div>
          );
        })}
      </div>
      {!isFailed && idx > 0 && (
        <div style={{height: 4, background: 'var(--dt-border)', borderRadius: 2, overflow: 'hidden'}}>
          <div style={{
            height: '100%',
            width: `${(idx / (STATUS_STEPS.length - 1)) * 100}%`,
            background: 'var(--dt-gradient)',
            transition: 'width 0.5s ease',
          }} />
        </div>
      )}
    </div>
  );
}

export default function TrackOrder() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('timeline');

  useEffect(() => {
    const fetchDetail = (showLoading = false) => {
      if (showLoading) setLoading(true);
      ordersApi.get(id)
        .then(setData)
        .catch(e => setError(e.message))
        .finally(() => { if (showLoading) setLoading(false); });
    };

    fetchDetail(true);
    const interval = setInterval(() => fetchDetail(false), 5000);
    return () => clearInterval(interval);
  }, [id]);

  if (loading) return <div className="d-flex justify-content-center py-5"><div className="spinner-border text-primary" /></div>;
  if (error)   return <div className="alert alert-danger">{error}</div>;
  if (!data)   return null;

  const { order, timeline, reschedules } = data;
  const current = order.current_status;

  return (
    <div className="fade-in-up">
      <div className="mb-3">
        <Link to="/orders" className="text-decoration-none text-muted small">
          <i className="bi bi-arrow-left me-1" /> Back to My Shipments
        </Link>
      </div>

      <div className="page-header">
        <div>
          <h1 className="page-title">Order #{order.id}</h1>
          <p className="page-subtitle">Created {new Date(order.created_at).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'})}</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          <span className={`status-badge status-${current.replace(/\s/g,'\\.')}`}
            style={{fontSize:'0.85rem',padding:'8px 16px'}}>
            {current === 'Delivered' && '✅ '}{current === 'Failed' && '❌ '}{current}
          </span>
          {current === 'Failed' && user?.role === 'customer' && (
            <Link to={`/orders/${id}/reschedule`} className="btn btn-warning btn-sm">
              <i className="bi bi-calendar2 me-1" />Reschedule
            </Link>
          )}
        </div>
      </div>

      <StatusProgress current={current} />

      <div className="dt-card mb-4" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--dt-border)', fontSize:'0.8rem', fontWeight:600 }}>
          <i className="bi bi-geo-alt me-2 text-primary" />Delivery Zone Map
          <span style={{ float:'right', color:'var(--dt-text-2)', fontWeight:400, fontSize:'0.72rem' }}>
            {order.pickup_zone_name} → {order.drop_zone_name}
          </span>
        </div>
        <div style={{ height: 220 }}>
          <OrderZoneMap pickupZone={order.pickup_zone_name} dropZone={order.drop_zone_name} />
        </div>
        <div style={{ padding:'8px 16px', background:'var(--dt-surface-2)', display:'flex', gap:16, fontSize:'0.72rem' }}>
          <span><span style={{color:'#60a5fa',fontWeight:700}}>●</span> Pickup: {order.pickup_zone_name}</span>
          <span><span style={{color:'#34d399',fontWeight:700}}>●</span> Delivery: {order.drop_zone_name}</span>
        </div>
      </div>

      <div className="row g-4">
        {/* Info cards */}
        <div className="col-md-4">
          <div className="dt-card mb-4">
            <h6 className="fw-bold mb-3"><i className="bi bi-truck me-2 text-primary" />Shipment</h6>
            <div className="small text-muted mb-1">Pickup</div>
            <div className="fw-semibold mb-2">{order.pickup_address}</div>
            <div className="small text-muted mb-1">Drop</div>
            <div className="fw-semibold mb-2">{order.drop_address}</div>
            <hr className="my-2" />
            <div className="d-flex justify-content-between small">
              <span className="text-muted">Route</span>
              <span className="fw-semibold">{order.pickup_zone_name} → {order.drop_zone_name}</span>
            </div>
            <div className="d-flex justify-content-between small mt-1">
              <span className="text-muted">Type</span>
              <span className="badge bg-primary">{order.order_type}</span>
            </div>
            <div className="d-flex justify-content-between small mt-1">
              <span className="text-muted">Payment</span>
              <span className={`badge ${order.payment_type === 'COD' ? 'bg-warning text-dark' : 'bg-success'}`}>{order.payment_type}</span>
            </div>
          </div>

          {order.agent_name && (
            <div className="dt-card">
              <h6 className="fw-bold mb-3"><i className="bi bi-person-badge me-2 text-success" />Agent</h6>
              <div className="fw-semibold">{order.agent_name}</div>
              <div className="small text-muted">{order.agent_phone}</div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="col-md-8">
          <div className="dt-card">
            <ul className="nav nav-tabs mb-4">
              <li className="nav-item">
                <button className={`nav-link ${tab === 'timeline' ? 'active' : ''}`} onClick={() => setTab('timeline')}>
                  <i className="bi bi-clock-history me-1" />Timeline
                </button>
              </li>
              <li className="nav-item">
                <button className={`nav-link ${tab === 'charge' ? 'active' : ''}`} onClick={() => setTab('charge')}>
                  <i className="bi bi-calculator me-1" />Charges
                </button>
              </li>
              {reschedules.length > 0 && (
                <li className="nav-item">
                  <button className={`nav-link ${tab === 'reschedule' ? 'active' : ''}`} onClick={() => setTab('reschedule')}>
                    <i className="bi bi-calendar2 me-1" />Reschedules
                  </button>
                </li>
              )}
            </ul>

            {tab === 'timeline' && <StatusTimeline timeline={timeline} />}
            {tab === 'charge' && (
              <ChargeBreakdown
                breakdown={order.charge_breakdown}
                pickupZone={{ name: order.pickup_zone_name }}
                dropZone={{ name: order.drop_zone_name }}
              />
            )}
            {tab === 'reschedule' && (
              <div>
                {reschedules.map(r => (
                  <div key={r.id} className="d-flex justify-content-between align-items-center p-3 rounded mb-2"
                    style={{background:'var(--dt-surface-2)',border:'1px solid var(--dt-border)',color:'var(--dt-text)'}}>
                    <span>Requested date: <strong>{r.requested_date}</strong></span>
                    <span className="text-muted small">{new Date(r.created_at).toLocaleDateString('en-IN')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
