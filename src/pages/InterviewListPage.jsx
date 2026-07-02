import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { listInterviews, deleteInterview } from '../api/apiClient';
import RatingBadge from '../components/RatingBadge';

export default function InterviewListPage() {
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [levelFilter, setLevelFilter] = useState('');
  const navigate = useNavigate();

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
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Interview Assessment System</div>
          <h1>Assessment records</h1>
          <p>All panel evaluations submitted across candidates and interview levels.</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/interviews/new')}>+ New assessment</button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{interviews.length} record{interviews.length !== 1 ? 's' : ''}</h3>
          <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} style={{ padding: '6px 10px', borderRadius: 7, border: '1px solid var(--line)' }}>
            <option value="">All levels</option>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="L3">L3</option>
            <option value="HR">HR</option>
            <option value="CLIENT">Client</option>
          </select>
        </div>

        {error && <div className="card-body"><div className="error-banner">{error}</div></div>}
        {loading && <div className="loading">Loading assessments…</div>}

        {!loading && interviews.length === 0 && !error && (
          <div className="empty-state">
            <div className="mark">📋</div>
            <div>No assessments yet. Create the first one.</div>
          </div>
        )}

        {!loading && interviews.length > 0 && (
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
                  <td><strong>{iv.candidateName}</strong><br /><span style={{ color: 'var(--ink-muted)', fontSize: 12.5 }}>{iv.currentRole || '—'}</span></td>
                  <td><span className="pill">{iv.levelOfInterview || '—'}</span></td>
                  <td>{iv.panelMemberName || '—'}</td>
                  <td>{iv.interviewDate || '—'}</td>
                  <td><RatingBadge value={iv.finalRating} /></td>
                  <td>{iv.panelRecommendation || '—'}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); navigate(`/interviews/${iv.interviewId}/edit`); }}>Edit</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={(e) => handleDelete(e, iv.interviewId)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
