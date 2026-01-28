import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Response interceptor to unwrap API responses
api.interceptors.response.use(
  response => {
    // API returns { success: true, workflows/forms/instances/data: [...] }
    // Unwrap the response for convenience
    const data = response.data;
    if (data && data.success) {
      // Return the actual data, not the wrapper
      if (data.workflows) return { data: data.workflows };
      if (data.forms) return { data: data.forms };
      if (data.instances) return { data: data.instances };
      if (data.instance) return { data: data.instance };
      if (data.workflow) return { data: data.workflow };
      if (data.data) return { data: data.data };
      if (data.statistics) return { data: { statistics: data.statistics } };
    }
    return response;
  },
  error => Promise.reject(error)
);

// Workflows API
export const workflowsApi = {
  list: () => api.get('/workflows'),
  get: (id) => api.get(`/workflows/${id}`),
  start: (id, data) => api.post(`/workflows/${id}/start`, data),
  getInstances: () => api.get('/instances'),
  getInstance: (instanceId) => api.get(`/instances/${instanceId}`)
};

// Forms API
export const formsApi = {
  list: () => api.get('/resources/forms'),
  get: (id) => api.get('/resources/forms').then(res => ({
    data: (res.data || []).find(f => f.id === id)
  })),
  submit: (id, data) => api.post(`/forms/${id}/submit`, data)
};

// Data API (generic CRUD for all data models)
export const dataApi = {
  list: (model) => api.get(`/data/${model}`),
  get: (model, id) => api.get(`/data/${model}/${id}`),
  create: (model, data) => api.post(`/data/${model}`, data),
  update: (model, id, data) => api.put(`/data/${model}/${id}`, data),
  delete: (model, id) => api.delete(`/data/${model}/${id}`)
};

// Execution Logs API
export const logsApi = {
  getStatistics: () => api.get('/execution-logs/statistics'),
  getHistory: (limit = 50) => api.get(`/execution-logs/history?limit=${limit}`)
};

export default api;