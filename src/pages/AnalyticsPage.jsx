import React, { useEffect, useMemo, useState } from 'react';
import { getPassRateReport, getSkillAverageReport, getPanelistCalibrationReport } from '../api/apiClient';
import { StatCard, CardHeader } from '../components/DashboardUI';

/**
 * Analytics (ADMIN / RECRUITER) — deeper-dive reporting on the shared editorial theme (.dash-b):
 * a KPI strip plus three visual reports (pass-rate bars, skill-rating bars, and a diverging
 * panelist-calibration chart) instead of plain tables.
 */
export default function AnalyticsPage() {
  const [passRate, setPassRate] = useState([]);
  const [skillAverages, setSkillAverages] = useState([]);
  const [calibration, setCalibration] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getPassRateReport(), getSkillAverageReport(), getPanelistCalibrationReport()])
      .then(([pr, sa, pc]) => {
        setPassRate(pr);
        setSkillAverages(sa);
        setCalibration(pc);
      })
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load analytics. (Reports are only available to Admin/Recruiter roles.)'));
  }, []);

  const kpis = useMemo(() => {
    const totTotal = passRate.reduce((s, r) => s + (r.total || 0), 0);
    const totRec = passRate.reduce((s, r) => s + (r.recommended || 0), 0);
    const overallPass = totTotal ? Math.round((totRec / totTotal) * 100) : 0;
    const ratings = skillAverages.reduce((s, r) => s + (r.ratingCount || 0), 0);
    const weighted = skillAverages.reduce((s, r) => s + (Number(r.averageRating) || 0) * (r.ratingCount || 0), 0);
    const avgSkill = ratings ? (weighted / ratings) : 0;
    return { overallPass, avgSkill, ratings, panelists: calibration.length };
  }, [passRate, skillAverages, calibration]);

  const skillMax = Math.max(5, ...skillAverages.map((r) => Number(r.averageRating) || 0));
  const calMaxAbs = Math.max(0.5, ...calibration.map((r) => Math.abs(Number(r.deviationFromOverallAverage) || 0)));
  const calSorted = useMemo(
    () => [...calibration].sort((a, b) => Math.abs(b.deviationFromOverallAverage) - Math.abs(a.deviationFromOverallAverage)),
    [calibration]
  );

  return (
    <main className="page dash-b">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Analytics</h1>
          <p>Pass rates by level, average ratings by skill, and panelist calibration — where your panel is generous, where it's tough, and where candidates clear the bar.</p>
        </div>
      </section>

      {error && <div className="error-banner">{error}</div>}

      <section className="stat-grid" aria-label="Analytics summary">
        <StatCard label="Overall pass rate" value={`${kpis.overallPass}%`} sub="Recommended ÷ total" />
        <StatCard label="Avg skill rating" value={kpis.avgSkill ? kpis.avgSkill.toFixed(1) : '—'} sub="Weighted, out of 5" />
        <StatCard label="Ratings recorded" value={kpis.ratings} sub="Internal panel ratings" />
        <StatCard label="Panelists tracked" value={kpis.panelists} sub="With calibration data" />
      </section>

      <div className="dashboard-columns">
        <section className="card data-card">
          <CardHeader title="Pass rate by level" subtitle="Share of interviews recommended, per level" />
          <div className="card-body">
            {passRate.length === 0 && <div className="empty-state"><div>No data yet.</div></div>}
            {passRate.map((row) => (
              <div className="meter-row" key={row.level}>
                <span className="meter-label"><span className="pill">{row.level}</span></span>
                <div className="meter-track"><div className="meter-fill" style={{ width: `${Math.max(2, row.passRatePercent)}%` }} /></div>
                <span className="meter-val">{row.passRatePercent}% <small>({row.recommended}/{row.total})</small></span>
              </div>
            ))}
          </div>
        </section>

        <section className="card data-card">
          <CardHeader title="Average rating by skill" subtitle="Internal panel ratings only" />
          <div className="card-body">
            {skillAverages.length === 0 && <div className="empty-state"><div>No data yet.</div></div>}
            {skillAverages.map((row) => (
              <div className="meter-row" key={row.skillName}>
                <span className="meter-label">{row.skillName}</span>
                <div className="meter-track"><div className="meter-fill" style={{ width: `${Math.max(2, ((Number(row.averageRating) || 0) / skillMax) * 100)}%` }} /></div>
                <span className="meter-val">{row.averageRating} <small>/5 · {row.ratingCount}</small></span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="card data-card" style={{ marginTop: 18 }}>
        <CardHeader
          title="Panelist calibration"
          subtitle="How each panelist's average final rating compares to the overall average — left of centre is tougher, right is more lenient."
        />
        <div className="card-body">
          {calSorted.length === 0 && <div className="empty-state"><div>No data yet.</div></div>}
          {calSorted.map((row) => {
            const dev = Number(row.deviationFromOverallAverage) || 0;
            const harsh = dev < 0;
            const w = Math.min(50, (Math.abs(dev) / calMaxAbs) * 50);
            const fillStyle = harsh
              ? { left: `${50 - w}%`, width: `${w}%`, background: 'var(--r1)' }
              : { left: '50%', width: `${w}%`, background: 'var(--r5)' };
            return (
              <div className="cal-row" key={row.panelMemberName}>
                <span className="cal-name">{row.panelMemberName}<small>{row.interviewCount} interviews · avg {row.averageFinalRating}</small></span>
                <div className="cal-track">
                  <div className="cal-center" />
                  <div className="cal-fill" style={fillStyle} />
                </div>
                <span className="cal-val" style={{ color: harsh ? 'var(--r1)' : 'var(--r5)' }}>{dev > 0 ? '+' : ''}{dev}</span>
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
