import React, { useEffect, useState } from 'react';
import { listCandidates, createCandidate, updateCandidate, deleteCandidate } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

const EMPTY_FORM = { candidateName: '', mobileNumber: '', overallExperience: '', currentRole: '' };

/**
 * People Management: simple candidate directory (list + add + edit + remove). Deliberately
 * plain -- no card/table view toggle and no resume-match-score column, per scope decision to
 * skip that reference-app feature for now rather than ship a placeholder number.
 */
export default function CandidatesPage() {
  const toast = useToast();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  const load = () => {
    setLoading(true);
    listCandidates().then(setCandidates).catch((e) => setError(e?.response?.data?.message || 'Failed to load candidates.')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.candidateName.trim()) return;
    setSaving(true);
    try {
      await createCandidate(form);
      setForm(EMPTY_FORM);
      toast.success(`${form.candidateName} added.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add candidate.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (candidate) => {
    setEditingId(candidate.candidateId);
    setEditForm({
      candidateName: candidate.candidateName || '',
      mobileNumber: candidate.mobileNumber || '',
      overallExperience: candidate.overallExperience || '',
      currentRole: candidate.currentRole || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  };

  const saveEdit = async (candidateId) => {
    try {
      await updateCandidate(candidateId, editForm);
      toast.success('Candidate updated.');
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update candidate.');
    }
  };

  const remove = async (candidate) => {
    if (!window.confirm(`Remove ${candidate.candidateName} from the candidate directory?`)) return;
    try {
      await deleteCandidate(candidate.candidateId);
      toast.success('Candidate removed.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove candidate.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">People Management</div>
          <h1>Candidates</h1>
          <p>The candidate directory that interviews and the Schedule Interview wizard are booked against.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body form-grid cols-4">
          <div className="field">
            <label>Candidate name</label>
            <input value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} placeholder="e.g. Priya Nair" />
          </div>
          <div className="field">
            <label>Mobile</label>
            <input value={form.mobileNumber} onChange={(e) => setForm({ ...form, mobileNumber: e.target.value })} placeholder="9876543210" />
          </div>
          <div className="field">
            <label>Experience</label>
            <input value={form.overallExperience} onChange={(e) => setForm({ ...form, overallExperience: e.target.value })} placeholder="e.g. 5+" />
          </div>
          <div className="field">
            <label>Current role</label>
            <input value={form.currentRole} onChange={(e) => setForm({ ...form, currentRole: e.target.value })} placeholder="e.g. Backend Developer" />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="button" disabled={saving} onClick={handleCreate}>
              {saving ? 'Adding...' : '+ Add candidate'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading candidates...</div>}

      {!loading && (
        <div className="card data-card">
          <table>
            <thead><tr><th>Name</th><th>Mobile</th><th>Experience</th><th>Current role</th><th></th></tr></thead>
            <tbody>
              {candidates.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No candidates yet.</td></tr>}
              {candidates.map((c) => (
                editingId === c.candidateId ? (
                  <tr key={c.candidateId}>
                    <td><input value={editForm.candidateName} onChange={(e) => setEditForm({ ...editForm, candidateName: e.target.value })} /></td>
                    <td><input value={editForm.mobileNumber} onChange={(e) => setEditForm({ ...editForm, mobileNumber: e.target.value })} /></td>
                    <td><input value={editForm.overallExperience} onChange={(e) => setEditForm({ ...editForm, overallExperience: e.target.value })} /></td>
                    <td><input value={editForm.currentRole} onChange={(e) => setEditForm({ ...editForm, currentRole: e.target.value })} /></td>
                    <td className="row-actions">
                      <button className="btn btn-primary btn-sm" onClick={() => saveEdit(c.candidateId)}>Save</button>
                      <button className="btn btn-ghost btn-sm" onClick={cancelEdit}>Cancel</button>
                    </td>
                  </tr>
                ) : (
                  <tr key={c.candidateId}>
                    <td><strong>{c.candidateName}</strong></td>
                    <td>{c.mobileNumber || '-'}</td>
                    <td>{c.overallExperience || '-'}</td>
                    <td>{c.currentRole || '-'}</td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => startEdit(c)}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={() => remove(c)}>Remove</button>
                    </td>
                  </tr>
                )
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
