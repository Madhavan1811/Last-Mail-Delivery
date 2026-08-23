export default function ChargeBreakdown({ breakdown, pickupZone, dropZone }) {
  if (!breakdown) return null;
  return (
    <div className="breakdown-card fade-in-up">
      <h6 className="fw-bold mb-3 d-flex align-items-center gap-2">
        <i className="bi bi-calculator text-primary" />
        Charge Breakdown
      </h6>

      <div className="breakdown-row">
        <span className="text-muted">Route</span>
        <span className="fw-semibold">
          {pickupZone?.name || '—'} → {dropZone?.name || '—'}
          <span className={`ms-2 badge ${breakdown.zoneRelation === 'intra' ? 'bg-primary' : 'bg-warning text-dark'}`}>
            {breakdown.zoneRelation}-zone
          </span>
        </span>
      </div>

      <div className="breakdown-row">
        <span className="text-muted">Volumetric Weight</span>
        <span>{breakdown.volumetricWeight.toFixed(3)} kg</span>
      </div>

      <div className="breakdown-row">
        <span className="text-muted">Billable Weight</span>
        <span className="fw-semibold">{breakdown.billableWeight.toFixed(3)} kg
          <span className="text-muted ms-1" style={{fontSize:'0.72rem'}}>
            (max of actual & volumetric)
          </span>
        </span>
      </div>

      <div className="breakdown-row">
        <span className="text-muted">Rate per kg</span>
        <span>₹{breakdown.ratePerKg}</span>
      </div>

      <div className="breakdown-row">
        <span className="text-muted">Base Price</span>
        <span>₹{breakdown.basePrice?.toFixed(2)}</span>
      </div>

      <div className="breakdown-row">
        <span className="text-muted">Base Charge</span>
        <span>₹{breakdown.baseCharge?.toFixed(2)}</span>
      </div>

      {breakdown.codSurcharge > 0 && (
        <div className="breakdown-row">
          <span className="text-muted">COD Surcharge</span>
          <span className="text-warning fw-semibold">+ ₹{breakdown.codSurcharge.toFixed(2)}</span>
        </div>
      )}

      <div className="breakdown-row total">
        <span>Total Payable</span>
        <span>₹{breakdown.total.toFixed(2)}</span>
      </div>
    </div>
  );
}
