import { useState, useEffect } from 'react';
import { rateCardsApi } from '../../api';

export default function RateCards() {
  const [cards, setCards]         = useState([]);
  const [cod, setCod]             = useState([]);
  const [loading, setLoading]     = useState(true);
  const [editCard, setEditCard]   = useState(null);
  const [editCod, setEditCod]     = useState(null);
  const [newCard, setNewCard]     = useState({ order_type:'B2C', zone_relation:'intra', rate_per_kg:'', base_price:'' });
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([rateCardsApi.list(), rateCardsApi.getCodSurcharge()]);
      setCards(c); setCod(s);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const createCard = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await rateCardsApi.create(newCard); setNewCard({ order_type:'B2C', zone_relation:'intra', rate_per_kg:'', base_price:'' }); load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveCard = async (id) => {
    setSaving(true);
    try { await rateCardsApi.update(id, { rate_per_kg: editCard.rate_per_kg, base_price: editCard.base_price }); setEditCard(null); load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const saveCod = async (id) => {
    setSaving(true);
    try { await rateCardsApi.updateCod(id, { surcharge_amount: editCod.surcharge_amount }); setEditCod(null); load(); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Rate Cards</h1>
          <p className="page-subtitle">Configure shipping rates and COD surcharges</p>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible mb-3">{error} <button className="btn-close" onClick={() => setError('')} /></div>}

      <div className="row g-4">
        <div className="col-lg-8">
          <div className="dt-card mb-4">
            <h6 className="fw-bold mb-3"><i className="bi bi-calculator me-2 text-primary" />Rate Cards</h6>
            {loading ? <div className="text-center py-3"><div className="spinner-border text-primary spinner-border-sm" /></div> : (
              <div className="table-responsive">
                <table className="table dt-table mb-0">
                  <thead><tr>
                    <th>Order Type</th><th>Zone Relation</th><th>Base Price (₹)</th><th>Rate/kg (₹)</th><th></th>
                  </tr></thead>
                  <tbody>
                    {cards.map(card => (
                      <tr key={card.id}>
                        <td><span className="badge bg-primary">{card.order_type}</span></td>
                        <td><span className={`badge ${card.zone_relation === 'intra' ? 'bg-success' : 'bg-warning text-dark'}`}>{card.zone_relation}</span></td>
                        <td>
                          {editCard?.id === card.id
                            ? <input type="number" min="0" step="0.01" className="form-control form-control-sm" style={{width:100}}
                                value={editCard.base_price} onChange={e => setEditCard(c => ({...c, base_price: e.target.value}))} />
                            : `₹${card.base_price}`}
                        </td>
                        <td>
                          {editCard?.id === card.id
                            ? <input type="number" min="0" step="0.01" className="form-control form-control-sm" style={{width:100}}
                                value={editCard.rate_per_kg} onChange={e => setEditCard(c => ({...c, rate_per_kg: e.target.value}))} />
                            : `₹${card.rate_per_kg}`}
                        </td>
                        <td>
                          {editCard?.id === card.id ? (
                            <div className="d-flex gap-1">
                              <button className="btn btn-success btn-sm" onClick={() => saveCard(card.id)} disabled={saving}>Save</button>
                              <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditCard(null)}>✕</button>
                            </div>
                          ) : (
                            <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditCard({ ...card })}>
                              <i className="bi bi-pencil" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Add new */}
          <div className="dt-card">
            <h6 className="fw-bold mb-3"><i className="bi bi-plus-circle me-2 text-primary" />Add Rate Card</h6>
            <form onSubmit={createCard} className="row g-2 align-items-end">
              <div className="col-md-3">
                <label className="form-label fw-semibold" style={{fontSize:'0.8rem'}}>Order Type</label>
                <select className="form-select form-select-sm" value={newCard.order_type}
                  onChange={e => setNewCard(c => ({...c, order_type: e.target.value}))}>
                  <option value="B2C">B2C</option><option value="B2B">B2B</option>
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label fw-semibold" style={{fontSize:'0.8rem'}}>Zone Relation</label>
                <select className="form-select form-select-sm" value={newCard.zone_relation}
                  onChange={e => setNewCard(c => ({...c, zone_relation: e.target.value}))}>
                  <option value="intra">Intra</option><option value="inter">Inter</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label fw-semibold" style={{fontSize:'0.8rem'}}>Base Price</label>
                <input type="number" min="0" step="0.01" className="form-control form-control-sm" placeholder="₹"
                  value={newCard.base_price} onChange={e => setNewCard(c => ({...c, base_price: e.target.value}))} required />
              </div>
              <div className="col-md-2">
                <label className="form-label fw-semibold" style={{fontSize:'0.8rem'}}>Rate/kg</label>
                <input type="number" min="0" step="0.01" className="form-control form-control-sm" placeholder="₹/kg"
                  value={newCard.rate_per_kg} onChange={e => setNewCard(c => ({...c, rate_per_kg: e.target.value}))} required />
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary btn-sm w-100" disabled={saving}>Add Card</button>
              </div>
            </form>
          </div>
        </div>

        {/* COD Surcharge */}
        <div className="col-lg-4">
          <div className="dt-card">
            <h6 className="fw-bold mb-3"><i className="bi bi-cash-coin me-2 text-warning" />COD Surcharge</h6>
            {cod.map(c => (
              <div key={c.id} className="d-flex align-items-center justify-content-between p-3 rounded mb-2"
                style={{background:'var(--dt-surface-2)',border:'1px solid var(--dt-border)',color:'var(--dt-text)'}}>
                <div>
                  <div className="fw-bold">{c.order_type}</div>
                  <div className="text-muted small">Cash on Delivery surcharge</div>
                </div>
                {editCod?.id === c.id ? (
                  <div className="d-flex gap-1 align-items-center">
                    <input type="number" min="0" step="0.01" className="form-control form-control-sm" style={{width:80}}
                      value={editCod.surcharge_amount} onChange={e => setEditCod(x => ({...x, surcharge_amount: e.target.value}))} />
                    <button className="btn btn-success btn-sm" onClick={() => saveCod(c.id)}>✓</button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditCod(null)}>✕</button>
                  </div>
                ) : (
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-bold text-warning fs-5">₹{c.surcharge_amount}</span>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setEditCod({ ...c })}>
                      <i className="bi bi-pencil" />
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-3 p-3 rounded" style={{background:'rgba(37,99,235,0.12)',border:'1px solid rgba(37,99,235,0.25)'}}>
              <p className="mb-0 small text-info">
                <i className="bi bi-info-circle me-1" />
                COD surcharge is added on top of the base charge when payment_type = COD.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
