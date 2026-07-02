import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInterview } from '../api/apiClient';
import RatingBadge from '../components/RatingBadge';

function SkillTable({ title, rows, showSelf }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div className="card-header"><h3>{title}</h3></div>
      <table>
        <thead>
          <tr>
            <th>Skill</th>
            {showSelf && <th>Self-rating</th>}
            <th>Rating</th>
            <th>Feedback / Remarks</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>Not filled in.</td></tr>}
          {rows.map((s) => (
            <tr key={s.skillAssessmentId ?? s.skillOrder}>
              <td><strong>{s.skillName || `Skill ${s.skillOrder}`}</strong></td>
              {showSelf && <td><RatingBadge value={s.selfRating} /></td>}
              <td><RatingBadge value={s.rating} /></td>
              <td>{s.feedback || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function InterviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [iv, setIv] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getInterview(id).then(setIv).catch((e) => setError(e?.response?.data?.message || 'Failed to load record.'));
  }, [id]);

  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;
  if (!iv) return <div className="loading">Loading…</div>;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Assessment · {iv.levelOfInterview}</div>
          <h1>{iv.candidateName}</h1>
          <p>{iv.currentRole || 'Role not specified'} · {iv.overallExperience || '—'} yrs experience</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={() => navigate(`/interviews/${id}/edit`)}>Edit</button>
          <button className="btn btn-ghost" onClick={() => navigate('/interviews')}>Back to list</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body form-grid cols-3">
          <div><div className="eyebrow">Panel member</div><div>{iv.panelMemberName || '—'}</div></div>
          <div><div className="eyebrow">Recruiter</div><div>{iv.recruiterName || '—'}</div></div>
          <div><div className="eyebrow">Mode</div><div>{iv.modeOfInterview || '—'}</div></div>
          <div><div className="eyebrow">Interview date</div><div>{iv.interviewDate || '—'}</div></div>
          <div><div className="eyebrow">Domain knowledge</div><div>{iv.domainKnowledge || '—'}</div></div>
          <div><div className="eyebrow">Communication</div><div><RatingBadge value={iv.communicationRating} /></div></div>
          <div><div className="eyebrow">Final rating</div><div><RatingBadge value={iv.finalRating} showLabel /></div></div>
          <div><div className="eyebrow">Recommendation</div><div><span className="pill">{iv.panelRecommendation || '—'}</span></div></div>
        </div>
      </div>

      {iv.overallAssessment && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Overall assessment</h3></div>
          <div className="card-body">{iv.overallAssessment}</div>
        </div>
      )}

      <SkillTable title="Panel skill ratings" rows={iv.internalSkillAssessments} showSelf />

      <div className="card" style={{ marginBottom: 20, overflowX: 'auto' }}>
        <div className="card-header"><h3>Coding details</h3></div>
        <table>
          <thead>
            <tr><th>Skill</th><th># Questions</th><th>Time (mins)</th><th>Complexity</th><th>Status</th><th>Remarks</th></tr>
          </thead>
          <tbody>
            {iv.codingRounds.length === 0 && <tr><td colSpan={6} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>None recorded.</td></tr>}
            {iv.codingRounds.map((c) => (
              <tr key={c.codingRoundId}>
                <td>{c.skill}</td>
                <td>{c.noOfQuestions}</td>
                <td>{c.timeTakenMins}</td>
                <td>{c.testComplexity}</td>
                <td>{c.codingStatus}</td>
                <td>{c.remarks || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SkillTable title="Client technical panel ratings" rows={iv.clientSkillAssessments} showSelf={false} />
    </div>
  );
}
