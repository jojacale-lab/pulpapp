const API_URL = import.meta.env.VITE_API_URL || '/api';

const getToken = () => localStorage.getItem('pulpapp_token');

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    if (res.status === 401) {
      localStorage.removeItem('pulpapp_token');
      window.location.href = '/login';
    }
    if (res.status === 402) {
      throw { code: 'SUBSCRIPTION_EXPIRED', message: data.message || data.error };
    }
    throw new Error(data.error || 'Error en la solicitud');
  }
  return data;
};

const get = (path, params) => {
  const url = params ? `${path}?${new URLSearchParams(params)}` : path;
  return request(url);
};
const post = (path, body) => request(path, { method: 'POST', body: JSON.stringify(body) });
const put = (path, body) => request(path, { method: 'PUT', body: JSON.stringify(body) });
const del = (path) => request(path, { method: 'DELETE' });

// Auth
export const authApi = {
  login: (email, password) => post('/auth/login', { email, password }),
  register: (data) => post('/auth/register', data),
  me: () => get('/auth/me'),
  updateProfile: (data) => put('/auth/profile', data),
  refresh: (refreshToken) => post('/auth/refresh', { refreshToken }),
  logout: () => post('/auth/logout')
};

// Dashboard
export const dashboardApi = {
  stats: () => get('/dashboard/stats'),
  todayAppointments: () => get('/dashboard/today-appointments'),
  recentPatients: () => get('/dashboard/recent-patients'),
  revenueChart: () => get('/dashboard/revenue-chart')
};

// Patients
export const patientsApi = {
  list: (params) => get('/patients', params),
  get: (id) => get(`/patients/${id}`),
  create: (data) => post('/patients', data),
  update: (id, data) => put(`/patients/${id}`, data),
  delete: (id) => del(`/patients/${id}`),
  updateMedicalHistory: (id, data) => put(`/patients/${id}/medical-history`, data),
  stats: (id) => get(`/patients/${id}/stats`)
};

// Appointments
export const appointmentsApi = {
  list: (params) => get('/appointments', params),
  get: (id) => get(`/appointments/${id}`),
  create: (data) => post('/appointments', data),
  update: (id, data) => put(`/appointments/${id}`, data),
  delete: (id) => del(`/appointments/${id}`)
};

// Clinical History
export const clinicalApi = {
  list: (patientId) => get(`/clinical-history/${patientId}`),
  get: (id) => get(`/clinical-history/record/${id}`),
  create: (data) => post('/clinical-history', data),
  update: (id, data) => put(`/clinical-history/${id}`, data),
  delete: (id) => del(`/clinical-history/${id}`)
};

// Odontogram
export const odontogramApi = {
  get: (patientId) => get(`/odontogram/${patientId}`),
  updateTooth: (patientId, toothNumber, data) => put(`/odontogram/${patientId}/${toothNumber}`, data),
  bulkUpdate: (patientId, teeth) => put(`/odontogram/${patientId}/bulk`, { teeth })
};

// Invoices
export const invoicesApi = {
  list: (params) => get('/invoices', params),
  get: (id) => get(`/invoices/${id}`),
  create: (data) => post('/invoices', data),
  update: (id, data) => put(`/invoices/${id}`, data),
  pay: (id, data) => post(`/invoices/${id}/pay`, data),
  treatments: () => get('/invoices/treatments/catalog')
};

// Evolutions
export const evolutionApi = {
  list: (patientId) => get(`/evolutions/${patientId}`),
  create: (data) => post('/evolutions', data),
  update: (id, data) => put(`/evolutions/${id}`, data),
  delete: (id) => del(`/evolutions/${id}`),
};

// Treatment Plans
export const treatmentPlanApi = {
  list: (patientId, params) => get(`/treatment-plans/${patientId}`, params),
  create: (data) => post('/treatment-plans', data),
  update: (id, data) => put(`/treatment-plans/${id}`, data),
  delete: (id) => del(`/treatment-plans/${id}`),
};

// Medication Orders
export const medicationOrderApi = {
  list: (patientId) => get(`/medication-orders/${patientId}`),
  create: (data) => post('/medication-orders', data),
  update: (id, data) => put(`/medication-orders/${id}`, data),
  delete: (id) => del(`/medication-orders/${id}`),
};

// Admin
export const adminApi = {
  listUsers: () => get('/admin/users'),
  updateUser: (id, data) => put(`/admin/users/${id}`, data),
};

// AI
export const aiApi = {
  chat: (message, history, patient_context) => post('/ai/chat', { message, history, patient_context }),
  suggestTreatment: (data) => post('/ai/suggest-treatment', data),
  summarizeRecord: (data) => post('/ai/summarize-record', data)
};
