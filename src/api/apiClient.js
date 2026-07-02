import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// ---- Candidates ----
export const listCandidates = (name) =>
  api.get('/candidates', { params: name ? { name } : {} }).then(r => r.data);

export const getCandidate = (id) => api.get(`/candidates/${id}`).then(r => r.data);

export const createCandidate = (payload) => api.post('/candidates', payload).then(r => r.data);

export const updateCandidate = (id, payload) => api.put(`/candidates/${id}`, payload).then(r => r.data);

export const deleteCandidate = (id) => api.delete(`/candidates/${id}`);

// ---- Interviews ----
export const listInterviews = (params = {}) => api.get('/interviews', { params }).then(r => r.data);

export const getInterview = (id) => api.get(`/interviews/${id}`).then(r => r.data);

export const createInterview = (payload) => api.post('/interviews', payload).then(r => r.data);

export const updateInterview = (id, payload) => api.put(`/interviews/${id}`, payload).then(r => r.data);

export const deleteInterview = (id) => api.delete(`/interviews/${id}`);

export default api;
