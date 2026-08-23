// Central fetch wrapper — all API calls go through here
const BASE = '/api';

async function http(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body != null) opts.body = JSON.stringify(body);
  const res = await fetch(BASE + path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

export const api = {
  get:    (path)        => http('GET',    path),
  post:   (path, body)  => http('POST',   path, body),
  put:    (path, body)  => http('PUT',    path, body),
  patch:  (path, body)  => http('PATCH',  path, body),
  delete: (path)        => http('DELETE', path),
};

// Auth
export const authApi = {
  register: (data)   => api.post('/auth/register', data),
  login:    (data)   => api.post('/auth/login', data),
  logout:   ()       => api.post('/auth/logout'),
  me:       ()       => api.get('/auth/me'),
};

// Orders
export const ordersApi = {
  list:          (params = {}) => api.get('/orders?' + new URLSearchParams(params)),
  get:           (id)          => api.get(`/orders/${id}`),
  create:        (data)        => api.post('/orders', data),
  preview:       (data)        => api.post('/orders/preview-charge', data),
  updateStatus:  (id, data)    => api.patch(`/orders/${id}/status`, data),
  assign:        (id, data)    => api.patch(`/orders/${id}/assign`, data),
  reschedule:    (id, data)    => api.patch(`/orders/${id}/reschedule`, data),
};

// Zones
export const zonesApi = {
  list:       ()          => api.get('/admin/zones'),
  create:     (data)      => api.post('/admin/zones', data),
  update:     (id, data)  => api.put(`/admin/zones/${id}`, data),
  delete:     (id)        => api.delete(`/admin/zones/${id}`),
  getAreas:   (id)        => api.get(`/admin/zones/${id}/areas`),
  addArea:    (id, data)  => api.post(`/admin/zones/${id}/areas`, data),
  deleteArea: (zoneId, areaId) => api.delete(`/admin/zones/${zoneId}/areas/${areaId}`),
};

// Rate Cards
export const rateCardsApi = {
  list:              () => api.get('/admin/rate-cards'),
  create:       (data)  => api.post('/admin/rate-cards', data),
  update:  (id, data)   => api.put(`/admin/rate-cards/${id}`, data),
  getCodSurcharge:   () => api.get('/admin/rate-cards/cod-surcharge'),
  updateCod: (id, data) => api.put(`/admin/rate-cards/cod-surcharge/${id}`, data),
  public:            () => api.get('/rate-cards/public'),
};

// Agents
export const agentsApi = {
  list:               ()         => api.get('/admin/agents'),
  setAvailability: (id, data)    => api.patch(`/admin/agents/${id}/availability`, data),
  setZone:         (id, data)    => api.patch(`/admin/agents/${id}/zone`, data),
};
