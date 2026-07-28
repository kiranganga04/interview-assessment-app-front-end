import React, { useEffect, useState } from 'react';
import { searchInterviewers, createInterviewer, updateInterviewer, deleteInterviewer } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';
import { useConfirm } from '../components/layout/ConfirmDialog';
import { CardHeader } from '../components/DashboardUI';

const EMPTY_FORM = { fullName: '', email: '', contactNumber: '', account: '', grade: '', levelCapability: '', skillSet: '' };
const PAGE_SIZE = 10;

/**
 * People Management (admin/recruiter-only): the bookable interviewer directory that Interview
 * Slots hang off of. Search/filter/sort/pagination are all server-side (page/size/sort +
 * search/status query params against GET /api/interviewers/search), mirroring the same
 * PageResponse pattern the Assessment records list already uses -- only one page of rows is
 * ever transferred, and sorting is applied to the whole directory, not just the current page.
 */
export default function InterviewersPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const [pageData, setPageData] = useState({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('fullName');
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
    if (statusFilter !== 'ALL') params.status = statusFilter;
    searchInterviewers(params)
      .then(setPageData)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load interviewers.'))
      .finally(() => setLoading(false));
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [page, search, statusFilter, sortKey, sortDir]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim()) {
      toast.error('Full name and email are required.');
      return;
    }
    setSaving(true);
    try {
      await createInterviewer(form);
      setForm(EMPTY_FORM);
      toast.success(`${form.fullName} added to the interviewer directory.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add interviewer.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (interviewer) => {
    try {
      await updateInterviewer(interviewer.interviewerId, { ...interviewer, active: !interviewer.active });
      toast.success(`${interviewer.fullName} ${interviewer.active ? 'deactivated' : 'reactivated'}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update interviewer.');
    }
  };

  const remove = async (interviewer) => {
    const ok = await confirm({
      title: 'Remove this interviewer?',
      message: `${interviewer.fullName} will be removed from the interviewer directory.`,
      confirmLabel: 'Remove interviewer',
      tone: 'danger'
    });
    if (!ok) return;
    try {
      await deleteInterviewer(interviewer.interviewerId);
      toast.success('Interviewer removed.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove interviewer.');
    }
  };

  const interviewers = pageData.content || [];
  const hasActiveFilter = Boolean(search.trim()) || statusFilter !== 'ALL';

  return (
    <div className="page dash-b">
      <div className="page-header">
        <div>
          <div className="eyebrow">People Management</div>
          <h1>Interviewers</h1>
          <p>The bookable directory of people who conduct interviews — Interview Slots hang off of these records.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <CardHeader icon="plus" tone="indigo" title="Add an interviewer" subtitle="They become bookable for Interview Slots right away." />
        <div className="card-body form-grid cols-4">
          <div className="field">
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Priya Sharma" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
          </div>
          <div className="field">
            <label>Contact number</label>
            <input value={form.contactNumber} onChange={(e) => setForm({ ...form, contactNumber: e.target.value })} placeholder="9876543210" />
          </div>
          <div className="field">
            <label>Account</label>
            <input value={form.account} onChange={(e) => setForm({ ...form, account: e.target.value })} placeholder="Client account" />
          </div>
          <div className="field">
            <label>Grade</label>
            <input value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })} placeholder="e.g. Senior Consultant" />
          </div>
          <div className="field">
            <label>Level capability</label>
            <input value={form.levelCapability} onChange={(e) => setForm({ ...form, levelCapability: e.target.value })} placeholder="e.g. L1/L2" />
          </div>
          <div className="field">
            <label>Skill set</label>
            <input value={form.skillSet} onChange={(e) => setForm({ ...form, skillSet: e.target.value })} placeholder="e.g. Java, React" />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="button" disabled={saving} onClick={handleCreate}>
              {saving ? 'Adding...' : '+ Add interviewer'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading interviewers...</div>}

      {!loading && (
        <div className="card data-card">
          <CardHeader
            icon="interviewers"
            tone="sky"
            title="Interviewer directory"
            subtitle={`${pageData.totalElements} interviewer${pageData.totalElements !== 1 ? 's' : ''} on file`}
          />
          <div className="card-body form-grid cols-4" style={{ paddingBottom: 0 }}>
            <div className="field span-2">
              <label>Search</label>
              <input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder="Search name, email, account, skills..." />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}>
                <option value="ALL">All</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" aria-sort={sortKey === 'fullName' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('fullName')}>Name{sortArrow('fullName')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'email' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('email')}>Email{sortArrow('email')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'account' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('account')}>Account{sortArrow('account')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'grade' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('grade')}>Grade{sortArrow('grade')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'levelCapability' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('levelCapability')}>Level{sortArrow('levelCapability')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'skillSet' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('skillSet')}>Skills{sortArrow('skillSet')}</button></th>
                  <th className="sortable" aria-sort={sortKey === 'active' ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}><button type="button" className="th-sort-btn" onClick={() => toggleSort('active')}>Status{sortArrow('active')}</button></th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {interviewers.length === 0 && (
                  <tr>
                    <td colSpan={8} className="table-empty-row">
                      {hasActiveFilter ? 'No interviewers match your search/filter.' : 'No interviewers yet — add one above to get started.'}
                    </td>
                  </tr>
                )}
                {interviewers.map((iv) => (
                  <tr key={iv.interviewerId}>
                    <td><strong>{iv.fullName}</strong></td>
                    <td>{iv.email}</td>
                    <td>{iv.account || '-'}</td>
                    <td>{iv.grade || '-'}</td>
                    <td>{iv.levelCapability || '-'}</td>
                    <td>{iv.skillSet || '-'}</td>
                    <td><span className="pill">{iv.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(iv)}>{iv.active ? 'Deactivate' : 'Activate'}</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={() => remove(iv)}>Remove</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pageData.totalElements > 0 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Previous</button>
              <span>Page {pageData.page + 1} of {Math.max(pageData.totalPages, 1)} · {pageData.totalElements} interviewer{pageData.totalElements !== 1 ? 's' : ''}</span>
              <button className="btn btn-ghost btn-sm" disabled={page + 1 >= pageData.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
