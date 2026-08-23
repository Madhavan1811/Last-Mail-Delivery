import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import L from 'leaflet';

const CITIES = {
  Delhi:     [28.6139, 77.2090],
  Mumbai:    [19.0760, 72.8777],
  Hyderabad: [17.3850, 78.4867],
  Bengaluru: [12.9716, 77.5946],
  Chennai:   [13.0827, 80.2707],
  Kolkata:   [22.5726, 88.3639],
  Ahmedabad: [23.0225, 72.5714],
  Bhopal:    [23.2599, 77.4126],
  Guwahati:  [26.1445, 91.7362],
};

const ROUTES = [
  ['Chennai', 'Hyderabad'],
  ['Hyderabad', 'Bengaluru'],
  ['Bengaluru', 'Chennai'],
  ['Mumbai', 'Hyderabad'],
  ['Mumbai', 'Ahmedabad'],
  ['Ahmedabad', 'Delhi'],
  ['Delhi', 'Bhopal'],
  ['Bhopal', 'Hyderabad'],
  ['Delhi', 'Kolkata'],
  ['Kolkata', 'Hyderabad'],
  ['Kolkata', 'Guwahati'],
  ['Mumbai', 'Bengaluru'],
  ['Delhi', 'Hyderabad'],
];

function PublicNetworkMap() {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;
    if (!mapInstanceRef.current) {
      const map = L.map(mapRef.current, { zoomControl: true, attributionControl: false })
        .setView([21.5, 78.9], 5);

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      mapInstanceRef.current = map;

      // Draw Glowing Polyline Routes
      ROUTES.forEach(([from, to]) => {
        const coords = [CITIES[from], CITIES[to]];
        
        // Outer glow line
        L.polyline(coords, {
          color: '#00f2fe',
          weight: 4,
          opacity: 0.35,
          lineCap: 'round',
        }).addTo(map);

        // Inner bright line
        L.polyline(coords, {
          color: '#38ef7d',
          weight: 2,
          opacity: 0.9,
          dashArray: '8, 6',
          lineCap: 'round',
        }).addTo(map);
      });

      // Draw City Nodes
      Object.entries(CITIES).forEach(([name, coords]) => {
        // Outer glow circle
        L.circleMarker(coords, {
          radius: 9,
          color: '#00f2fe',
          fillColor: '#00f2fe',
          fillOpacity: 0.3,
          weight: 1,
        }).addTo(map);

        // Core bright circle
        const marker = L.circleMarker(coords, {
          radius: 5,
          color: '#ffffff',
          fillColor: '#38ef7d',
          fillOpacity: 1,
          weight: 2,
        }).addTo(map);

        marker.bindTooltip(
          `<strong style="color:#00f2fe; font-family:sans-serif; font-size:12px;">${name}</strong>`,
          { permanent: true, direction: 'top', className: 'map-city-tooltip', offset: [0, -6] }
        );
      });
    }
  }, []);

  return (
    <div style={{
      position: 'relative',
      borderRadius: 16,
      overflow: 'hidden',
      border: '1px solid rgba(0, 242, 254, 0.25)',
      boxShadow: '0 12px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 242, 254, 0.15)',
      background: '#0a0e17'
    }}>
      {/* Map Top Bar */}
      <div style={{
        padding: '12px 20px',
        background: 'rgba(13, 17, 23, 0.95)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 1000,
        position: 'relative'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%', background: '#38ef7d',
            boxShadow: '0 0 10px #38ef7d', display: 'inline-block'
          }} />
          <span style={{ color: '#e6edf3', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            Real-Time Tracking Map
          </span>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>Coverage: Nationwide Intercity Mesh</span>
          <span style={{
            background: 'rgba(0, 242, 254, 0.15)', color: '#00f2fe', border: '1px solid rgba(0, 242, 254, 0.3)',
            padding: '3px 10px', borderRadius: 20, fontSize: '0.72rem', fontWeight: 600
          }}>Live Telematics</span>
        </div>
      </div>

      {/* Map Canvas */}
      <div ref={mapRef} style={{ height: 440, width: '100%' }} />

      {/* Reference Card Overlay: Vehicle Telemetry */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        right: 24,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(56, 239, 125, 0.3)',
        borderRadius: 10,
        padding: '10px 16px',
        color: '#e6edf3',
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Last Mile Vehicle (T701)
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ background: 'rgba(56, 239, 125, 0.2)', color: '#38ef7d', fontSize: '0.65rem', fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
            ACTIVE
          </span>
          <span style={{ fontSize: '0.78rem', color: '#cbd5e1', fontWeight: 500 }}>
            Route: Chennai ➔ Hyderabad
          </span>
        </div>
      </div>

      {/* Reference Card Overlay: Telematics Summary */}
      <div style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        background: 'rgba(15, 23, 42, 0.92)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(0, 242, 254, 0.3)',
        borderRadius: 10,
        padding: '10px 16px',
        color: '#e6edf3',
        zIndex: 1000,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
      }}>
        <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
          Flights & Trucks Telematics
        </div>
        <div style={{ fontSize: '0.78rem', marginTop: 4, fontWeight: 600 }}>
          Live Routes: <span style={{ color: '#00f2fe' }}>45 Active</span> | In Transit: <span style={{ color: '#38ef7d' }}>28 Vehicles</span>
        </div>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="landing-wrapper">
      {/* NAVBAR */}
      <nav className="landing-nav">
        <div className="landing-nav-inner">
          <span className="landing-brand">DeliveryTrack</span>
          <div className="landing-nav-actions">
            <Link to="/login" className="landing-nav-link">Sign In</Link>
            <Link to="/register" className="landing-btn-cta">Get Started Free</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="landing-hero">
        <div className="hero-glow-1" />
        <div className="hero-glow-2" />
        <div className="landing-hero-inner fade-in-up">
          <span className="hero-badge">Last-Mile Delivery Platform</span>
          <h1 className="hero-title">
            Deliver smarter,<br />
            <span className="hero-title-accent">not harder.</span>
          </h1>
          <p className="hero-sub">
            A complete delivery management system — place orders, auto-assign agents,
            track in real time, and keep a full audit trail. Built for scale.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="landing-btn-primary">Start Tracking Now</Link>
            <Link to="/login" className="landing-btn-ghost">Sign in to your account →</Link>
          </div>
          <div className="hero-stats">
            <div className="hero-stat"><span>Real-time</span>Tracking</div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span>Smart</span>Assignment</div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span>Full</span>Audit Log</div>
            <div className="hero-stat-divider" />
            <div className="hero-stat"><span>Role-based</span>Dashboards</div>
          </div>
        </div>
      </section>

      {/* PUBLIC SHIPPING NETWORK MAP */}
      <section className="landing-map-section" style={{ padding: '0 20px 60px' }}>
        <div className="landing-section-inner">
          <div style={{ textAlign: 'center', marginBottom: 30 }}>
            <span className="section-eyebrow">Nationwide Coverage</span>
            <h2 className="section-title">Connected Delivery Network</h2>
            <p className="section-sub">Live route telematics across major Indian logistics hubs</p>
          </div>
          <PublicNetworkMap />
        </div>
      </section>

      {/* FEATURES */}
      <section className="landing-features">
        <div className="landing-section-inner">
          <p className="section-eyebrow">Everything you need</p>
          <h2 className="section-title">One platform. Every delivery.</h2>
          <p className="section-sub">From order placement to doorstep delivery — managed in one place.</p>
          <div className="features-grid">
            {[
              {
                icon: 'bi-geo-alt-fill',
                color: '#3b82f6',
                bg: '#eff6ff',
                title: 'Real-Time Order Tracking',
                desc: 'Customers get live status updates from pickup to delivery. Full timeline with timestamps and notes.',
              },
              {
                icon: 'bi-person-check-fill',
                color: '#16a34a',
                bg: '#f0fdf4',
                title: 'Intelligent Agent Assignment',
                desc: 'Orders are automatically matched to available agents in the right zone — no manual dispatch needed.',
              },
              {
                icon: 'bi-shield-check',
                color: '#7c3aed',
                bg: '#f3e8ff',
                title: 'Immutable Audit Log',
                desc: 'Every status change is permanently recorded. Full compliance-ready history for every order.',
              },
              {
                icon: 'bi-calculator',
                color: '#d97706',
                bg: '#fffbeb',
                title: 'Automated Shipping Charges',
                desc: 'Zone-based rate cards with weight slabs and COD surcharges — calculated instantly at checkout.',
              },
              {
                icon: 'bi-speedometer2',
                color: '#0ea5e9',
                bg: '#f0f9ff',
                title: 'Admin Control Center',
                desc: 'Manage zones, rate cards, and agents from a unified dashboard. Full visibility, full control.',
              },
              {
                icon: 'bi-calendar-check',
                color: '#db2777',
                bg: '#fdf2f8',
                title: 'Flexible Rescheduling',
                desc: 'Customers can reschedule failed deliveries with a preferred time — agents are notified instantly.',
              },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon" style={{ background: f.bg, color: f.color }}>
                  <i className={`bi ${f.icon}`} />
                </div>
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-how">
        <div className="landing-section-inner">
          <p className="section-eyebrow">Simple by design</p>
          <h2 className="section-title">How it works</h2>
          <div className="how-steps">
            {[
              { num: '01', title: 'Place an Order', desc: 'Customer enters pickup & delivery addresses. Charges are calculated instantly based on zone and weight.' },
              { num: '02', title: 'Agent Auto-Assigned', desc: 'The system finds the best available agent in the delivery zone and assigns the order automatically.' },
              { num: '03', title: 'Track to the Door', desc: 'Real-time status updates from Picked Up → In Transit → Out for Delivery → Delivered.' },
            ].map((s, i) => (
              <div key={s.num} className="how-step">
                <div className="how-step-num">{s.num}</div>
                {i < 2 && <div className="how-step-line" />}
                <h3 className="how-step-title">{s.title}</h3>
                <p className="how-step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="landing-cta-band">
        <div className="landing-section-inner" style={{ textAlign: 'center' }}>
          <h2 className="cta-band-title">Ready to streamline your deliveries?</h2>
          <p className="cta-band-sub">Join as a customer, agent, or admin. It's free to try.</p>
          <div className="hero-actions" style={{ justifyContent: 'center' }}>
            <Link to="/register" className="landing-btn-primary">Create Your Account</Link>
            <Link to="/login" className="landing-btn-ghost-dark">Sign in instead →</Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <div className="landing-nav-inner">
          <span className="landing-brand" style={{ fontSize: '1rem' }}>DeliveryTrack</span>
          <span className="footer-copy">© 2026 DeliveryTrack. Last-Mile Delivery Platform.</span>
        </div>
      </footer>
    </div>
  );
}
