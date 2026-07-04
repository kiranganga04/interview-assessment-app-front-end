import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardSummary, getPassRateReport, getSkillAverageReport, getPanelistCalibrationReport } from '../api/apiClient';

/** Module 7: KPI tiles + a few simple tables — the reporting/analytics landing page. */
export default function DashboardPage() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [passRate, setPassRate] = useState([]);
  const [skillAverages, setSkillAverages] = useState([]);
  const [calibration, setCalibration] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getDashboardSummary(), getPassRateReport(), getSkillAverageReport(), getPanelistCalibrationReport()])
      .then(([s, pr, sa, pc]) => {
        setSummary(s);
        setPassRate(pr);
        setSkillAverages(sa);
        setCalibration(pc);
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load dashboard. (Reports are only available to Admin/Recruiter roles.)'));
  }, []);

  return (
    <main className="page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Assessment command center</h1>
          <p>Track candidate evaluations, panel recommendations, skill ratings, and coding outcomes from one focused workspace.</p>
        </div>
        <button className="btn btn-primary hero-action" onClick={() => navigate('/interviews')}>View assessments</button>
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
            <span>Submitted</span>
            <strong>{summary.submittedCount}</strong>
            <small>Ratings filled in, pending recommendation</small>
          </div>
          <div className="metric-card">
            <span>Average final rating</span>
            <strong>{summary.averageFinalRating?.toFixed ? summary.averageFinalRating.toFixed(1) : summary.averageFinalRating}</strong>
            <small>Across all closed & open records</small>
          </div>
        </section>
      )}

      <div className="dashboard-columns">
        <section className="card data-card">
          <div className="card-header"><div><h3>Pass rate by level</h3><p>Share of interviews recommended, per level</p></div></div>
          <table>
            <thead><tr><th>Level</th><th>Total</th><th>Recommended</th><th>Pass rate</th></tr></thead>
            <tbody>
              {passRate.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No data yet.</td></tr>}
              {passRate.map((row) => (
                <tr key={row.level}>
                  <td><span className="pill">{row.level}</span></td>
                  <td>{row.total}</td>
                  <td>{row.recommended}</td>
                  <td>{row.passRatePercent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card data-card">
          <div className="card-header"><div><h3>Average rating by skill</h3><p>Internal panel ratings only</p></div></div>
          <table>
            <thead><tr><th>Skill</th><th>Average</th><th>Ratings</th></tr></thead>
            <tbody>
              {skillAverages.length === 0 && <tr><td colSpan={3} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No data yet.</td></tr>}
              {skillAverages.map((row) => (
                <tr key={row.skillName}>
                  <td>{row.skillName}</td>
                  <td>{row.averageRating}</td>
                  <td>{row.ratingCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card data-card" style={{ marginTop: 20 }}>
        <div className="card-header"><div><h3>Panelist calibration</h3><p>How each panelist's average final rating compares to the overall average — useful for spotting consistently harsher or more lenient reviewers.</p></div></div>
        <table>
          <thead><tr><th>Panel member</th><th>Interviews</th><th>Average rating</th><th>Deviation from overall average</th></tr></thead>
          <tbody>
            {calibration.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No data yet.</td></tr>}
            {calibration.map((row) => (
              <tr key={row.panelMemberName}>
                <td>{row.panelMemberName}</td>
                <td>{row.interviewCount}</td>
                <td>{row.averageFinalRating}</td>
                <td style={{ color: row.deviationFromOverallAverage < 0 ? 'var(--r1)' : 'var(--r5)' }}>
                  {row.deviationFromOverallAverage > 0 ? '+' : ''}{row.deviationFromOverallAverage}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
