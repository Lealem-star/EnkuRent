import api from './api';

export const propertyService = {
  getAll: (params) => api.get('/properties', { params }),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
};

export const unitService = {
  getAll: (params) => api.get('/units', { params }),
  getById: (id) => api.get(`/units/${id}`),
  create: (data) => api.post('/units', data),
  update: (id, data) => api.put(`/units/${id}`, data),
  delete: (id) => api.delete(`/units/${id}`),
};

export const tenantService = {
  getAll: (params) => api.get('/tenants', { params }),
  getById: (id) => api.get(`/tenants/${id}`),
  create: (data) => api.post('/tenants', data),
  update: (id, data) => api.put(`/tenants/${id}`, data),
  delete: (id) => api.delete(`/tenants/${id}`),
};

export const leaseService = {
  getAll: (params) => api.get('/leases', { params }),
  getById: (id) => api.get(`/leases/${id}`),
  create: (data) => api.post('/leases', data),
  update: (id, data) => api.put(`/leases/${id}`, data),
};

export const invoiceService = {
  getAll: (params) => api.get('/invoices', { params }),
  getById: (id) => api.get(`/invoices/${id}`),
  create: (data) => api.post('/invoices', data),
  generateMonthly: (data) => api.post('/invoices/generate-monthly', data),
};

export const paymentService = {
  getAll: (params) => api.get('/payments', { params }),
  create: (data) => api.post('/payments', data),
};

export const maintenanceService = {
  getAll: (params) => api.get('/maintenance', { params }),
  create: (data) => api.post('/maintenance', data),
  update: (id, data) => api.put(`/maintenance/${id}`, data),
};

export const expenseService = {
  getAll: (params) => api.get('/expenses', { params }),
  create: (data) => api.post('/expenses', data),
  delete: (id) => api.delete(`/expenses/${id}`),
};

export const reportService = {
  getOverview: () => api.get('/reports/overview'),
  getFinancials: (params) => api.get('/reports/financials', { params }),
};

