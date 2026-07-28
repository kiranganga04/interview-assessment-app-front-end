import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getDashboardSummary,
  getTodaysAgenda,
  getMonthlyInterviewsReport,
  listInterviews,
  downloadInterviewsCsv,
  downloadInterviewsPdf,
  saveBlob
} from '../api/apiClient';
import StatusDonut from '../components/StatusDonut';
import MonthlyBarChart from '../components/MonthlyBarChart';
import DashboardTour from '../components/DashboardTour';
import { StatCard, CardHeader } from '../components/DashboardUI';
import { STATUS_BUCKETS, bucketCountsFromSummary, downloadStatusExcel, downloadMonthExcel } from '../utils/statusExport';
import { RECRUITER_TOUR } from '../config/dashboardTours';

// Interviews whose interviewDate falls within the next `days` days (inclusive of today).
const withinDays = (dateStr, days) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const horizon = new Date(today);
  horizon.setDate(horizon.getDate() + days);
  return d >= today && d <= horizon;
};

// A still-SCHEDULED interview whose time is already in the past — matches the backend's overdueCount
// (scheduled_at < now). Falls back to interviewDate when there's no precise scheduled time.
const isOverdue = (iv) => {
  const raw = iv.scheduledAt || iv.interviewDate;
  if (!raw) return false;
  const d = new Date(raw);
  return !Number.isNaN(d.getTime()) && d < new Date();
};

const whenText = (iv) => {
  if (iv.scheduledAt) {
    const d = new Date(iv.scheduledAt);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
  return iv.interviewDate || '—';
};

/**
 * RECRUITER Dashboard Overview — same "editorial + bento" theme as Admin (.dash-b): editorial
 * foundation with a gradient status spotlight up top. Every number is RBAC-scoped to the recruiter.
 */
export default function RecruiterDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [actionNeeded, setActionNeeded] = useState([]); // SUBMITTED: panel done, recruiter to decide
  const [upcoming, setUpcoming] = useState([]); // SCHEDULED within the next 7 days
  const [overdue, setOverdue] = useState([]); // SCHEDULED but already past due
  const [downloading, setDownloading] = useState(null); // bucket key currently exporting
  const [downloadingMonth, setDownloadingMonth] = useState(null); // month key currently exporting
  const [tourOpen, setTourOpen] = useState(false); // narrated "Watch overview" walkthrough
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getTodaysAgenda(),
      getMonthlyInterviewsReport(6),
      listInterviews({ page: 0, size: 100, status: 'SUBMITTED' }).catch(() => ({ content: [] })),
      listInterviews({ page: 0, size: 100, status: 'SCHEDULED' }).catch(() => ({ content: [] }))
    ])
      .then(([s, a, m, submitted, scheduled]) => {
        setSummary(s);
        setAgenda(a);
        setMonthly(m);
        setActionNeeded(submitted.content || []);
        const sched = scheduled.content || [];
        setUpcoming(sched.filter((iv) => withinDays(iv.interviewDate, 7)));
        setOverdue(
          sched
            .filter(isOverdue)
            .sort((x, y) => String(x.scheduledAt || x.interviewDate).localeCompare(String(y.scheduledAt || y.interviewDate)))
        );
      })
      .catch((e) =>
        setError(e?.response?.data?.message || 'Failed to load dashboard. (Reports are only available to Admin/Recruiter roles.)')
      );
  }, []);

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

  const donutBuckets = STATUS_BUCKETS.map((b) => ({ ...b, count: bucketCountsFromSummary(summary)[b.key] }));
  const handleStatusExport = async (bucket) => {
    setDownloading(bucket.key);
    setError('');
    try {
      await downloadStatusExcel(bucket);
    } catch (e) {
      setError(`Could not generate the Excel file for ${bucket.label}.`);
    } finally {
      setDownloading(null);
    }
  };

  const totalThisPeriod = monthly.reduce((sum, m) => sum + m.count, 0);

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

  const needsAttention = summary
    ? [
        { label: 'Awaiting panel feedback', count: summary.pendingFeedbackCount, ok: 'No pending feedback' },
        { label: 'Overdue reviews', count: summary.overdueCount, ok: 'No overdue reviews' }
      ]
    : [];
  const allCaughtUp = needsAttention.every((item) => !item.count);

  return (
    <main className="page dash-b">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>My Pipeline</h1>
          <p>Your interview pipeline — what's scheduled, what needs a decision, and what's waiting on feedback.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-tour hero-action" onClick={() => setTourOpen(true)} disabled={!summary} title="Play a narrated walkthrough of this dashboard">▶ Watch overview</button>
          <button className="btn btn-secondary hero-action" onClick={handleDownload}>Download CSV</button>
          <button className="btn btn-secondary hero-action" onClick={handleDownloadPdf}>Download PDF</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {/* Quick actions — the recruiter's most common next steps. */}
      <section className="quick-actions" aria-label="Quick actions">
        <button className="quick-action" onClick={() => navigate('/interviews/new')}>
          <span className="quick-action-icon">＋</span><span>New assessment</span>
        </button>
        <button className="quick-action" onClick={() => navigate('/candidates')}>
          <span className="quick-action-icon">👤</span><span>Candidates</span>
        </button>
        <button className="quick-action" onClick={() => navigate('/interview-slots/bulk-import')}>
          <span className="quick-action-icon">⬆</span><span>Bulk-import slots</span>
        </button>
      </section>

      {/* Bento hero: gradient status spotlight (donut) + editorial KPI cluster. */}
      {summary && (
        <div className="hero-bento">
          <section className="hero-spot" data-tour="status">
            <div className="hero-spot-head">
              <h3>Interviews by status</h3>
              <p>Click a status to export its interviews to Excel</p>
            </div>
            <StatusDonut buckets={donutBuckets} onSelect={handleStatusExport} busyKey={downloading} />
          </section>

          <div className="kpi-cluster" data-tour="kpi">
            <StatCard icon="interviews" tone="sky" label="My interviews" value={summary.totalInterviews} sub="Created or assigned to me" />
            <StatCard icon="today" tone="amber" label="Today" value={summary.todaysInterviewCount} sub="Scheduled today" />
            <StatCard icon="alert" tone="violet" label="Awaiting feedback" value={summary.pendingFeedbackCount} sub="Panel yet to conclude" />
            <StatCard icon="alert" tone="red" label="Overdue" value={summary.overdueCount} sub="Past date, not concluded" />
          </div>
        </div>
      )}

      {/* Two independent column stacks (masonry, not paired grid rows) — see the `.dashboard-col`
          comment in index.css for why this replaced three separate `.dashboard-columns` rows. */}
      <div className="dashboard-columns">
        <div className="dashboard-col">
          <section className="card data-card">
            <CardHeader icon="alert" tone="amber" title="Needs Attention" subtitle="Pending feedback & overdue actions" />
            <div className="card-body">
              {allCaughtUp ? (
                <div className="attention-ok">All caught up. Nothing needs your attention right now.</div>
              ) : (
                needsAttention.filter((i) => i.count > 0).map((item) => (
                  <div key={item.label} className="attention-row"><span>{item.label}</span><strong className="val-danger">{item.count}</strong></div>
                ))
              )}
              {needsAttention.filter((i) => !i.count).map((item) => (
                <div key={item.label} className="attention-row ok"><span>✓</span> {item.ok}</div>
              ))}
            </div>
          </section>

          <section className="card data-card" data-tour="overdue">
            <CardHeader
              icon="alert"
              tone="red"
              title="Overdue"
              subtitle={`${overdue.length} scheduled interview${overdue.length !== 1 ? 's' : ''} past their date`}
            />
            <div className="card-body">
              {overdue.length === 0 ? (
                <div className="attention-ok">No overdue interviews — you're on track.</div>
              ) : (
                overdue.slice(0, 6).map((iv) => (
                  <div
                    key={iv.interviewId}
                    className="attention-row"
                    style={{ cursor: 'pointer' }}
                    role="link"
                    tabIndex={0}
                    aria-label={`Open interview for ${iv.candidateName}`}
                    onClick={() => navigate(`/interviews/${iv.interviewId}`)}
                    onKeyDown={(e) => {
                      if (e.target !== e.currentTarget) return;
                      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/interviews/${iv.interviewId}`); }
                    }}
                  >
                    <span>
                      <strong>{iv.candidateName}</strong> · {iv.levelOfInterview || '—'}
                      <span className="muted-cell"> · due {whenText(iv)}</span>
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}`); }}>Open</button>
                  </div>
                ))
              )}
              {overdue.length > 6 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/interviews?status=SCHEDULED')}>
                  View all {overdue.length}
                </button>
              )}
            </div>
          </section>

          <section className="card data-card" data-tour="agenda">
            <CardHeader icon="agenda" tone="sky" title="Today's Agenda" subtitle={`${agenda.length} scheduled today`} />
            <div className="card-body">
              {agenda.length === 0 && (
                <div className="empty-state"><div>No interviews scheduled today. A clear day — a good time to plan ahead.</div></div>
              )}
              {agenda.slice(0, 6).map((item) => (
                <Link key={item.interviewId} to={`/interviews/${item.interviewId}`} className="agenda-row">
                  <div>
                    <strong>{item.candidateName}</strong>
                    <div className="muted-cell">{item.interviewerOrPanelName || '—'} · {item.modeOfInterview || '—'}</div>
                  </div>
                  <div className="agenda-row-time">
                    {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                    <span className={`status-chip status-${(item.status || '').toLowerCase()}`}>{(item.status || '-').replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
              {agenda.length > 6 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/interviews')}>
                  View all {agenda.length}
                </button>
              )}
            </div>
          </section>
        </div>

        <div className="dashboard-col">
          <section className="card data-card" data-tour="decision">
            <CardHeader
              icon="calibration"
              tone="green"
              title="Ready for your decision"
              subtitle={`${actionNeeded.length} assessment${actionNeeded.length !== 1 ? 's' : ''} submitted by the panel`}
            />
            <div className="card-body">
              {actionNeeded.length === 0 && (
                <div className="attention-ok">Nothing waiting on a recommendation right now.</div>
              )}
              {actionNeeded.slice(0, 6).map((iv) => (
                <div
                  key={iv.interviewId}
                  className="attention-row"
                  style={{ cursor: 'pointer' }}
                  role="link"
                  tabIndex={0}
                  aria-label={`Review interview for ${iv.candidateName}`}
                  onClick={() => navigate(`/interviews/${iv.interviewId}`)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/interviews/${iv.interviewId}`); }
                  }}
                >
                  <span><strong>{iv.candidateName}</strong> · {iv.levelOfInterview || '—'} · {iv.panelMemberName || '—'}</span>
                  <button className="btn btn-primary btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}`); }}>Review</button>
                </div>
              ))}
              {actionNeeded.length > 6 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/interviews?status=SUBMITTED')}>
                  View all {actionNeeded.length}
                </button>
              )}
            </div>
          </section>

          <section className="card data-card" data-tour="upcoming">
            <CardHeader icon="agenda" tone="sky" title="Upcoming this week" subtitle={`${upcoming.length} scheduled in the next 7 days`} />
            <div className="card-body">
              {upcoming.length === 0 && (
                <div className="empty-state"><div>Nothing scheduled in the next 7 days.</div></div>
              )}
              {upcoming.slice(0, 6).map((iv) => (
                <Link key={iv.interviewId} to={`/interviews/${iv.interviewId}`} className="agenda-row">
                  <div>
                    <strong>{iv.candidateName}</strong>
                    <div className="muted-cell">{iv.panelMemberName || '—'} · {iv.levelOfInterview || '—'}</div>
                  </div>
                  <div className="agenda-row-time">
                    {iv.interviewDate || '—'}
                    <span className={`status-chip status-${(iv.status || '').toLowerCase()}`}>{(iv.status || '-').replace('_', ' ')}</span>
                  </div>
                </Link>
              ))}
              {upcoming.length > 6 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/interviews?status=SCHEDULED')}>
                  View all {upcoming.length}
                </button>
              )}
            </div>
          </section>

          <section className="card data-card" data-tour="monthly">
            <CardHeader
              icon="monthly"
              tone="violet"
              title="Monthly Interviews"
              subtitle={`Last ${monthly.length} months · ${totalThisPeriod} total`}
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
      </div>

      <DashboardTour
        open={tourOpen}
        steps={RECRUITER_TOUR}
        title="Recruiter overview"
        onClose={() => setTourOpen(false)}
      />
    </main>
  );
}
