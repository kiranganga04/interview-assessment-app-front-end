import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, getTodaysAgenda, getMonthlyInterviewsReport, downloadInterviewsCsv, saveBlob } from '../api/apiClient';

const MONTH_LABEL = (key) => {
  const [year, month] = key.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleString('en-US', { month: 'short' });
};

/**
 * Dashboard Overview: stat tiles, Today's Agenda, Needs Attention, a lightweight Monthly
 * Interviews bar chart, an outcome-category breakdown, and a Quick Summary panel. The deeper
 * pass-rate/skill-average/panelist-calibration tables live on the Analytics page.
 */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [agenda, setAgenda] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getDashboardSummary(), getTodaysAgenda(), getMonthlyInterviewsReport(6)])
      .then(([s, a, m]) => {
        setSummary(s);
        setAgenda(a);
        setMonthly(m);
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load dashboard. (Reports are only available to Admin/Recruiter roles.)'));
  }, []);

  const handleDownload = async () => {
    try {
      const blob = await downloadInterviewsCsv();
      saveBlob(blob, 'interviews.csv');
    } catch (e) {
      setError('Could not download the interview list.');
    }
  };

  const maxMonthly = Math.max(1, ...monthly.map((m) => m.count));
  const totalThisPeriod = monthly.reduce((sum, m) => sum + m.count, 0);
  const avgPerMonth = monthly.length ? (totalThisPeriod / monthly.length).toFixed(1) : '0.0';
  const completionRate = summary && summary.totalInterviews
    ? Math.round((summary.completedCount / summary.totalInterviews) * 100)
    : 0;

  // Outcome categories (mirrors the backend's Taken / Cancelled / Others buckets).
  const taken = summary ? (summary.submittedCount + summary.completedCount) : 0;
  const cancelledCat = summary ? summary.cancelledCount : 0;
  const others = summary ? Math.max(0, summary.totalInterviews - taken - cancelledCat) : 0;

  const needsAttention = summary
    ? [
        { label: 'Pending feedback', count: summary.pendingFeedbackCount, ok: 'No pending feedback' },
        { label: 'Overdue reviews', count: summary.overdueCount, ok: 'No overdue reviews' }
      ]
    : [];
  const allCaughtUp = needsAttention.every((item) => !item.count);

  return (
    <main className="page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Dashboard Overview</h1>
          <p>Live interview pipeline and enterprise metrics, at a glance.</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary hero-action" onClick={handleDownload}>Download CSV</button>
          <button className="btn btn-primary hero-action" onClick={() => navigate('/interviews')}>View assessments</button>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      {summary && (
        <section className="metric-grid" aria-label="Dashboard summary">
          <div className="metric-card">
            <span>Total interviews</span>
            <strong>{summary.totalInterviews}</strong>
            <small>All statuses</small>
          </div>
          <div className="metric-card">
            <span>Scheduled</span>
            <strong>{summary.scheduledCount}</strong>
            <small>Awaiting the interview</small>
          </div>
          <div className="metric-card">
            <span>Completed</span>
            <strong>{summary.completedCount}</strong>
            <small>Recommended or closed</small>
          </div>
          <div className="metric-card">
            <span>Cancelled</span>
            <strong>{summary.cancelledCount}</strong>
            <small>Withdrawn interviews</small>
          </div>
          <div className="metric-card">
            <span>Candidates</span>
            <strong>{summary.candidateCount}</strong>
            <small>In the system</small>
          </div>
          <div className="metric-card">
            <span>Interviewers</span>
            <strong>{summary.interviewerCount}</strong>
            <small>In the directory</small>
          </div>
          <div className="metric-card">
            <span>Pending feedback</span>
            <strong>{summary.pendingFeedbackCount}</strong>
            <small>Ratings filled in, awaiting recommendation</small>
          </div>
          <div className="metric-card">
            <span>Today's interviews</span>
            <strong>{summary.todaysInterviewCount}</strong>
            <small>Scheduled for today</small>
          </div>
        </section>
      )}

      <div className="dashboard-columns">
        <section className="card data-card">
          <div className="card-header">
            <div>
              <h3>Today's Agenda</h3>
              <p>{agenda.length} scheduled today</p>
            </div>
          </div>
          <div className="card-body">
            {agenda.length === 0 && (
              <div className="empty-state">
                <div>No interviews scheduled today. A clear day — a good time to plan ahead.</div>
              </div>
            )}
            {agenda.map((item) => (
              <div key={item.interviewId} className="agenda-row" onClick={() => navigate(`/interviews/${item.interviewId}`)}>
                <div>
                  <strong>{item.candidateName}</strong>
                  <div className="muted-cell">{item.interviewerOrPanelName || '—'} · {item.modeOfInterview || '—'}</div>
                </div>
                <div className="agenda-row-time">
                  {item.scheduledAt ? new Date(item.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  <span className={`status-chip status-${(item.status || '').toLowerCase()}`}>{(item.status || '-').replace('_', ' ')}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="card data-card">
          <div className="card-header">
            <div>
              <h3>Needs Attention</h3>
              <p>Pending feedback & overdue actions</p>
            </div>
          </div>
          <div className="card-body">
            {allCaughtUp ? (
              <div className="attention-ok">All caught up. Nothing needs your attention right now.</div>
            ) : (
              needsAttention.filter((i) => i.count > 0).map((item) => (
                <div key={item.label} className="attention-row">
                  <span>{item.label}</span>
                  <strong>{item.count}</strong>
                </div>
              ))
            )}
            {needsAttention.filter((i) => !i.count).map((item) => (
              <div key={item.label} className="attention-row ok"><span>✓</span> {item.ok}</div>
            ))}
          </div>
        </section>
      </div>

      <div className="dashboard-columns" style={{ marginTop: 20 }}>
        <section className="card data-card">
          <div className="card-header">
            <div>
              <h3>Monthly Interviews</h3>
              <p>Last {monthly.length} months · {totalThisPeriod} total interviews</p>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleDownload}>Download CSV</button>
          </div>
          <div className="card-body">
            <div className="bar-chart" role="img" aria-label="Interviews scheduled per month">
              {monthly.map((m) => (
                <div className="bar-chart-col" key={m.month}>
                  <div className="bar-chart-bar" style={{ height: `${Math.max(4, (m.count / maxMonthly) * 120)}px` }} title={`${m.count} interviews`} />
                  <span>{MONTH_LABEL(m.month)}</span>
                </div>
              ))}
              {monthly.length === 0 && <div className="empty-state">No data yet.</div>}
            </div>
          </div>
        </section>

        <section className="card data-card">
          <div className="card-header"><div><h3>By category</h3><p>Outcome breakdown</p></div></div>
          <div className="card-body">
            <div className="attention-row"><span>Taken (submitted / recommended / closed)</span><strong>{taken}</strong></div>
            <div className="attention-row"><span>Cancelled</span><strong>{cancelledCat}</strong></div>
            <div className="attention-row"><span>Others (scheduled / in progress)</span><strong>{others}</strong></div>
          </div>
        </section>
      </div>

      <div className="dashboard-columns" style={{ marginTop: 20 }}>
        <section className="card data-card">
          <div className="card-header"><div><h3>Quick Summary</h3></div></div>
          <div className="card-body">
            <div className="attention-row"><span>Total this period</span><strong>{totalThisPeriod}</strong></div>
            <div className="attention-row"><span>Avg per month</span><strong>{avgPerMonth}</strong></div>
            <div className="attention-row"><span>Completion rate</span><strong>{completionRate}%</strong></div>
            <div className="attention-row"><span>Pending review</span><strong>{summary ? summary.pendingFeedbackCount : 0}</strong></div>
          </div>
        </section>
      </div>
    </main>
  );
}
