import React, { useEffect, useState } from 'react';
import { searchCandidates, createCandidate, updateCandidate, deleteCandidate } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';
import { useConfirm } from '../components/layout/ConfirmDialog';
import { CardHeader } from '../components/DashboardUI';

const EMPTY_FORM = { candidateName: '', email: '', mobileNumber: '', overallExperience: '', currentRole: '' };
const PAGE_SIZE = 10;

/**
 * People Management: candidate directory (list + add + edit + remove). Search/filter/sort/
 * pagination are all server-side (page/size/sort + search/emailFilter query params against
 * GET /api/candidates/search), mirroring the same PageResponse pattern the Assessment records
 * list already uses -- separate from the plain listCandidates() used by the candidate picker
 * dropdown elsewhere in the app, so this directory table isn't limited by that endpoint's
 * unpaginated 500-row cap.
 */
export default function CandidatesPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pageData, setPageData] = useState({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [search, setSearch] = useState('');
  const [emailFilter, setEmailFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('candidateName');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(0);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };
  const sortArrow = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const load = () => {
    setLoading(true);
    setError('');
    const params = { page, size: PAGE_SIZE, sort: `${sortKey},${sortDir}` };
    if (search.trim()) params.search = search.trim();
    if (emailFilter !== 'ALL') params.emailFilter = emailFilter;
    searchCandidates(params)
      .then(setPageData)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load candidates.'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [page, search, emailFilter, sortKey, sortDir]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.candidateName.trim()) {
      toast.error('Candidate name is required.');
      return;
    }
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
      email: candidate.email || '',
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
    if (!editForm.candidateName.trim()) {
      toast.error('Candidate name is required.');
      return;
    }
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
    const ok = await confirm({
      title: 'Remove this candidate?',
      message: `${candidate.candidateName} will be removed from the candidate directory. Any interviews already scheduled for them are not affected.`,
      confirmLabel: 'Remove candidate',
      tone: 'danger'
    });
    if (!ok) return;
    try {
      await deleteCandidate(candidate.candidateId);
      toast.success('Candidate removed.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove candidate.');
    }
  };

  const candidates = pageData.content || [];
  const hasActiveFilter = Boolean(search.trim()) || emailFilter !== 'ALL';

  return (
    <div className="page dash-b">
      <div className="page-header">
        <div>
          <div className="eyebrow">People Management</div>
          <h1>Candidates</h1>
          <p>The candidate directory that interviews and the Schedule Interview wizard are booked against. An email is required before a candidate can be scheduled, so they can receive the interview confirmation.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <CardHeader icon="plus" tone="indigo" title="Add a candidate" subtitle="They'll appear in the directory below immediately." />
        <div className="card-body form-grid cols-4">
          <div className="field">
            <label>Candidate name</label>
            <input required value={form.candidateName} onChange={(e) => setForm({ ...form, candidateName: e.target.value })} placeholder="e.g. Priya Nair" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="candidate@example.com" />
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
          <CardHeader
            icon="candidates"
            tone="sky"
            title="Candidate directory"
            subtitle={`${pageData.totalElements} candidate${pageData.totalElements !== 1 ? 's' : ''} on file`}
          />
          <div className="card-body form-grid cols-4" style={{ paddingBottom: 0 }}>
            <div className="field span-2">
              <label>Search</label>
              <input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder="Search name, email, mobile, role..." />
            </div>
            <div className="field">
              <label>Email</label>
              <select value={emailFilter} onChange={(e) => { setPage(0); setEmailFilter(e.target.value); }}>
                <option value="ALL">All</option>
                <option value="HAS_EMAIL">Email on file</option>
                <option value="NO_EMAIL">Missing email</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" aria-sort={sortKey === 'candidateName' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('candidateName')}>Name{sortArrow('candidateName')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'email' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('email')}>Email{sortArrow('email')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'mobileNumber' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('mobileNumber')}>Mobile{sortArrow('mobileNumber')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'overallExperience' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('overallExperience')}>Experience{sortArrow('overallExperience')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'currentRole' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('currentRole')}>Current role{sortArrow('currentRole')}</button></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {candidates.length === 0 && (
                  <tr>
                    <td colSpan={6} className="table-empty-row">
                      {hasActiveFilter ? 'No candidates match your search/filter.' : 'No candidates yet — add one above to get started.'}
                    </td>
                  </tr>
                )}
                {candidates.map((c) => (
                  editingId === c.candidateId ? (
                    <tr key={c.candidateId}>
                      <td><input required value={editForm.candidateName} onChange={(e) => setEditForm({ ...editForm, candidateName: e.target.value })} /></td>
                      <td><input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} placeholder="candidate@example.com" /></td>
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
                      <td>{c.email || <span style={{ color: 'var(--r1)' }}>No email on file</span>}</td>
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
          {pageData.totalElements > 0 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Previous</button>
              <span>Page {pageData.page + 1} of {Math.max(pageData.totalPages, 1)} · {pageData.totalElements} candidate{pageData.totalElements !== 1 ? 's' : ''}</span>
              <button className="btn btn-ghost btn-sm" disabled={page + 1 >= pageData.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
