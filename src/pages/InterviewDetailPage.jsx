import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getInterview, changeInterviewStatus, rescheduleInterview, listAttachments, attachmentDownloadHref } from '../api/apiClient';
import RatingBadge from '../components/RatingBadge';
import { useToast } from '../components/layout/ToastProvider';

const NEXT_STATUS = {
  SCHEDULED: ['IN_PROGRESS', 'CLOSED'],
  IN_PROGRESS: ['SUBMITTED', 'CLOSED'],
  SUBMITTED: ['RECOMMENDED', 'IN_PROGRESS', 'CLOSED'],
  RECOMMENDED: ['CLOSED'],
  CLOSED: []
};

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

export default function InterviewDetailPage({ auth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [iv, setIv] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [error, setError] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);
  const [newWhen, setNewWhen] = useState('');
  const [newLink, setNewLink] = useState('');
  const [busy, setBusy] = useState(false);
  const isPanel = auth?.role === 'PANEL';
  // Panel can open the feedback form; the interview lifecycle (status / reschedule / cancel) is
  // recruiter/admin only.
  const canManage = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER' || isPanel;
  const canManageLifecycle = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';

  const load = () => {
    getInterview(id).then(setIv).catch((e) => setError(e?.response?.data?.message || 'Failed to load record.'));
    listAttachments('INTERVIEW_SCREENSHOT', id).then(setAttachments).catch(() => {});
  };

  useEffect(load, [id]);

  const handleStatusChange = async (status) => {
    try {
      const updated = await changeInterviewStatus(id, status);
      setIv(updated);
      toast.success(`Status moved to ${status.replace('_', ' ')}.`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not change status.');
    }
  };

  const handleCancel = () => {
    if (!window.confirm('Cancel this interview? The candidate, interviewer and recruiter will be notified.')) return;
    handleStatusChange('CANCELLED');
  };

  const openReschedule = () => {
    setNewWhen(iv.scheduledAt ? String(iv.scheduledAt).slice(0, 16) : '');
    setNewLink(iv.meetingLink || '');
    setShowReschedule(true);
  };

  const submitReschedule = async () => {
    if (!newWhen) {
      toast.error('Please pick a new date & time.');
      return;
    }
    setBusy(true);
    try {
      const updated = await rescheduleInterview(id, { scheduledAt: newWhen, meetingLink: newLink || undefined });
      setIv(updated);
      setShowReschedule(false);
      toast.success('Interview rescheduled. The candidate, interviewer and recruiter have been notified.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not reschedule the interview.');
    } finally {
      setBusy(false);
    }
  };

  if (error) return <div className="page"><div className="error-banner">{error}</div></div>;
  if (!iv) return <div className="loading">Loading…</div>;

  const nextStatuses = NEXT_STATUS[iv.status] || [];
  const canReschedule = canManageLifecycle && iv.status !== 'CANCELLED' && iv.status !== 'CLOSED';
  const canCancel = canManageLifecycle && (iv.status === 'SCHEDULED' || iv.status === 'IN_PROGRESS');

  // The rating / coding sections are OUTCOMES of the interview -- only show them once they have
  // content, so a not-yet-conducted (SCHEDULED) interview doesn't display three empty tables.
  const hasInternal = (iv.internalSkillAssessments || []).length > 0;
  const hasCoding = (iv.codingRounds || []).length > 0;
  const hasClient = (iv.clientSkillAssessments || []).length > 0;
  const hasAnyFeedback = hasInternal || hasCoding || hasClient || !!iv.overallAssessment;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Assessment · {iv.levelOfInterview}</div>
          <h1>{iv.candidateName}</h1>
          <p>{iv.currentRole || 'Role not specified'} · {iv.overallExperience || '—'} yrs experience</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {canManage && (
            <button className="btn btn-secondary" onClick={() => navigate(`/interviews/${id}/edit`)}>
              {isPanel ? 'Add feedback' : 'Edit'}
            </button>
          )}
          <button className="btn btn-ghost" onClick={() => navigate('/interviews')}>Back to list</button>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body form-grid cols-3">
          <div><div className="eyebrow">Status</div><div><span className={`status-chip status-${(iv.status || '').toLowerCase()}`}>{(iv.status || '—').replace('_', ' ')}</span></div></div>
          <div><div className="eyebrow">Panel member</div><div>{iv.panelMemberName || '—'}</div></div>
          <div><div className="eyebrow">Recruiter</div><div>{iv.recruiterName || '—'}{iv.recruiterEmail ? ` (${iv.recruiterEmail})` : ''}</div></div>
          <div><div className="eyebrow">Mode</div><div>{iv.modeOfInterview || '—'}</div></div>
          <div><div className="eyebrow">Scheduled at</div><div>{iv.scheduledAt ? String(iv.scheduledAt).replace('T', ' ').slice(0, 16) : (iv.interviewDate || '—')}</div></div>
          <div>
            <div className="eyebrow">Meeting link</div>
            <div>{iv.meetingLink ? <a href={iv.meetingLink} target="_blank" rel="noreferrer">{iv.meetingLink}</a> : '—'}</div>
          </div>
          <div><div className="eyebrow">Domain knowledge</div><div>{iv.domainKnowledge || '—'}</div></div>
          <div><div className="eyebrow">Communication</div><div><RatingBadge value={iv.communicationRating} /></div></div>
          <div><div className="eyebrow">Final rating</div><div><RatingBadge value={iv.finalRating} showLabel /></div></div>
          <div><div className="eyebrow">Recommendation</div><div><span className="pill">{iv.panelRecommendation || '—'}</span></div></div>
        </div>

        {canManageLifecycle && (nextStatuses.length > 0 || canReschedule || canCancel) && (
          <div className="card-body" style={{ borderTop: '1px solid var(--line)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {nextStatuses.length > 0 && (
              <>
                <span style={{ color: 'var(--ink-muted)', fontSize: 12.5, fontWeight: 700 }}>Move to:</span>
                {nextStatuses.map((s) => (
                  <button key={s} type="button" className="btn btn-secondary btn-sm" onClick={() => handleStatusChange(s)}>
                    {s.replace('_', ' ')}
                  </button>
                ))}
                <span style={{ width: 1, alignSelf: 'stretch', background: 'var(--line)', margin: '0 4px' }} />
              </>
            )}
            {canReschedule && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={openReschedule}>Reschedule</button>
            )}
            {canCancel && (
              <button type="button" className="btn btn-secondary btn-sm" style={{ color: '#b91c1c' }} onClick={handleCancel}>
                Cancel interview
              </button>
            )}
          </div>
        )}

        {showReschedule && (
          <div className="card-body" style={{ borderTop: '1px solid var(--line)' }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Reschedule interview</div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5, color: 'var(--ink-muted)', fontWeight: 700, gap: 4 }}>
                New date & time
                <input type="datetime-local" value={newWhen} onChange={(e) => setNewWhen(e.target.value)} className="input" style={{ minWidth: 220 }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', fontSize: 12.5, color: 'var(--ink-muted)', fontWeight: 700, gap: 4, flex: 1, minWidth: 240 }}>
                Meeting link (optional)
                <input type="url" value={newLink} onChange={(e) => setNewLink(e.target.value)} className="input" placeholder="https://…" />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={submitReschedule} disabled={busy}>
                  {busy ? 'Saving…' : 'Save & notify'}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowReschedule(false)} disabled={busy}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {!hasAnyFeedback && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body empty-state">
            {iv.status === 'SCHEDULED' && (
              <div>This interview hasn't taken place yet. Panel ratings, coding details and the recommendation
                will appear here once the panel submits their feedback.</div>
            )}
            {iv.status === 'CANCELLED' && <div>This interview was cancelled, so no feedback was recorded.</div>}
            {iv.status !== 'SCHEDULED' && iv.status !== 'CANCELLED' && (
              <div>No ratings have been recorded for this interview yet.</div>
            )}
          </div>
        </div>
      )}

      {iv.overallAssessment && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Overall assessment</h3></div>
          <div className="card-body">{iv.overallAssessment}</div>
        </div>
      )}

      {hasInternal && <SkillTable title="Panel skill ratings" rows={iv.internalSkillAssessments} showSelf />}

      {hasCoding && (
        <div className="card" style={{ marginBottom: 20, overflowX: 'auto' }}>
          <div className="card-header"><h3>Coding details</h3></div>
          <table>
            <thead>
              <tr><th>Skill</th><th># Questions</th><th>Time (mins)</th><th>Complexity</th><th>Status</th><th>Remarks</th></tr>
            </thead>
            <tbody>
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
      )}

      {hasClient && <SkillTable title="Client technical panel ratings" rows={iv.clientSkillAssessments} showSelf={false} />}

      {(attachments.length > 0 || iv.interviewScreenshotUrl) && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Attachments</h3></div>
          <div className="card-body">
            {iv.interviewScreenshotUrl && (
              <div style={{ marginBottom: 8 }}>
                <a href={iv.interviewScreenshotUrl} target="_blank" rel="noreferrer">{iv.interviewScreenshotUrl}</a>
              </div>
            )}
            {attachments.map((a) => (
              <div key={a.attachmentId}>
                <a href={attachmentDownloadHref(a.attachmentId)} target="_blank" rel="noreferrer">{a.originalFilename}</a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
