import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  getDashboardSummary,
  getTodaysAgenda,
  getMonthlyInterviewsReport,
  getPanelistCalibrationReport,
  listUsers,
  listInterviewers,
  listActiveSkills,
  listAllSkills,
  getRecruiterWorkload,
  getDataHygiene,
  downloadInterviewsCsv,
  downloadInterviewsPdf,
  saveBlob
} from '../api/apiClient';
import StatusDonut from '../components/StatusDonut';
import MonthlyBarChart from '../components/MonthlyBarChart';
import DashboardTour from '../components/DashboardTour';
import { StatCard, CardHeader } from '../components/DashboardUI';
import { STATUS_BUCKETS, bucketCountsFromSummary, downloadStatusExcel, downloadMonthExcel } from '../utils/statusExport';
import { ADMIN_TOUR } from '../config/dashboardTours';

// A panelist is a calibration outlier when their average final rating deviates from the overall
// average by at least this much (1-5 scale).
const OUTLIER_THRESHOLD = 0.5;

/**
 * ADMIN Dashboard Overview — "editorial + bento" theme (scoped by .dash-b): an editorial, serif,
 * hairline foundation with one rich gradient spotlight up top where the status donut glows, beside
 * a seamless KPI cluster. Status counts live only in the donut; everything stays consistent.
 */
export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [calibration, setCalibration] = useState([]);
  const [users, setUsers] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [activeSkills, setActiveSkills] = useState([]);
  const [allSkills, setAllSkills] = useState([]);
  const [workload, setWorkload] = useState(null); // null = endpoint not deployed yet
  const [hygiene, setHygiene] = useState(null); // backend-only orphan metrics
  const [downloading, setDownloading] = useState(null); // bucket key currently exporting
  const [downloadingMonth, setDownloadingMonth] = useState(null); // month key currently exporting
  const [tourOpen, setTourOpen] = useState(false); // narrated "Watch overview" walkthrough
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      getDashboardSummary(),
      getTodaysAgenda(),
      getMonthlyInterviewsReport(6),
      getPanelistCalibrationReport().catch(() => []),
      listUsers().catch(() => []),
      listInterviewers().catch(() => []),
      listActiveSkills().catch(() => []),
      listAllSkills().catch(() => []),
      getRecruiterWorkload().catch(() => null),
      getDataHygiene().catch(() => null)
    ])
      .then(([s, a, m, cal, u, iv, sa, all, wl, hy]) => {
        setSummary(s);
        setAgenda(a);
        setMonthly(m);
        setCalibration(cal || []);
        setUsers(u || []);
        setInterviewers(iv || []);
        setActiveSkills(sa || []);
        setAllSkills(all || []);
        setWorkload(wl);
        setHygiene(hy);
      })
      .catch((e) =>
        setError(e?.response?.data?.message || 'Failed to load dashboard. (Reports are only available to Admin/Recruiter roles.)')
      );
  }, []);

  const handleDownload = async () => {
    try {
      const blob = await downloadInterviewsCsv();
      saveBlob(blob, 'interviews.csv');
    } catch (e) {
      setError('Could not download the interview list.');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const blob = await downloadInterviewsPdf();
      saveBlob(blob, 'interviews.pdf');
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

  const userStats = useMemo(() => {
    const byRole = { ADMIN: 0, RECRUITER: 0, PANEL: 0 };
    let deactivated = 0;
    users.forEach((u) => {
      if (byRole[u.role] !== undefined) byRole[u.role] += 1;
      if (u.active === false) deactivated += 1;
    });
    return { total: users.length, byRole, deactivated };
  }, [users]);

  const interviewersWithoutUser = useMemo(() => {
    if (!interviewers.length) return 0;
    const userEmails = new Set(users.map((u) => (u.email || '').toLowerCase()));
    return interviewers.filter((iv) => iv.email && !userEmails.has(iv.email.toLowerCase())).length;
  }, [interviewers, users]);

  const outliers = useMemo(
    () =>
      (calibration || [])
        .filter((row) => Math.abs(Number(row.deviationFromOverallAverage) || 0) >= OUTLIER_THRESHOLD)
        .sort((a, b) => Math.abs(b.deviationFromOverallAverage) - Math.abs(a.deviationFromOverallAverage)),
    [calibration]
  );

  const workloadMax = workload ? Math.max(1, ...workload.map((w) => w.totalCount || 0)) : 1;

  return (
    <main className="page dash-b">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Admin Overview</h1>
          <p>Organization-wide interview pipeline, team workload, account administration, and data health.</p>
        </div>
        <div className="hero-actions">
          <button className="btn btn-tour hero-action" onClick={() => setTourOpen(true)} disabled={!summary} title="Play a narrated walkthrough of this dashboard">▶ Watch overview</button>
          <button className="btn btn-secondary hero-action" onClick={handleDownload}>Download CSV</button>
          <button className="btn btn-secondary hero-action" onClick={handleDownloadPdf}>Download PDF</button>
          <button className="btn btn-primary hero-action" onClick={() => navigate('/users')}>Manage users</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

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
            <StatCard icon="interviews" tone="sky" label="Total interviews" value={summary.totalInterviews} sub="All statuses" />
            <StatCard icon="candidates" tone="violet" label="Candidates" value={summary.candidateCount} sub="In the system" />
            <StatCard icon="interviewers" tone="indigo" label="Interviewers" value={summary.interviewerCount} sub="In the directory" />
            <StatCard icon="today" tone="amber" label="Today" value={summary.todaysInterviewCount} sub="Scheduled today" />
          </div>
        </div>
      )}

      <div className="section-eyebrow">Governance &amp; health</div>

      {/* Two independent column stacks (masonry, not paired grid rows) — see the `.dashboard-col`
          comment in index.css for why this replaced three separate `.dashboard-columns` rows. */}
      <div className="dashboard-columns">
        <div className="dashboard-col">
          <section className="card data-card" data-tour="useradmin">
            <CardHeader
              icon="users"
              tone="indigo"
              title="User Administration"
              subtitle="Accounts by role"
              action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/users')}>Manage</button>}
            />
            <div className="card-body">
              <div className="attention-row"><span>Total users</span><strong>{userStats.total}</strong></div>
              <div className="attention-row"><span>Admins</span><strong>{userStats.byRole.ADMIN}</strong></div>
              <div className="attention-row"><span>Recruiters</span><strong>{userStats.byRole.RECRUITER}</strong></div>
              <div className="attention-row"><span>Panel members</span><strong>{userStats.byRole.PANEL}</strong></div>
              <div className="attention-row"><span>Deactivated accounts</span><strong className={userStats.deactivated ? 'val-danger' : ''}>{userStats.deactivated}</strong></div>
            </div>
          </section>

          <section className="card data-card" data-tour="calibration">
            <CardHeader
              icon="calibration"
              tone="red"
              title="Calibration Alerts"
              subtitle={`Panelists ≥ ${OUTLIER_THRESHOLD} off the overall average`}
              action={<button className="btn btn-secondary btn-sm" onClick={() => navigate('/analytics')}>Details</button>}
            />
            <div className="card-body">
              {outliers.length === 0 && (
                <div className="attention-ok">No significant calibration outliers. Panel ratings look consistent.</div>
              )}
              {outliers.slice(0, 6).map((row) => {
                const dev = Number(row.deviationFromOverallAverage) || 0;
                const harsh = dev < 0;
                return (
                  <div className="attention-row" key={row.panelMemberName}>
                    <span>
                      <strong>{row.panelMemberName}</strong>{' '}
                      <span className={`pill ${harsh ? 'pill-harsh' : 'pill-lenient'}`}>{harsh ? 'harsh' : 'lenient'}</span>
                      <span className="muted-cell"> · {row.interviewCount} interviews · avg {row.averageFinalRating}</span>
                    </span>
                    <strong className={harsh ? 'val-danger' : 'val-good'}>{dev > 0 ? '+' : ''}{dev}</strong>
                  </div>
                );
              })}
              {outliers.length > 6 && (
                <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }} onClick={() => navigate('/analytics')}>
                  View all {outliers.length}
                </button>
              )}
            </div>
          </section>

          <section className="card data-card" data-tour="agenda">
            <CardHeader icon="agenda" tone="sky" title="Today's Agenda" subtitle={`${agenda.length} scheduled today (org-wide)`} />
            <div className="card-body">
              {agenda.length === 0 && (
                <div className="empty-state"><div>No interviews scheduled anywhere today.</div></div>
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
          <section className="card data-card" data-tour="workload">
            <CardHeader icon="workload" tone="sky" title="Recruiter Workload" subtitle="Interviews owned per recruiter" />
            <div className="card-body">
              {workload && workload.length > 0 && workload.slice(0, 6).map((w) => (
                <div className="workload-row" key={w.recruiterEmail || w.name}>
                  <span className="workload-name">{w.name || w.recruiterEmail}</span>
                  <div className="funnel-track">
                    <div className="funnel-bar" style={{ width: `${Math.max(3, ((w.totalCount || 0) / workloadMax) * 100)}%`, background: 'var(--accent)' }} />
                  </div>
                  <strong className="funnel-count">{w.totalCount}{w.activeCount != null ? ` (${w.activeCount} active)` : ''}</strong>
                </div>
              ))}
              {workload && workload.length > 6 && (
                <p className="muted-note">+{workload.length - 6} more recruiter{workload.length - 6 !== 1 ? 's' : ''} not shown.</p>
              )}
              {workload && workload.length === 0 && (
                <div className="empty-state"><div>No recruiter-owned interviews yet.</div></div>
              )}
              {!workload && (
                <div className="empty-state"><div>Rebuild the backend to enable the recruiter-workload report.</div></div>
              )}
            </div>
          </section>

          <section className="card data-card" data-tour="hygiene">
            <CardHeader icon="hygiene" tone="green" title="Data Hygiene" subtitle="Things worth cleaning up" />
            <div className="card-body">
              <div className="attention-row"><span>Orphaned interviews (no recruiter/creator)</span><strong className={hygiene && hygiene.orphanedInterviews ? 'val-danger' : ''}>{hygiene ? hygiene.orphanedInterviews : '—'}</strong></div>
              <div className="attention-row"><span>Interviewers without a user account</span><strong className={interviewersWithoutUser ? 'val-danger' : ''}>{interviewersWithoutUser}</strong></div>
              <div className="attention-row"><span>Active skills in catalog</span><strong>{activeSkills.length} / {allSkills.length || activeSkills.length}</strong></div>
              {!hygiene && <p className="muted-note">Rebuild the backend to enable the orphaned-interview count.</p>}
            </div>
          </section>

          <section className="card data-card" data-tour="monthly">
            <CardHeader
              icon="monthly"
              tone="violet"
              title="Monthly Interviews"
              subtitle={`Last ${monthly.length} months · ${totalThisPeriod} total (org-wide)`}
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
        steps={ADMIN_TOUR}
        title="Admin overview"
        onClose={() => setTourOpen(false)}
      />
    </main>
  );
}
