import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { ordersApi } from '../../api';
import ChargeBreakdown from '../../components/ChargeBreakdown';
import { useAuth } from '../../contexts/AuthContext';

const ZONE_COORDS = {
  'North': [28.6139, 77.2090], 'South': [13.0827, 80.2707],
  'East':  [22.5726, 88.3639], 'West':  [19.0760, 72.8777],
  'Central':[23.2599, 77.4126],
};
function getZoneCoords(zoneObj) {
  if (!zoneObj) return [20.5937, 78.9629];
  const name = typeof zoneObj === 'string' ? zoneObj : (zoneObj.name || zoneObj.code || '');
  const key = Object.keys(ZONE_COORDS).find(k => name.includes(k));
  return key ? ZONE_COORDS[key] : [20.5937, 78.9629];
}

function OrderRouteMap({ pickupZone, dropZone }) {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const pCoords = getZoneCoords(pickupZone);
    const dCoords = getZoneCoords(dropZone);

    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(pCoords, 5);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 18, subdomains: 'abcd' }).addTo(map);

    L.polyline([pCoords, dCoords], { color: '#00f2fe', weight: 4, opacity: 0.4 }).addTo(map);
    L.polyline([pCoords, dCoords], { color: '#38ef7d', weight: 2, opacity: 0.9, dashArray: '6, 6' }).addTo(map);

    L.circleMarker(pCoords, { radius: 8, color: '#00f2fe', fillColor: '#00f2fe', fillOpacity: 0.9, weight: 2 }).addTo(map);
    L.circleMarker(dCoords, { radius: 8, color: '#38ef7d', fillColor: '#38ef7d', fillOpacity: 0.9, weight: 2 }).addTo(map);

    const bounds = L.latLngBounds([pCoords, dCoords]);
    map.fitBounds(bounds, { padding: [30, 30] });

    return () => {
      map.remove();
    };
  }, [pickupZone, dropZone]);

  return <div ref={mapRef} style={{ height: 180, width: '100%', borderRadius: 8, border: '1px solid var(--dt-border)' }} />;
}

const INITIAL = {
  pickup_address: '', pickup_pincode: '',
  drop_address: '', drop_pincode: '',
  length: '', breadth: '', height: '', actual_weight: '',
  order_type: 'B2C', payment_type: 'Prepaid',
};

export default function CreateOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [step, setStep] = useState(1); // 1=form, 2=preview, 3=success
  const [preview, setPreview] = useState(null);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handlePreview = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const data = await ordersApi.preview(form);
      setPreview(data);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setLoading(true); setError('');
    try {
      const data = await ordersApi.create(form);
      setOrder(data.order);
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 3 && order) {
    return (
      <div className="fade-in-up">
        <div className="page-header">
          <div>
            <h1 className="page-title">Order Created! 🎉</h1>
            <p className="page-subtitle">Your shipment is being processed</p>
          </div>
        </div>
        <div className="dt-card text-center py-5">
          <div style={{fontSize:'4rem'}}>📦</div>
          <h3 className="fw-bold mt-3">Order #{order.id}</h3>
          <span className="status-badge status-Created mt-2 d-inline-block">Created</span>
          <p className="text-muted mt-3">Total: <strong className="text-primary fs-5">₹{order.charge_total}</strong></p>
          <div className="d-flex gap-3 justify-content-center mt-4">
            <button className="btn btn-primary" onClick={() => navigate(`/orders/${order.id}`)}>
              <i className="bi bi-search me-2" />Track Order
            </button>
            <button className="btn btn-outline-secondary" onClick={() => { setStep(1); setForm(INITIAL); setPreview(null); }}>
              <i className="bi bi-plus me-2" />New Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Create Order</h1>
          <p className="page-subtitle">Enter shipment details to get a charge quote</p>
        </div>
        <div className="d-flex gap-2 align-items-center">
          {[1,2].map(s => (
            <div key={s} className="d-flex align-items-center gap-1">
              <div style={{
                width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem',
                background: step >= s ? 'var(--dt-primary)' : 'var(--dt-border)',
                color: step >= s ? 'white' : 'var(--dt-muted)',
              }}>{s}</div>
              {s < 2 && <div style={{width: 32, height: 2, background: step > s ? 'var(--dt-primary)' : 'var(--dt-border)'}} />}
            </div>
          ))}
          <span className="text-muted ms-2" style={{fontSize:'0.8rem'}}>{step === 1 ? 'Details' : 'Review'}</span>
        </div>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {step === 1 && (
        <form onSubmit={handlePreview}>
          <div className="row g-4">
            {/* Pickup */}
            <div className="col-md-6">
              <div className="dt-card h-100">
                <h6 className="fw-bold mb-3"><i className="bi bi-geo-alt-fill text-primary me-2" />Pickup Details</h6>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Pickup Address</label>
                  <textarea id="pickup-address" className="form-control" rows={2} placeholder="Full pickup address"
                    value={form.pickup_address} onChange={set('pickup_address')} required />
                </div>
                <div>
                  <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Pickup Pincode</label>
                  <input id="pickup-pincode" className="form-control" placeholder="e.g. 110001"
                    value={form.pickup_pincode} onChange={set('pickup_pincode')} required />
                </div>
              </div>
            </div>
            {/* Drop */}
            <div className="col-md-6">
              <div className="dt-card h-100">
                <h6 className="fw-bold mb-3"><i className="bi bi-geo-fill text-danger me-2" />Delivery Details</h6>
                <div className="mb-3">
                  <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Drop Address</label>
                  <textarea id="drop-address" className="form-control" rows={2} placeholder="Full delivery address"
                    value={form.drop_address} onChange={set('drop_address')} required />
                </div>
                <div>
                  <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Drop Pincode</label>
                  <input id="drop-pincode" className="form-control" placeholder="e.g. 600001"
                    value={form.drop_pincode} onChange={set('drop_pincode')} required />
                </div>
              </div>
            </div>
            {/* Package */}
            <div className="col-12">
              <div className="dt-card">
                <h6 className="fw-bold mb-3"><i className="bi bi-box-seam text-success me-2" />Package Details</h6>
                <div className="row g-3">
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Length (cm)</label>
                    <input id="pkg-length" type="number" min="0.1" step="0.1" className="form-control"
                      placeholder="L" value={form.length} onChange={set('length')} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Breadth (cm)</label>
                    <input id="pkg-breadth" type="number" min="0.1" step="0.1" className="form-control"
                      placeholder="B" value={form.breadth} onChange={set('breadth')} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Height (cm)</label>
                    <input id="pkg-height" type="number" min="0.1" step="0.1" className="form-control"
                      placeholder="H" value={form.height} onChange={set('height')} required />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Actual Weight (kg)</label>
                    <input id="pkg-weight" type="number" min="0.1" step="0.01" className="form-control"
                      placeholder="kg" value={form.actual_weight} onChange={set('actual_weight')} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Order Type</label>
                    <select id="order-type" className="form-select" value={form.order_type} onChange={set('order_type')}>
                      <option value="B2C">B2C (Business to Customer)</option>
                      <option value="B2B">B2B (Business to Business)</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label fw-semibold" style={{fontSize:'0.85rem'}}>Payment Type</label>
                    <select id="payment-type" className="form-select" value={form.payment_type} onChange={set('payment_type')}>
                      <option value="Prepaid">Prepaid</option>
                      <option value="COD">Cash on Delivery (COD)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4">
            <button id="preview-btn" type="submit" className="btn btn-primary px-4 py-2" disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-calculator me-2" />}
              Calculate Charges
            </button>
          </div>
        </form>
      )}

      {step === 2 && preview && (
        <div className="row g-4">
          <div className="col-md-6">
            <ChargeBreakdown breakdown={preview.breakdown} pickupZone={preview.pickupZone} dropZone={preview.dropZone} />
          </div>
          <div className="col-md-6">
            <div className="dt-card mb-3">
              <h6 className="fw-bold mb-2"><i className="bi bi-map me-2 text-info" />Estimated Shipping Route</h6>
              <OrderRouteMap pickupZone={preview.pickupZone} dropZone={preview.dropZone} />
            </div>
            <div className="dt-card">
              <h6 className="fw-bold mb-3">Order Summary</h6>
              <table className="table table-sm mb-0">
                <tbody>
                  <tr><td className="text-muted">Pickup</td><td>{form.pickup_address} ({form.pickup_pincode})</td></tr>
                  <tr><td className="text-muted">Drop</td><td>{form.drop_address} ({form.drop_pincode})</td></tr>
                  <tr><td className="text-muted">Dimensions</td><td>{form.length}×{form.breadth}×{form.height} cm</td></tr>
                  <tr><td className="text-muted">Actual Weight</td><td>{form.actual_weight} kg</td></tr>
                  <tr><td className="text-muted">Order Type</td><td>{form.order_type}</td></tr>
                  <tr><td className="text-muted">Payment</td><td>{form.payment_type}</td></tr>
                </tbody>
              </table>
            </div>
          </div>
          <div className="col-12 d-flex gap-3">
            <button className="btn btn-outline-secondary" onClick={() => setStep(1)}>
              <i className="bi bi-arrow-left me-2" />Edit Details
            </button>
            <button id="confirm-order-btn" className="btn btn-primary px-4" onClick={handleConfirm} disabled={loading}>
              {loading ? <span className="spinner-border spinner-border-sm me-2" /> : <i className="bi bi-check2-circle me-2" />}
              Confirm & Place Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
