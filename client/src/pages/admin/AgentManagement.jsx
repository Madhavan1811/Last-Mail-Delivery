import { useState, useEffect } from 'react';
import { agentsApi, zonesApi } from '../../api';

export default function AgentManagement() {
  const [agents, setAgents]   = useState([]);
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [updating, setUpdating] = useState({});

  const load = async () => {
    setLoading(true);
    try {
      const [a, z] = await Promise.all([agentsApi.list(), zonesApi.list()]);
      setAgents(a); setZones(z);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleAvailability = async (agent) => {
    setUpdating(u => ({ ...u, [agent.id]: true }));
    try {
      await agentsApi.setAvailability(agent.id, { is_available: !agent.is_available });
      load();
    } catch (e) { setError(e.message); }
    finally { setUpdating(u => ({ ...u, [agent.id]: false })); }
  };

  const changeZone = async (agentId, zoneId) => {
    setUpdating(u => ({ ...u, [agentId]: true }));
    try {
      await agentsApi.setZone(agentId, { zone_id: zoneId });
      load();
    } catch (e) { setError(e.message); }
    finally { setUpdating(u => ({ ...u, [agentId]: false })); }
  };

  const available   = agents.filter(a => a.is_available);
  const unavailable = agents.filter(a => !a.is_available);

  return (
    <div className="fade-in-up">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agent Management</h1>
          <p className="page-subtitle">{agents.length} agents · {available.length} available</p>
        </div>
        <button className="btn btn-outline-primary btn-sm" onClick={load}>
          <i className="bi bi-arrow-clockwise me-1" />Refresh
        </button>
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* Stats */}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-value" style={{color:'var(--dt-primary)'}}>{agents.length}</div>
            <div className="stat-label">Total Agents</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-value" style={{color:'#16a34a'}}>{available.length}</div>
            <div className="stat-label">Available Now</div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="stat-card">
            <div className="stat-value" style={{color:'#dc2626'}}>{unavailable.length}</div>
            <div className="stat-label">Unavailable</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-5"><div className="spinner-border text-primary" /></div>
      ) : (
        <div className="dt-card">
          <table className="table dt-table mb-0">
            <thead><tr>
              <th>Agent</th>
              <th>Zone</th>
              <th>Active Orders</th>
              <th>Availability</th>
              <th>Change Zone</th>
            </tr></thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: agent.is_available ? '#dcfce7' : '#fee2e2',
                        color: agent.is_available ? '#16a34a' : '#dc2626',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
                      }}>
                        {agent.name.charAt(0)}
                      </div>
                      <div>
                        <div className="fw-semibold">{agent.name}</div>
                        <div className="text-muted" style={{fontSize:'0.75rem'}}>{agent.email}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge bg-secondary">{agent.zone_name || '—'}</span>
                  </td>
                  <td>
                    <span className={`badge ${parseInt(agent.active_orders) > 0 ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                      {agent.active_orders} active
                    </span>
                  </td>
                  <td>
                    <div className="form-check form-switch">
                      <input
                        id={`avail-${agent.id}`}
                        className="form-check-input"
                        type="checkbox"
                        role="switch"
                        checked={agent.is_available}
                        disabled={updating[agent.id]}
                        onChange={() => toggleAvailability(agent)}
                        style={{cursor:'pointer'}}
                      />
                      <label htmlFor={`avail-${agent.id}`} className="form-check-label"
                        style={{color: agent.is_available ? '#16a34a' : '#dc2626', fontWeight: 600, fontSize:'0.8rem'}}>
                        {agent.is_available ? 'Available' : 'Unavailable'}
                      </label>
                    </div>
                  </td>
                  <td>
                    <select className="form-select form-select-sm" style={{width:140}}
                      value={agent.zone_id || ''}
                      disabled={updating[agent.id]}
                      onChange={e => changeZone(agent.id, e.target.value)}>
                      {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {agents.length === 0 && (
            <div className="text-center py-4 text-muted">
              No agents found. Register an account with role "agent" to add one.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
