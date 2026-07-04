import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInterviews, deleteInterview } from '../api/apiClient';
import RatingBadge from '../components/RatingBadge';
import { useToast } from '../components/layout/ToastProvider';

const STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'RECOMMENDED', 'CLOSED'];
const PAGE_SIZE = 10;

export default function InterviewListPage({ auth }) {
  const toast = useToast();
  const [pageData, setPageData] = useState({ content: [], totalElements: 0, totalPages: 0, page: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const navigate = useNavigate();
  const canManage = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, size: PAGE_SIZE };
      if (levelFilter) params.level = levelFilter;
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await listInterviews(params);
      setPageData(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [levelFilter, statusFilter, search, page]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this interview assessment? This cannot be undone.')) return;
    try {
      await deleteInterview(id);
      toast.success('Assessment deleted.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to delete assessment.');
    }
  };

  const interviews = pageData.content || [];
  const averageRating = (() => {
    const ratings = interviews.map((item) => Number(item.finalRating || 0)).filter(Boolean);
    return ratings.length ? (ratings.reduce((sum, v) => sum + v, 0) / ratings.length).toFixed(1) : '0.0';
  })();

  return (
    <main className="page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Assessment records</h1>
          <p>Track candidate evaluations, panel recommendations, skill ratings, and coding outcomes from one focused workspace.</p>
        </div>
        {canManage && <button className="btn btn-primary hero-action" onClick={() => navigate('/interviews/new')}>+ New assessment</button>}
      </section>

      <section className="metric-grid" aria-label="Assessment summary">
        <div className="metric-card">
          <span>Total records</span>
          <strong>{pageData.totalElements}</strong>
          <small>Matching current filters</small>
        </div>
        <div className="metric-card">
          <span>Average rating (this page)</span>
          <strong>{averageRating}</strong>
          <small>Across {interviews.length} visible record{interviews.length !== 1 ? 's' : ''}</small>
        </div>
        <div className="metric-card">
          <span>Page</span>
          <strong>{pageData.page + 1} / {Math.max(pageData.totalPages, 1)}</strong>
          <small>{PAGE_SIZE} per page</small>
        </div>
      </section>

      <section className="card data-card">
        <div className="card-header">
          <div>
            <h3>Assessment records</h3>
            <p>{interviews.length} record{interviews.length !== 1 ? 's' : ''} on this page</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              placeholder="Search candidate, panel, recruiter…"
              value={search}
              onChange={(e) => { setPage(0); setSearch(e.target.value); }}
              style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '9px 11px', minWidth: 220 }}
            />
            <label className="toolbar-filter">
              <span>Level</span>
              <select value={levelFilter} onChange={(e) => { setPage(0); setLevelFilter(e.target.value); }}>
                <option value="">All levels</option>
                <option value="L1">L1</option>
                <option value="L2">L2</option>
                <option value="L3">L3</option>
                <option value="HR">HR</option>
                <option value="CLIENT">Client</option>
              </select>
            </label>
            <label className="toolbar-filter">
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}>
                <option value="">All statuses</option>
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
              </select>
            </label>
          </div>
        </div>

        {error && <div className="card-body"><div className="error-banner">{error}</div></div>}
        {loading && <div className="loading">Loading assessments...</div>}

        {!loading && interviews.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">IA</div>
            <div>No assessments match these filters.</div>
          </div>
        )}

        {!loading && interviews.length > 0 && (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Level</th>
                    <th>Status</th>
                    <th>Panel member</th>
                    <th>Date</th>
                    <th>Final rating</th>
                    <th>Recommendation</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {interviews.map((iv) => (
                    <tr key={iv.interviewId} className="clickable" onClick={() => navigate(`/interviews/${iv.interviewId}`)}>
                      <td><strong>{iv.candidateName}</strong><br /><span className="muted-cell">{iv.currentRole || '-'}</span></td>
                      <td><span className="pill">{iv.levelOfInterview || '-'}</span></td>
                      <td><span className={`status-chip status-${(iv.status || '').toLowerCase()}`}>{(iv.status || '-').replace('_', ' ')}</span></td>
                      <td>{iv.panelMemberName || '-'}</td>
                      <td>{iv.interviewDate || '-'}</td>
                      <td><RatingBadge value={iv.finalRating} /></td>
                      <td>{iv.panelRecommendation || '-'}</td>
                      <td className="row-actions">
                        {canManage && <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}/edit`); }}>Edit</button>}
                        {canManage && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={(e) => handleDelete(e, iv.interviewId)}>Delete</button>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Previous</button>
              <span>Page {pageData.page + 1} of {Math.max(pageData.totalPages, 1)}</span>
              <button className="btn btn-ghost btn-sm" disabled={page + 1 >= pageData.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
