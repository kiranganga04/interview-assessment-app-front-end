import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

const AUTH_STORAGE_KEY = 'interviewAssessmentAuth';

api.interceptors.request.use((config) => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (raw) {
    const auth = JSON.parse(raw);
    if (auth?.token) config.headers.Authorization = `Bearer ${auth.token}`;
  }
  return config;
});

// Module 1: on a 401 the session token is no longer valid server-side (expired/revoked) —
// clear it locally so the app drops back to the sign-in page instead of looping on stale auth.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      clearAuth();
    }
    return Promise.reject(error);
  }
);

// ---- Auth ----
export const getStoredAuth = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const storeAuth = (auth) => localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(auth));

export const clearAuth = () => localStorage.removeItem(AUTH_STORAGE_KEY);

export const signUp = (payload) => api.post('/auth/signup', payload).then(r => r.data);

export const signIn = (payload) => api.post('/auth/signin', payload).then(r => r.data);

export const signOut = () => api.post('/auth/logout').catch(() => {});

export const requestPasswordReset = (email) => api.post('/auth/password-reset/request', { email });

export const confirmPasswordReset = (token, newPassword) =>
  api.post('/auth/password-reset/confirm', { token, newPassword });

// ---- Candidates ----
export const listCandidates = (name) =>
  api.get('/candidates', { params: name ? { name } : {} }).then(r => r.data);

export const getCandidate = (id) => api.get(`/candidates/${id}`).then(r => r.data);

export const createCandidate = (payload) => api.post('/candidates', payload).then(r => r.data);

export const updateCandidate = (id, payload) => api.put(`/candidates/${id}`, payload).then(r => r.data);

export const deleteCandidate = (id) => api.delete(`/candidates/${id}`);

// ---- Interviews (module 8: paginated/filterable) ----
export const listInterviews = (params = {}) => api.get('/interviews', { params }).then(r => r.data);

export const getInterview = (id) => api.get(`/interviews/${id}`).then(r => r.data);

export const createInterview = (payload) => api.post('/interviews', payload).then(r => r.data);

export const updateInterview = (id, payload) => api.put(`/interviews/${id}`, payload).then(r => r.data);

export const changeInterviewStatus = (id, status) =>
  api.patch(`/interviews/${id}/status`, { status }).then(r => r.data);

export const deleteInterview = (id) => api.delete(`/interviews/${id}`);

// ---- Skill catalog (module 4) ----
export const listActiveSkills = () => api.get('/skills').then(r => r.data);

export const listAllSkills = () => api.get('/skills/all').then(r => r.data);

export const createSkill = (payload) => api.post('/skills', payload).then(r => r.data);

export const updateSkill = (id, payload) => api.put(`/skills/${id}`, payload).then(r => r.data);

export const deleteSkill = (id) => api.delete(`/skills/${id}`);

// ---- Users / admin (module 2) ----
export const listUsers = () => api.get('/users').then(r => r.data);

export const createUser = (payload) => api.post('/users', payload).then(r => r.data);

export const updateUserRole = (id, payload) => api.put(`/users/${id}/role`, payload).then(r => r.data);

// ---- Files (module 5) ----
export const uploadFile = (ownerType, ownerId, file) => {
  const form = new FormData();
  form.append('file', file);
  return api.post(`/files/${ownerType}/${ownerId}`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }).then(r => r.data);
};

export const listAttachments = (ownerType, ownerId) =>
  api.get(`/files/${ownerType}/${ownerId}`).then(r => r.data);

export const attachmentDownloadHref = (attachmentId) => `/api/files/${attachmentId}`;

// ---- Reports / dashboard (module 7) ----
export const getDashboardSummary = () => api.get('/reports/summary').then(r => r.data);

export const getPassRateReport = () => api.get('/reports/pass-rate').then(r => r.data);

export const getSkillAverageReport = () => api.get('/reports/skill-averages').then(r => r.data);

export const getPanelistCalibrationReport = () => api.get('/reports/panelist-calibration').then(r => r.data);

export default api;
