import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach Authorization Bearer token from localStorage
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('agricredit_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthenticated responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if expired
      localStorage.removeItem('agricredit_token');
      localStorage.removeItem('agricredit_user');
    }
    return Promise.reject(error);
  }
);

export const api = {
  // System Health
  getHealth: () => apiClient.get('/health'),

  // Dashboard
  getDashboardSummary: () => apiClient.get('/dashboard/summary'),

  // Applications
  getApplications: (params) => apiClient.get('/applications', { params }),
  getApplication: (id) => apiClient.get(`/applications/${id}`),
  submitApplication: (data) => apiClient.post('/applications', data),
  calculateCashflowPreview: (id, data) => apiClient.post(`/applications/${id}/calculate-cashflow`, data),

  // Documents
  uploadDocument: (appId, formData) =>
    apiClient.post(`/applications/${appId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getDocumentDownloadUrl: (appId, docId) => `${API_BASE_URL}/applications/${appId}/documents/${docId}/download`,

  // Assessment & Audit History
  assessApplication: (appId, data) => apiClient.post(`/applications/${appId}/assess`, data),
  getAssessment: (appId) => apiClient.get(`/applications/${appId}/assessment`),
  getApplicationHistory: (appId) => apiClient.get(`/applications/${appId}/history`),

  // Dataset & Model Transparency
  getDatasetInfo: () => apiClient.get('/dataset/info'),
  getModelInfo: () => apiClient.get('/model/info'),

  // Agricultural Loan Eligibility Prediction (6 Inputs + CCE Assessment)
  predictEligibility: (data) => apiClient.post('/agricredit/predict-eligibility', data),

  // Authentication
  login: (username, password) => apiClient.post('/auth/login', { username, password }),
  logout: () => apiClient.post('/auth/logout'),
  getMe: () => apiClient.get('/auth/me'),

  // Admin Review Workflow
  submitHumanReview: (appId, reviewData) => apiClient.post(`/admin/applications/${appId}/review`, reviewData),
  requestInformation: (appId, items) => apiClient.post(`/admin/applications/${appId}/request-information`, { requested_items: items }),
  seedDemoData: () => apiClient.post('/admin/seed-demo-data'),

  // Exploratory Data Analysis (EDA) Endpoints
  getEdaOverview: (params) => apiClient.get('/eda/overview', { params }),
  getEdaDistributions: (params) => apiClient.get('/eda/distributions', { params }),
  getEdaCorrelation: (params) => apiClient.get('/eda/correlation', { params }),
  getEdaMissingValues: (params) => apiClient.get('/eda/missing-values', { params }),
  getEdaNumericalSummary: (params) => apiClient.get('/eda/numerical-summary', { params }),
  getEdaFilters: (params) => apiClient.get('/eda/filters', { params }),
};

export default apiClient;
