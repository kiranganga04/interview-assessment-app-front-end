import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listMyInterviewHistory } from '../api/apiClient';
import { StatCard, CardHeader } from '../components/DashboardUI';
import RatingBadge from '../components/RatingBadge';

const DONE_STATUSES = ['SUBMITTED', 'RECOMMENDED', 'CLOSED'];

const whenShort = (iv) => {
  if (iv.scheduledAt) {
    const d = new Date(iv.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' });
  }
  return iv.interviewDate || '—';
};

/**
 * Panel RECORD — "what have I done?". A read-only, searchable and filterable archive of every
 * interview the panelist has been assigned, with its outcome (status, final rating, recommendation).
 * Retrospective and analytics-flavoured — distinct from My Interviews, the action workspace.
 */
export default function MyInterviewHistoryPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [levelFilter, setLevelFilter] = useState('');

  useEffect(() => {
    listMyInterviewHistory()
      .then(setInterviews)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load your interview history.'))
      .finally(() => setLoading(false));
  }, []);

  const kpis = useMemo(() => {
    const submitted = interviews.filter((iv) => DONE_STATUSES.includes(iv.status)).length;
    const recommended = interviews.filter((iv) => iv.status === 'RECOMMENDED').length;
    const rated = interviews.map((iv) => iv.finalRating).filter((r) => r !== null && r !== undefined).map(Number);
    const avg = rated.length ? (rated.reduce((s, r) => s + r, 0) / rated.length) : null;
    return { total: interviews.length, submitted, recommended, avg };
  }, [interviews]);

  const statuses = useMemo(() => [...new Set(interviews.map((iv) => iv.status).filter(Boolean))].sort(), [interviews]);
  const levels = useMemo(() => [...new Set(interviews.map((iv) => iv.levelOfInterview).filter(Boolean))].sort(), [interviews]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return interviews.filter((iv) => {
      if (statusFilter && iv.status !== statusFilter) return false;
      if (levelFilter && iv.levelOfInterview !== levelFilter) return false;
      if (q && !(`${iv.candidateName || ''} ${iv.currentRole || ''} ${iv.position || ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [interviews, search, statusFilter, levelFilter]);

  return (
    <main className="page dash-b">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">My record</div>
          <h1>My Interview History</h1>
          <p>Every interview you've been assigned, across all statuses — your complete panel record with outcomes and ratings.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary hero-action" onClick={() => navigate('/my-interviews')}>Back to workspace</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading your interview history…</div>}

      {!loading && !error && (
        <>
          <section className="stat-grid" aria-label="History summary">
            <StatCard label="Total interviews" value={kpis.total} sub="On your record" />
            <StatCard label="Feedback submitted" value={kpis.submitted} sub="Completed by me" />
            <StatCard label="Avg rating I've given" value={kpis.avg != null ? kpis.avg.toFixed(1) : '—'} sub="Across rated interviews" />
            <StatCard label="Recommended" value={kpis.recommended} sub="Moved to recommended" />
          </section>

          <section className="card data-card">
            <CardHeader
              title="All my interviews"
              subtitle={`${filtered.length} of ${interviews.length} shown`}
              action={
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    placeholder="Search candidate…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '8px 11px', minWidth: 180 }}
                  />
                  <label className="toolbar-filter">
                    <span>Status</span>
                    <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                      <option value="">All</option>
                      {statuses.map((s) => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                    </select>
                  </label>
                  <label className="toolbar-filter">
                    <span>Level</span>
                    <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
                      <option value="">All</option>
                      {levels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </label>
                </div>
              }
            />

            {interviews.length === 0 && (
              <div className="empty-state">
                <div>You don't have any interviews on record yet.</div>
                <small style={{ color: 'var(--ink-muted)' }}>
                  This history only shows interviews from slots booked under your interviewer profile.
                </small>
              </div>
            )}

            {interviews.length > 0 && filtered.length === 0 && (
              <div className="empty-state"><div>No interviews match these filters.</div></div>
            )}

            {filtered.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Candidate</th>
                      <th>Level</th>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Final rating</th>
                      <th>Recommendation</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((iv) => (
                      <tr
                        key={iv.interviewId}
                        className="clickable"
                        tabIndex={0}
                        role="link"
                        aria-label={`View interview for ${iv.candidateName}`}
                        onClick={() => navigate(`/interviews/${iv.interviewId}`)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/interviews/${iv.interviewId}`); }
                        }}
                      >
                        <td><strong>{iv.candidateName}</strong><br /><span className="muted-cell">{iv.currentRole || '—'}</span></td>
                        <td><span className="pill">{iv.levelOfInterview || '—'}</span></td>
                        <td>{whenShort(iv)}</td>
                        <td><span className={`status-chip status-${(iv.status || '').toLowerCase()}`}>{(iv.status || '-').replace('_', ' ')}</span></td>
                        <td><RatingBadge value={iv.finalRating} /></td>
                        <td>{iv.panelRecommendation || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
