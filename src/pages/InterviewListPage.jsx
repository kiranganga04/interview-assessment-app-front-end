import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInterviews, deleteInterview } from '../api/apiClient';
import RatingBadge from '../components/RatingBadge';

export default function InterviewListPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const navigate = useNavigate();

  const metrics = useMemo(() => {
    const ratings = interviews.map((item) => Number(item.finalRating || 0)).filter(Boolean);
    const averageRating = ratings.length
      ? (ratings.reduce((sum, value) => sum + value, 0) / ratings.length).toFixed(1)
      : '0.0';

    return {
      total: interviews.length,
      averageRating,
      recommendations: interviews.filter((item) => item.panelRecommendation).length,
      levels: new Set(interviews.map((item) => item.levelOfInterview).filter(Boolean)).size
    };
  }, [interviews]);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await listInterviews(levelFilter ? { level: levelFilter } : {});
      setInterviews(data);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load interviews.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [levelFilter]);

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Delete this interview assessment? This cannot be undone.')) return;
    await deleteInterview(id);
    load();
  };

  return (
    <main className="page">
      <section className="dashboard-hero">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Assessment command center</h1>
          <p>Track candidate evaluations, panel recommendations, skill ratings, and coding outcomes from one focused workspace.</p>
        </div>
        <button className="btn btn-primary hero-action" onClick={() => navigate('/interviews/new')}>+ New assessment</button>
      </section>

      <section className="metric-grid" aria-label="Assessment summary">
        <div className="metric-card">
          <span>Total records</span>
          <strong>{metrics.total}</strong>
          <small>Submitted evaluations</small>
        </div>
        <div className="metric-card">
          <span>Average rating</span>
          <strong>{metrics.averageRating}</strong>
          <small>Across visible records</small>
        </div>
        <div className="metric-card">
          <span>Recommendations</span>
          <strong>{metrics.recommendations}</strong>
          <small>Panel decisions captured</small>
        </div>
        <div className="metric-card">
          <span>Interview levels</span>
          <strong>{metrics.levels}</strong>
          <small>Levels represented</small>
        </div>
      </section>

      <section className="card data-card">
        <div className="card-header">
          <div>
            <h3>Assessment records</h3>
            <p>{interviews.length} record{interviews.length !== 1 ? 's' : ''} currently in view</p>
          </div>
          <label className="toolbar-filter">
            <span>Level</span>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}>
              <option value="">All levels</option>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
              <option value="L3">L3</option>
              <option value="HR">HR</option>
              <option value="CLIENT">Client</option>
            </select>
          </label>
        </div>

        {error && <div className="card-body"><div className="error-banner">{error}</div></div>}
        {loading && <div className="loading">Loading assessments...</div>}

        {!loading && interviews.length === 0 && !error && (
          <div className="empty-state">
            <div className="empty-icon">IA</div>
            <div>No assessments yet. Create the first one.</div>
          </div>
        )}

        {!loading && interviews.length > 0 && (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Level</th>
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
                    <td>{iv.panelMemberName || '-'}</td>
                    <td>{iv.interviewDate || '-'}</td>
                    <td><RatingBadge value={iv.finalRating} /></td>
                    <td>{iv.panelRecommendation || '-'}</td>
                    <td className="row-actions">
                      <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}/edit`); }}>Edit</button>
                      <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={(e) => handleDelete(e, iv.interviewId)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
