import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  listMyInterviews,
  listMyInterviewHistory,
  downloadInterviewsCsv,
  downloadInterviewsPdf,
  saveBlob,
  listAttachments,
  downloadAttachment
} from '../api/apiClient';
import StatusDonut from '../components/StatusDonut';
import MonthlyBarChart from '../components/MonthlyBarChart';
import DashboardTour from '../components/DashboardTour';
import ResumePreview from '../components/ResumePreview';
import { StatCard, CardHeader } from '../components/DashboardUI';
import { STATUS_BUCKETS, bucketCountsFromInterviews, downloadMonthExcel, downloadStatusExcelFromList } from '../utils/statusExport';
import { PANEL_TOUR } from '../config/dashboardTours';

const DONE_STATUSES = ['SUBMITTED', 'RECOMMENDED', 'CLOSED'];

// Normalizes a recruiter-entered meeting link to an absolute URL so target=_blank opens it
// externally (a bare "meet.google.com/xyz" would otherwise resolve against our own origin).
const joinHref = (link) => {
  if (!link) return null;
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
};

// Long "when" label from scheduled_at (falls back to the plain interview date).
const whenLong = (iv) => {
  if (iv.scheduledAt) {
    const d = new Date(iv.scheduledAt);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
  }
  return iv.interviewDate || 'Date TBC';
};

/**
 * PANEL dashboard — same editorial + bento theme as the other dashboards (.dash-b), built from the
 * panelist's own lists. Open interviews are split by time: those still to conduct show a "Join
 * meeting" button (the recruiter's Zoom/Meet link), those already past/in-progress are the ones
 * awaiting feedback. The status donut is display-only. No backend change — the meeting link already
 * comes back on the panel's interviews.
 */
export default function PanelDashboardPage() {
  const navigate = useNavigate();
  const [awaiting, setAwaiting] = useState([]);
  const [history, setHistory] = useState([]);
  const [downloadingMonth, setDownloadingMonth] = useState(null);
  const [busyStatusKey, setBusyStatusKey] = useState(null); // per-status .xlsx export in flight
  const [resumes, setResumes] = useState({}); // candidateId -> newest CANDIDATE_RESUME attachment | null
  const [previewAtt, setPreviewAtt] = useState(null); // resume attachment currently open in the preview modal
  const [tourOpen, setTourOpen] = useState(false); // narrated "Watch overview" walkthrough
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([listMyInterviews(), listMyInterviewHistory()])
      .then(([a, h]) => {
        setAwaiting(a);
        setHistory(h);
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load your dashboard.'))
      .finally(() => setLoading(false));
  }, []);

  // Best-effort resume lookup for the candidates on the panelist's open interviews (Upcoming +
  // Awaiting feedback both come from `awaiting`). Resumes are attachments on the CANDIDATE record
  // (uploaded as CANDIDATE_RESUME), so one fetch per distinct candidateId, de-duplicated. This is
  // intentionally forgiving: if the file endpoint forbids a panelist (403) or the candidate has no
  // resume, that candidate maps to null and simply shows no resume control — never an error.
  useEffect(() => {
    const ids = [...new Set(awaiting.map((iv) => iv.candidateId).filter((v) => v != null))];
    if (ids.length === 0) {
      setResumes({});
      return undefined;
    }
    let cancelled = false;
    Promise.all(ids.map(async (cid) => {
      try {
        const atts = await listAttachments('CANDIDATE_RESUME', cid);
        // Take the most-recent upload (last in insertion order), matching how the scheduling flow
        // resolves "the candidate's resume".
        const newest = Array.isArray(atts) && atts.length ? atts[atts.length - 1] : null;
        return [cid, newest];
      } catch {
        return [cid, null];
      }
    })).then((pairs) => {
      if (cancelled) return;
      const map = {};
      pairs.forEach(([cid, att]) => { map[cid] = att; });
      setResumes(map);
    });
    return () => { cancelled = true; };
  }, [awaiting]);

  const now = new Date();

  // Split the open interviews: future/now → "to conduct" (Join); past or in-progress → "to review".
  const { upcoming, toReview } = useMemo(() => {
    const nowMs = Date.now();
    const up = [];
    const rev = [];
    awaiting.forEach((iv) => {
      const t = iv.scheduledAt ? new Date(iv.scheduledAt).getTime() : null;
      const needsFeedback = iv.status === 'IN_PROGRESS' || (t !== null && t < nowMs);
      (needsFeedback ? rev : up).push(iv);
    });
    up.sort((a, b) => String(a.scheduledAt || '').localeCompare(String(b.scheduledAt || '')));
    rev.sort((a, b) => String(b.scheduledAt || '').localeCompare(String(a.scheduledAt || '')));
    return { upcoming: up, toReview: rev };
  }, [awaiting]);

  const stats = useMemo(() => {
    const submitted = history.filter((iv) => DONE_STATUSES.includes(iv.status)).length;
    const rated = history.map((iv) => iv.finalRating).filter((r) => r !== null && r !== undefined).map(Number);
    const avg = rated.length ? (rated.reduce((s, r) => s + r, 0) / rated.length) : null;
    const cancelled = history.filter((iv) => iv.status === 'CANCELLED').length;
    return {
      total: history.length,
      submitted,
      avg,
      taken: submitted,
      cancelled,
      others: history.length - submitted - cancelled
    };
  }, [history]);

  const donutBuckets = useMemo(() => {
    const counts = bucketCountsFromInterviews(history);
    return STATUS_BUCKETS.map((b) => ({ ...b, count: counts[b.key] }));
  }, [history]);

  const monthly = useMemo(() => {
    const buckets = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      buckets.push({ month: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, count: 0 });
    }
    const index = new Map(buckets.map((b) => [b.month, b]));
    history.forEach((iv) => {
      if (!iv.scheduledAt) return;
      const d = new Date(iv.scheduledAt);
      const b = index.get(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
      if (b) b.count += 1;
    });
    return buckets;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  const totalThisPeriod = monthly.reduce((s, m) => s + m.count, 0);

  const handleDownload = async () => {
    try {
      const blob = await downloadInterviewsCsv();
      saveBlob(blob, 'my-interviews.csv');
    } catch (e) {
      setError('Could not download the interview list.');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadInterviewsPdf();
      saveBlob(blob, 'my-interviews.pdf');
    } catch (e) {
      setError('Could not download the interview report.');
    }
  };

  const handleMonthExport = async (m) => {
    setDownloadingMonth(m.month);
    setError('');
    try {
      await downloadMonthExcel(m.month);
    } catch (e) {
      setError(`Could not generate the Excel file for ${m.month}.`);
    } finally {
      setDownloadingMonth(null);
    }
  };

  // Per-status .xlsx export built from the panelist's own history (already in memory) — no
  // pipeline-wide list call, so it stays within the panelist's RBAC scope and always matches the donut.
  const handleStatusExport = async (bucket) => {
    if (busyStatusKey) return; // guard against a second export while one is in flight
    setBusyStatusKey(bucket.key);
    setError('');
    try {
      await downloadStatusExcelFromList(bucket, history);
    } catch (e) {
      setError(`Could not generate the Excel file for ${bucket.label}.`);
    } finally {
      setBusyStatusKey(null);
    }
  };

  // View + Download controls for a candidate's resume. Renders nothing when the candidate has no
  // resume on file (or the panelist can't read it). stopPropagation so it never triggers the row's
  // navigate-to-detail click.
  const ResumeActions = ({ candidateId }) => {
    const att = resumes[candidateId];
    if (!att) return null;
    const title = att.originalFilename || 'resume';
    return (
      <span
        style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginRight: 8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setPreviewAtt(att)}
          title={`View ${title}`}
        >
          Resume
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => downloadAttachment(att.attachmentId, att.originalFilename).catch(() => setError('Could not download the resume.'))}
          title={`Download ${title}`}
          aria-label={`Download ${title}`}
        >
          ⤓
        </button>
      </span>
    );
  };

  return (
    <main className="page dash-b">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>My Dashboard</h1>
          <p>Your interview panel activity — what to join next, what needs your feedback, and your history.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-tour hero-action" onClick={() => setTourOpen(true)} disabled={loading} title="Play a narrated walkthrough of this dashboard">▶ Watch overview</button>
          <button className="btn btn-secondary hero-action" onClick={handleDownload}>Download CSV</button>
          <button className="btn btn-secondary hero-action" onClick={handleDownloadPdf}>Download PDF</button>
          <button className="btn btn-primary hero-action" onClick={() => navigate('/my-interviews')}>My Interviews</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading your dashboard…</div>}

      {!loading && (
        <>
          {/* Bento hero: status spotlight (display-only) + editorial KPI cluster. */}
          <div className="hero-bento">
            <section className="hero-spot" data-tour="status">
              <div className="hero-spot-head">
                <h3>Interviews by status</h3>
                <p>Your assigned interviews, by outcome</p>
              </div>
              <StatusDonut buckets={donutBuckets} interactive onSelect={handleStatusExport} busyKey={busyStatusKey} />
            </section>

            <div className="kpi-cluster" data-tour="kpi">
              <StatCard icon="agenda" tone="sky" label="Upcoming to join" value={upcoming.length} sub="Scheduled, still to conduct" />
              <StatCard icon="alert" tone="amber" label="Awaiting my feedback" value={toReview.length} sub="Conducted, not submitted" />
              <StatCard icon="calibration" tone="green" label="Feedback submitted" value={stats.submitted} sub="Completed by me" />
              <StatCard icon="interviews" tone="violet" label="Total assigned" value={stats.total} sub="All my interviews" />
            </div>
          </div>

          {/* Two independent column stacks (masonry, not paired grid rows) — see the
              `.dashboard-col` comment in index.css for why this replaced two separate
              `.dashboard-columns` rows. */}
          <div className="dashboard-columns">
            <div className="dashboard-col">
              <section className="card data-card" data-tour="upcoming">
                <CardHeader
                  icon="agenda"
                  tone="sky"
                  title="Upcoming interviews"
                  subtitle={`${upcoming.length} to conduct — join the meeting when it's time`}
                />
                <div className="card-body">
                  {upcoming.length === 0 && (
                    <div className="empty-state"><div>Nothing scheduled to conduct right now.</div></div>
                  )}
                  {upcoming.slice(0, 6).map((iv) => (
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
                        <div className="muted-cell">{iv.levelOfInterview || '—'} · {whenLong(iv)}</div>
                      </div>
                      <div className="agenda-row-time">
                        <ResumeActions candidateId={iv.candidateId} />
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
                      </div>
                    </div>
                  ))}
                  {upcoming.length > 6 && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/my-interviews')}>
                      View all {upcoming.length}
                    </button>
                  )}
                </div>
              </section>

              <section className="card data-card" data-tour="monthly">
                <CardHeader
                  icon="monthly"
                  tone="violet"
                  title="My Monthly Interviews"
                  subtitle={`Last 6 months · ${totalThisPeriod} interviews`}
                  action={(
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-secondary btn-sm" onClick={handleDownload}>Download CSV</button>
                      <button className="btn btn-secondary btn-sm" onClick={handleDownloadPdf}>Download PDF</button>
                    </div>
                  )}
                />
                <div className="card-body">
                  <MonthlyBarChart monthly={monthly} onSelect={handleMonthExport} busyMonth={downloadingMonth} />
                </div>
              </section>
            </div>

            <div className="dashboard-col">
              <section className="card data-card" data-tour="feedback">
                <CardHeader
                  icon="alert"
                  tone="amber"
                  title="Awaiting my feedback"
                  subtitle={`${toReview.length} conducted interview${toReview.length !== 1 ? 's' : ''} need your feedback`}
                />
                <div className="card-body">
                  {toReview.length === 0 && (
                    <div className="attention-ok">All caught up. No interviews are waiting on your feedback.</div>
                  )}
                  {toReview.slice(0, 6).map((iv) => (
                    <div
                      key={iv.interviewId}
                      className="attention-row"
                      style={{ cursor: 'pointer' }}
                      role="link"
                      tabIndex={0}
                      aria-label={`Add feedback for ${iv.candidateName}`}
                      onClick={() => navigate(`/interviews/${iv.interviewId}/edit`)}
                      onKeyDown={(e) => {
                        if (e.target !== e.currentTarget) return;
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/interviews/${iv.interviewId}/edit`); }
                      }}
                    >
                      <span><strong>{iv.candidateName}</strong> · {iv.levelOfInterview || '—'}<span className="muted-cell"> · {whenLong(iv)}</span></span>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <ResumeActions candidateId={iv.candidateId} />
                        <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}/edit`); }}>
                          {iv.status === 'IN_PROGRESS' ? 'Continue' : 'Add feedback'}
                        </button>
                      </span>
                    </div>
                  ))}
                  {toReview.length > 6 && (
                    <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/my-interviews')}>
                      View all {toReview.length}
                    </button>
                  )}
                </div>
              </section>

              <section className="card data-card" data-tour="summary">
                <CardHeader icon="status" tone="indigo" title="Summary" subtitle="Your interviews at a glance" />
                <div className="card-body">
                  <div className="attention-row"><span>Upcoming to join</span><strong>{upcoming.length}</strong></div>
                  <div className="attention-row"><span>Avg rating I've given</span><strong>{stats.avg != null ? stats.avg.toFixed(1) : '—'}</strong></div>
                  <div className="attention-row"><span>Taken (submitted / concluded)</span><strong>{stats.taken}</strong></div>
                  <div className="attention-row"><span>Cancelled</span><strong>{stats.cancelled}</strong></div>
                  <div className="attention-row"><span>Others (scheduled / in progress)</span><strong>{stats.others}</strong></div>
                </div>
              </section>
            </div>
          </div>
        </>
      )}

      <DashboardTour
        open={tourOpen}
        steps={PANEL_TOUR}
        title="Panel overview"
        onClose={() => setTourOpen(false)}
      />

      <ResumePreview attachment={previewAtt} onClose={() => setPreviewAtt(null)} />
    </main>
  );
}
