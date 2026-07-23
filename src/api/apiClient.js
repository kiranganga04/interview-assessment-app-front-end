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

// Candidates directory table (page/size/sort + search/emailFilter) -- separate from
// listCandidates() above, which stays a plain unpaginated list for the candidate picker.
export const searchCandidates = (params = {}) => api.get('/candidates/search', { params }).then(r => r.data);

// ---- Interviews (module 8: paginated/filterable) ----
export const listInterviews = (params = {}) => api.get('/interviews', { params }).then(r => r.data);

export const getInterview = (id) => api.get(`/interviews/${id}`).then(r => r.data);

// Feedback & Reports: a Panel member's own assigned candidates still awaiting feedback.
export const listMyInterviews = () => api.get('/interviews/mine').then(r => r.data);

// Feedback & Reports: a Panel member's full interview history (all statuses), most recent first.
export const listMyInterviewHistory = () => api.get('/interviews/mine/history').then(r => r.data);

export const createInterview = (payload) => api.post('/interviews', payload).then(r => r.data);

export const updateInterview = (id, payload) => api.put(`/interviews/${id}`, payload).then(r => r.data);

// Panel feedback submission: saves the assessment + moves it to SUBMITTED + notifies the recruiter.
export const submitInterviewFeedback = (id, payload) =>
  api.post(`/interviews/${id}/submit-feedback`, payload).then(r => r.data);

export const changeInterviewStatus = (id, status) =>
  api.patch(`/interviews/${id}/status`, { status }).then(r => r.data);

// Explicit reschedule: { scheduledAt: 'YYYY-MM-DDTHH:mm', meetingLink?, reason? }
export const rescheduleInterview = (id, payload) =>
  api.patch(`/interviews/${id}/reschedule`, payload).then(r => r.data);

export const deleteInterview = (id) => api.delete(`/interviews/${id}`);

export const scheduleInterview = (payload) => api.post('/interviews/schedule', payload).then(r => r.data);

// ---- Interviewers (People Management) ----
export const listInterviewers = () => api.get('/interviewers').then(r => r.data);

// Interviewers directory table (page/size/sort + search/status) -- separate from
// listInterviewers() above, which stays the full-directory list for dropdowns (Add Slot
// form, Teams view).
export const searchInterviewers = (params = {}) => api.get('/interviewers/search', { params }).then(r => r.data);

export const createInterviewer = (payload) => api.post('/interviewers', payload).then(r => r.data);

export const updateInterviewer = (id, payload) => api.put(`/interviewers/${id}`, payload).then(r => r.data);

export const deleteInterviewer = (id) => api.delete(`/interviewers/${id}`);

// ---- Interview slots (Interview Management) ----
export const listInterviewSlots = (params = {}) => api.get('/interview-slots', { params }).then(r => r.data);

// Interview Slots directory table (page/size/sort + search/status/mode) -- separate from
// listInterviewSlots() above, which stays the unpaginated AVAILABLE-from-today list the
// Schedule Interview wizard's slot picker needs in one call.
export const searchInterviewSlots = (params = {}) => api.get('/interview-slots/search', { params }).then(r => r.data);

export const createInterviewSlot = (payload) => api.post('/interview-slots', payload).then(r => r.data);

export const updateInterviewSlot = (id, payload) => api.put(`/interview-slots/${id}`, payload).then(r => r.data);

export const cancelInterviewSlot = (id) => api.post(`/interview-slots/${id}/cancel`);

// Interview Management (Bulk Import): raw CSV text in, per-row created/error summary out.
export const bulkImportInterviewSlots = (csv) => api.post('/interview-slots/bulk-import', { csv }).then(r => r.data);

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

export const getMonthlyInterviewsReport = (months = 6) =>
  api.get('/reports/monthly-interviews', { params: { months } }).then(r => r.data);

// Admin dashboard (governance) — ADMIN-only endpoints. These are additive: the Admin dashboard
// calls them with a .catch() fallback so it still renders if the backend phase isn't deployed yet.
// [{ recruiterEmail, name, activeCount, totalCount }]
export const getRecruiterWorkload = () => api.get('/reports/admin/recruiter-workload').then(r => r.data);

// { orphanedInterviews, interviewersWithoutUser, activeSkillCount }
export const getDataHygiene = () => api.get('/reports/admin/data-hygiene').then(r => r.data);

export const getTodaysAgenda = () => api.get('/reports/today-agenda').then(r => r.data);

// Downloads the caller's scoped interview list as a CSV Blob. Optional month = 'YYYY-MM'.
export const downloadInterviewsCsv = (month) =>
  api.get('/reports/export', { params: month ? { month } : {}, responseType: 'blob' }).then(r => r.data);

// Helper: turn a Blob into a browser file download.
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export default api;
