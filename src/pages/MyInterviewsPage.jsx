import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { listMyInterviews } from '../api/apiClient';
import { StatCard, CardHeader } from '../components/DashboardUI';

// Normalize a recruiter-entered meeting link to an absolute URL so target=_blank opens it externally.
const joinHref = (link) => {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
};

const whenLong = (iv) => {
  if (iv.scheduledAt) {
    const d = new Date(iv.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return iv.interviewDate || 'Date TBC';
};

const whenShort = (iv) => {
  if (iv.scheduledAt) {
    const d = new Date(iv.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return iv.interviewDate || '—';
};

/**
 * Panel WORKSPACE — "what do I need to do?". The panelist's open interviews split by time:
 * upcoming ones to conduct (with a Join meeting button) and conducted ones awaiting feedback.
 * Deliberately action-first (buttons, no ratings) — distinct from My Interview History, which is
 * the read-only record with outcomes.
 */
export default function MyInterviewsPage() {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listMyInterviews()
      .then(setInterviews)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load your interviews.'))
      .finally(() => setLoading(false));
  }, []);

  const { upcoming, toReview, inProgress } = useMemo(() => {
    const nowMs = Date.now();
    const up = [];
    const rev = [];
    interviews.forEach((iv) => {
      const t = iv.scheduledAt ? new Date(iv.scheduledAt).getTime() : null;
      const needsFeedback = iv.status === 'IN_PROGRESS' || (t !== null && t < nowMs);
      (needsFeedback ? rev : up).push(iv);
    });
    up.sort((a, b) => String(a.scheduledAt || '').localeCompare(String(b.scheduledAt || '')));
    rev.sort((a, b) => String(b.scheduledAt || '').localeCompare(String(a.scheduledAt || '')));
    return { upcoming: up, toReview: rev, inProgress: interviews.filter((iv) => iv.status === 'IN_PROGRESS').length };
  }, [interviews]);

  const nextUp = upcoming[0];

  return (
    <main className="page dash-b">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">My workspace</div>
          <h1>My Interviews</h1>
          <p>Your active interview workload — join upcoming sessions, and submit feedback on the ones you've conducted.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-secondary hero-action" onClick={() => navigate('/my-interview-history')}>View history</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading your interviews…</div>}

      {!loading && !error && (
        <>
          <section className="stat-grid" aria-label="Workload summary">
            <StatCard label="Upcoming to join" value={upcoming.length} sub="Scheduled, still to conduct" />
            <StatCard label="Awaiting my feedback" value={toReview.length} sub="Conducted, not submitted" />
            <StatCard label="In progress" value={inProgress} sub="Feedback drafts started" />
            <StatCard label="Next up" value={nextUp ? whenShort(nextUp) : '—'} sub={nextUp ? nextUp.candidateName : 'Nothing scheduled'} />
          </section>

          <section className="card data-card">
            <CardHeader
              title="Upcoming interviews"
              subtitle={`${upcoming.length} to conduct — join the meeting when it's time`}
            />
            <div className="card-body">
              {upcoming.length === 0 && (
                <div className="empty-state"><div>Nothing scheduled to conduct right now.</div></div>
              )}
              {upcoming.map((iv) => (
                <div
                  key={iv.interviewId}
                  className="agenda-row"
                  role="link"
                  tabIndex={0}
                  aria-label={`View interview for ${iv.candidateName}`}
                  onClick={() => navigate(`/interviews/${iv.interviewId}`)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/interviews/${iv.interviewId}`); }
                  }}
                >
                  <div>
                    <strong>{iv.candidateName}</strong>
                    <div className="muted-cell">
                      {iv.currentRole ? `${iv.currentRole} · ` : ''}{iv.levelOfInterview || '—'} · {whenLong(iv)}
                    </div>
                  </div>
                  <div className="agenda-row-time">
                    {iv.meetingLink ? (
                      <a
                        className="btn btn-join btn-sm"
                        href={joinHref(iv.meetingLink)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Open the meeting link in a new tab"
                      >
                        Join meeting
                      </a>
                    ) : (
                      <span className="status-chip status-scheduled">{iv.modeOfInterview ? iv.modeOfInterview.replace('_', ' ') : 'No link yet'}</span>
                    )}
                    <button
                      className="btn btn-ghost btn-sm"
                      onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}/edit`); }}
                    >
                      Feedback
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card data-card">
            <CardHeader
              title="Awaiting my feedback"
              subtitle={`${toReview.length} conducted interview${toReview.length !== 1 ? 's' : ''} need your assessment`}
            />
            <div className="card-body">
              {toReview.length === 0 && (
                <div className="attention-ok">All caught up. No interviews are waiting on your feedback.</div>
              )}
              {toReview.map((iv) => (
                <div key={iv.interviewId} className="attention-row" style={{ cursor: 'pointer' }} onClick={() => navigate(`/interviews/${iv.interviewId}/edit`)}>
                  <span>
                    <strong>{iv.candidateName}</strong> · {iv.levelOfInterview || '—'}
                    <span className="muted-cell"> · {whenLong(iv)}</span>
                  </span>
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}/edit`); }}>
                    {iv.status === 'IN_PROGRESS' ? 'Continue feedback' : 'Add feedback'}
                  </button>
                </div>
              ))}
            </div>
          </section>

          {interviews.length === 0 && (
            <section className="card data-card">
              <div className="empty-state">
                <div>No interviews are currently assigned to you.</div>
                <small style={{ color: 'var(--ink-muted)' }}>
                  This list only shows candidates from interview slots booked under your interviewer profile.
                  If you're expecting to see one here, check with your recruiter that the slot was booked using
                  the same email address as your login.
                </small>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
