import { useState, useEffect } from 'react';
import { zonesApi } from '../../api';

export default function ZoneManagement() {
  const [zones, setZones]         = useState([]);
  const [areas, setAreas]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [newZone, setNewZone]     = useState('');
  const [editId, setEditId]       = useState(null);
  const [editName, setEditName]   = useState('');
  const [expanded, setExpanded]   = useState(null);
  const [newPin, setNewPin]       = useState({});
  const [error, setError]         = useState('');
  const [saving, setSaving]       = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const z = await zonesApi.list();
      setZones(z);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const loadAreas = async (zoneId) => {
    if (areas[zoneId]) return;
    try {
      const a = await zonesApi.getAreas(zoneId);
      setAreas(prev => ({ ...prev, [zoneId]: a }));
    } catch (e) { setError(e.message); }
  };

  const toggleExpand = async (zoneId) => {
    if (expanded === zoneId) { setExpanded(null); return; }
    setExpanded(zoneId);
    await loadAreas(zoneId);
  };

  const createZone = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await zonesApi.create({ name: newZone });
      setNewZone(''); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const updateZone = async (id) => {
    setSaving(true); setError('');
    try {
      await zonesApi.update(id, { name: editName });
      setEditId(null); load();
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteZone = async (id) => {
    if (!confirm('Delete this zone? This cannot be undone.')) return;
    try { await zonesApi.delete(id); load(); }
    catch (e) { setError(e.message); }
  };

  const addArea = async (zoneId) => {
    const pin = newPin[zoneId];
    if (!pin) return;
    setSaving(true);
    try {
      const a = await zonesApi.addArea(zoneId, { pincode_or_area: pin });
      setAreas(prev => ({ ...prev, [zoneId]: [...(prev[zoneId] || []), a] }));
      setNewPin(p => ({ ...p, [zoneId]: '' }));
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };

  const deleteArea = async (zoneId, areaId) => {
    try {
      await zonesApi.deleteArea(zoneId, areaId);
      setAreas(prev => ({ ...prev, [zoneId]: prev[zoneId].filter(a => a.id !== areaId) }));
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone Management</h1>
          <p className="page-subtitle">Configure delivery zones and assign pincodes</p>
        </div>
      </div>

      {error && <div className="alert alert-danger alert-dismissible mb-3">
        {error} <button className="btn-close" onClick={() => setError('')} />
      </div>}

      {/* Create zone */}
      <div className="dt-card mb-4">
        <h6 className="fw-bold mb-3"><i className="bi bi-plus-circle me-2 text-primary" />Add New Zone</h6>
        <form onSubmit={createZone} className="d-flex gap-2">
          <input id="new-zone-name" className="form-control" placeholder="Zone name (e.g. North Zone)"
            value={newZone} onChange={e => setNewZone(e.target.value)} required />
          <button id="create-zone-btn" type="submit" className="btn btn-primary text-nowrap" disabled={saving}>
            <i className="bi bi-plus me-1" />Create Zone
          </button>
        </form>
      </div>

      {/* Zones list */}
      <div className="dt-card">
        <h6 className="fw-bold mb-3">Zones ({zones.length})</h6>
        {loading ? <div className="text-center py-3"><div className="spinner-border text-primary spinner-border-sm" /></div> :
          zones.length === 0 ? <p className="text-muted">No zones yet. Create one above.</p> :
          <div className="d-flex flex-column gap-2">
            {zones.map(zone => (
              <div key={zone.id} className="border border-secondary-subtle rounded overflow-hidden mb-2" style={{borderColor:'var(--dt-border)'}}>
                <div className="d-flex align-items-center gap-3 p-3"
                  style={{background: expanded === zone.id ? 'var(--dt-surface-3)' : 'var(--dt-surface-2)', color:'var(--dt-text)'}}>
                  {editId === zone.id ? (
                    <div className="d-flex gap-2 flex-fill">
                      <input id={`edit-zone-${zone.id}`} className="form-control form-control-sm"
                        value={editName} onChange={e => setEditName(e.target.value)} />
                      <button className="btn btn-success btn-sm" onClick={() => updateZone(zone.id)}>Save</button>
                      <button className="btn btn-outline-secondary btn-sm" onClick={() => setEditId(null)}>Cancel</button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-fill">
                        <div className="fw-bold" style={{color:'var(--dt-text)'}}>{zone.name}</div>
                        <div className="text-muted" style={{fontSize:'0.78rem'}}>{zone.area_count} pincodes</div>
                      </div>
                      <button className="btn btn-sm btn-outline-secondary" onClick={() => { setEditId(zone.id); setEditName(zone.name); }}>
                        <i className="bi bi-pencil" />
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => deleteZone(zone.id)}>
                        <i className="bi bi-trash" />
                      </button>
                      <button className="btn btn-sm btn-outline-primary" onClick={() => toggleExpand(zone.id)}>
                        <i className={`bi bi-chevron-${expanded === zone.id ? 'up' : 'down'}`} />
                        Pincodes
                      </button>
                    </>
                  )}
                </div>

                {expanded === zone.id && (
                  <div className="p-3 border-top" style={{background:'var(--dt-surface)', borderColor:'var(--dt-border)'}}>
                    <div className="d-flex gap-2 mb-3">
                      <input id={`new-pin-${zone.id}`} className="form-control form-control-sm" placeholder="Add pincode/area..."
                        value={newPin[zone.id] || ''}
                        onChange={e => setNewPin(p => ({ ...p, [zone.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addArea(zone.id))}
                      />
                      <button className="btn btn-primary btn-sm text-nowrap" onClick={() => addArea(zone.id)} disabled={saving}>
                        <i className="bi bi-plus" /> Add
                      </button>
                    </div>
                    <div className="d-flex flex-wrap gap-2">
                      {(areas[zone.id] || []).map(area => (
                        <span key={area.id} className="badge d-flex align-items-center gap-1"
                          style={{background:'rgba(37,99,235,0.2)',color:'#60a5fa',border:'1px solid rgba(37,99,235,0.3)',padding:'6px 10px',fontSize:'0.8rem'}}>
                          <i className="bi bi-pin-map" />
                          {area.pincode_or_area}
                          <button style={{background:'none',border:'none',padding:0,color:'#60a5fa',cursor:'pointer'}}
                            onClick={() => deleteArea(zone.id, area.id)}>
                            <i className="bi bi-x" />
                          </button>
                        </span>
                      ))}
                      {(areas[zone.id] || []).length === 0 && <span className="text-muted small">No pincodes yet</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}
