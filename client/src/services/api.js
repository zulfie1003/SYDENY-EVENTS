import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

// Intercept errors globally
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Could redirect to login
    }
    return Promise.reject(err);
  }
);

// Auth
export const authAPI = {
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  loginUrl: '/api/auth/google',
};

// Public Events
export const eventsAPI = {
  getAll: (params) => api.get('/events', { params }),
  getById: (id) => api.get(`/events/${id}`),
};

// Admin
export const adminAPI = {
  getEvents: (params) => api.get('/admin/events', { params }),
  importEvent: (id, data) => api.post(`/admin/events/${id}/import`, data),
  updateStatus: (id, status) => api.patch(`/admin/events/${id}/status`, { status }),
  deleteEvent: (id) => api.delete(`/admin/events/${id}`),
  triggerScrape: () => api.post('/admin/scrape'),
  getStats: () => api.get('/admin/stats'),
  getEmails: () => api.get('/admin/emails'),
};

// Email
export const emailAPI = {
  capture: (data) => api.post('/email/capture', data),
};

export default api;
