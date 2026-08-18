const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

async function request(path, { method = 'GET', body, token, raw = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (raw) return res; // caller handles response (e.g. CSV download)

  const isJson = res.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message = (isJson && data && data.error) || 'Something went wrong';
    throw new Error(message);
  }
  return data;
}

export const api = {
  // auth
  signup: (payload) => request('/auth/signup', { method: 'POST', body: payload }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload }),
  requestOtp: (email) => request('/auth/request-otp', { method: 'POST', body: { email } }),
  verifyOtp: (email, otp) => request('/auth/verify-otp', { method: 'POST', body: { email, otp } }),
  me: (token) => request('/auth/me', { token }),

  // events
  listEvents: (token) => request('/events', { token }),
  getEvent: (id, token) => request(`/events/${id}`, { token }),
  createEvent: (payload, token) => request('/events', { method: 'POST', body: payload, token }),
  updateEvent: (id, payload, token) => request(`/events/${id}`, { method: 'PUT', body: payload, token }),
  setEventStatus: (id, status, token) =>
    request(`/events/${id}/status`, { method: 'PATCH', body: { status }, token }),

  // registration
  registerForEvent: (eventId, token) => request(`/events/${eventId}/register`, { method: 'POST', token }),
  cancelRegistration: (registrationId, token) =>
    request(`/registrations/${registrationId}`, { method: 'DELETE', token }),
  listRegistrationsForEvent: (eventId, status, token) =>
    request(`/events/${eventId}/registrations${status ? `?status=${status}` : ''}`, { token }),

  // tickets
  getMyTickets: (token) => request('/tickets/me', { token }),
  verifyTicket: (ticketToken, token) =>
    request('/tickets/verify', { method: 'POST', body: { token: ticketToken }, token }),

  // admin
  getDashboard: (eventId, token) => request(`/admin/dashboard/${eventId}`, { token }),
  getWaitlist: (eventId, token) => request(`/admin/waitlist/${eventId}`, { token }),
  createStaff: (payload, token) => request('/admin/staff', { method: 'POST', body: payload, token }),

  async downloadRegistrationsCsv(eventId, token) {
    const res = await request(`/events/${eventId}/registrations/export`, { token, raw: true });
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `event-${eventId}-registrations.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default api;
