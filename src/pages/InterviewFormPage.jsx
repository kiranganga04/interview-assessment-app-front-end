import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listCandidates, createCandidate,
  getInterview, createInterview, updateInterview, submitInterviewFeedback,
  listActiveSkills, uploadFile, listAttachments, attachmentDownloadHref
} from '../api/apiClient';
import SkillAssessmentTable from '../components/SkillAssessmentTable';
import CodingRoundTable from '../components/CodingRoundTable';
import { useToast } from '../components/layout/ToastProvider';

const DEFAULT_SKILLS = ['Core Java', 'Springboot, API', 'Microservices', 'SQL', 'Coding', 'Design patterns']
  .map((name, i) => ({ skillOrder: i + 1, skillName: name, selfRating: '', rating: '', feedback: '' }));

const emptyForm = {
  candidateId: '',
  panelMemberName: '',
  recruiterName: '',
  levelOfInterview: 'L1',
  modeOfInterview: 'VIRTUAL',
  interviewDate: '',
  scheduledAt: '',
  domainKnowledge: '',
  domainFeedback: '',
  communicationRating: '',
  finalRating: '',
  overallAssessment: '',
  panelRecommendation: '',
  interviewScreenshotUrl: '',
  internalSkillAssessments: DEFAULT_SKILLS,
  clientSkillAssessments: [],
  codingRounds: []
};

export default function InterviewFormPage() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const [form, setForm] = useState(emptyForm);
  const [candidateDisplayName, setCandidateDisplayName] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [newCandidateMode, setNewCandidateMode] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ candidateName: '', mobileNumber: '', overallExperience: '', currentRole: '' });
  const [resumeUploading, setResumeUploading] = useState(false);
  const [screenshotAttachments, setScreenshotAttachments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listCandidates().then(setCandidates).catch(() => {});
    listActiveSkills().then(setSkillOptions).catch(() => {});
    if (isEdit) {
      getInterview(id).then((iv) => {
        setForm({
          candidateId: iv.candidateId,
          panelMemberName: iv.panelMemberName || '',
          recruiterName: iv.recruiterName || '',
          levelOfInterview: iv.levelOfInterview || 'L1',
          modeOfInterview: iv.modeOfInterview || 'VIRTUAL',
          interviewDate: iv.interviewDate || '',
          scheduledAt: iv.scheduledAt || '',
          domainKnowledge: iv.domainKnowledge || '',
          domainFeedback: iv.domainFeedback || '',
          communicationRating: iv.communicationRating ?? '',
          finalRating: iv.finalRating ?? '',
          overallAssessment: iv.overallAssessment || '',
          panelRecommendation: iv.panelRecommendation || '',
          interviewScreenshotUrl: iv.interviewScreenshotUrl || '',
          internalSkillAssessments: iv.internalSkillAssessments.length ? iv.internalSkillAssessments : DEFAULT_SKILLS,
          clientSkillAssessments: iv.clientSkillAssessments,
          codingRounds: iv.codingRounds
        });
        setCandidateDisplayName(iv.candidateName || '');
      }).catch((e) => setError(e?.response?.data?.message || 'Failed to load record.'));
      listAttachments('INTERVIEW_SCREENSHOT', id).then(setScreenshotAttachments).catch(() => {});
    }
  }, [id, isEdit]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAddCandidate = async () => {
    if (!newCandidate.candidateName.trim()) {
      toast.error('Candidate name is required.');
      return;
    }
    const created = await createCandidate(newCandidate);
    setCandidates((c) => [...c, created]);
    setField('candidateId', created.candidateId);
    setNewCandidateMode(false);
    setNewCandidate({ candidateName: '', mobileNumber: '', overallExperience: '', currentRole: '' });
  };

  const handleResumeUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !form.candidateId) return;
    setResumeUploading(true);
    try {
      await uploadFile('CANDIDATE_RESUME', form.candidateId, file);
      toast.success('Resume uploaded.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload resume.');
    } finally {
      setResumeUploading(false);
      e.target.value = '';
    }
  };

  const handleScreenshotUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isEdit) return;
    try {
      await uploadFile('INTERVIEW_SCREENSHOT', id, file);
      const refreshed = await listAttachments('INTERVIEW_SCREENSHOT', id);
      setScreenshotAttachments(refreshed);
      toast.success('File uploaded.');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to upload file.');
    } finally {
      e.target.value = '';
    }
  };

  // Shared payload builder so a plain save and a feedback submission send exactly the same shape.
  const buildPayload = () => ({
    ...form,
    candidateId: Number(form.candidateId),
    communicationRating: form.communicationRating === '' ? null : Number(form.communicationRating),
    finalRating: form.finalRating === '' ? null : Number(form.finalRating),
    scheduledAt: form.scheduledAt || null,
    internalSkillAssessments: form.internalSkillAssessments.map((s) => ({
      ...s, selfRating: s.selfRating === '' ? null : Number(s.selfRating), rating: s.rating === '' ? null : Number(s.rating)
    })),
    clientSkillAssessments: form.clientSkillAssessments.map((s) => ({
      ...s, selfRating: s.selfRating === '' ? null : Number(s.selfRating), rating: s.rating === '' ? null : Number(s.rating)
    })),
    codingRounds: form.codingRounds.map((c) => ({
      ...c,
      noOfQuestions: c.noOfQuestions === '' ? null : Number(c.noOfQuestions),
      timeTakenMins: c.timeTakenMins === '' ? null : Number(c.timeTakenMins)
    }))
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.candidateId) {
      setError('Please select or create a candidate first.');
      return;
    }
    setSaving(true);
    try {
      const saved = isEdit ? await updateInterview(id, buildPayload()) : await createInterview(buildPayload());
      toast.success(isEdit ? 'Assessment saved.' : 'Assessment created.');
      navigate(`/interviews/${saved.interviewId}`);
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to save assessment.');
    } finally {
      setSaving(false);
    }
  };

  // Panel action: save the feedback AND submit it (moves the interview to SUBMITTED and emails the recruiter).
  const handleSubmitFeedback = async () => {
    setError('');
    if (!form.candidateId) {
      setError('Please select or create a candidate first.');
      return;
    }
    if (!window.confirm('Submit your feedback? This marks the interview as SUBMITTED and notifies the recruiter to review it.')) {
      return;
    }
    setSaving(true);
    try {
      const saved = await submitInterviewFeedback(id, buildPayload());
      toast.success('Feedback submitted. The recruiter has been notified.');
      navigate(`/interviews/${saved.interviewId}`);
    } catch (e2) {
      setError(e2?.response?.data?.message || 'Failed to submit feedback.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">{isEdit ? 'Edit' : 'New'} assessment</div>
          <h1>Interview Assessment Form</h1>
          <p>All fields are mandatory — mark as NA if not applicable.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Candidate & panel details</h3></div>
          <div className="card-body form-grid cols-3">
            <div className="field span-2">
              <label>Candidate</label>
              {isEdit ? (
                <>
                  <input value={candidateDisplayName} disabled />
                  <small style={{ color: 'var(--ink-muted)' }}>
                    The candidate is fixed once an interview is scheduled and can't be changed from this form.
                  </small>
                </>
              ) : !newCandidateMode ? (
                <select value={form.candidateId} onChange={(e) => setField('candidateId', e.target.value)} required>
                  <option value="">Select candidate…</option>
                  {candidates.map((c) => <option key={c.candidateId} value={c.candidateId}>{c.candidateName}</option>)}
                </select>
              ) : (
                <div className="form-grid cols-3" style={{ gap: 8 }}>
                  <input placeholder="Name" value={newCandidate.candidateName} onChange={(e) => setNewCandidate({ ...newCandidate, candidateName: e.target.value })} />
                  <input placeholder="Mobile" value={newCandidate.mobileNumber} onChange={(e) => setNewCandidate({ ...newCandidate, mobileNumber: e.target.value })} />
                  <input placeholder="Experience (e.g. 7+)" value={newCandidate.overallExperience} onChange={(e) => setNewCandidate({ ...newCandidate, overallExperience: e.target.value })} />
                  <input placeholder="Current role" value={newCandidate.currentRole} onChange={(e) => setNewCandidate({ ...newCandidate, currentRole: e.target.value })} />
                  <button type="button" className="btn btn-primary btn-sm" onClick={handleAddCandidate}>Save candidate</button>
                </div>
              )}
              {!isEdit && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: '4px 0' }} onClick={() => setNewCandidateMode((v) => !v)}>
                  {newCandidateMode ? 'Cancel' : '+ New candidate'}
                </button>
              )}
              {form.candidateId && !newCandidateMode && (
                <div style={{ marginTop: 8 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--ink-muted)' }}>Candidate resume (module 5)</label>
                  <input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} disabled={resumeUploading} />
                </div>
              )}
            </div>

            <div className="field">
              <label>Level of interview</label>
              <select value={form.levelOfInterview} onChange={(e) => setField('levelOfInterview', e.target.value)}>
                <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
                <option value="HR">HR</option><option value="CLIENT">Client</option>
              </select>
            </div>

            <div className="field"><label>Panel member name</label><input value={form.panelMemberName} onChange={(e) => setField('panelMemberName', e.target.value)} /></div>
            <div className="field"><label>Recruiter / scheduler name</label><input value={form.recruiterName} onChange={(e) => setField('recruiterName', e.target.value)} /></div>
            <div className="field">
              <label>Mode of interview</label>
              <select value={form.modeOfInterview} onChange={(e) => setField('modeOfInterview', e.target.value)}>
                <option value="VIRTUAL">Virtual</option><option value="IN_PERSON">In-person</option><option value="TELEPHONIC">Telephonic</option>
              </select>
            </div>
            <div className="field"><label>Date of interview</label><input type="date" value={form.interviewDate} onChange={(e) => setField('interviewDate', e.target.value)} /></div>
            <div className="field">
              <label>Scheduled at (module 3)</label>
              <input type="datetime-local" value={form.scheduledAt} onChange={(e) => setField('scheduledAt', e.target.value)} />
            </div>
            <div className="field span-2"><label>Domain knowledge</label><input placeholder="e.g. Banking, Logistics & Supply Chain" value={form.domainKnowledge} onChange={(e) => setField('domainKnowledge', e.target.value)} /></div>
            <div className="field"><label>Domain feedback</label><input value={form.domainFeedback} onChange={(e) => setField('domainFeedback', e.target.value)} /></div>
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <SkillAssessmentTable
              title="Panel skill ratings"
              rows={form.internalSkillAssessments}
              onChange={(rows) => setField('internalSkillAssessments', rows)}
              showSelfRating
              skillOptions={skillOptions}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <CodingRoundTable rows={form.codingRounds} onChange={(rows) => setField('codingRounds', rows)} />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-body">
            <SkillAssessmentTable
              title="To be filled by client technical panel"
              rows={form.clientSkillAssessments}
              onChange={(rows) => setField('clientSkillAssessments', rows)}
              showSelfRating={false}
              skillOptions={skillOptions}
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Final summary</h3></div>
          <div className="card-body form-grid cols-3">
            <div className="field"><label>Communication rating</label><input type="number" min="1" max="5" step="0.5" value={form.communicationRating} onChange={(e) => setField('communicationRating', e.target.value)} /></div>
            <div className="field"><label>Final rating</label><input type="number" min="1" max="5" step="0.5" value={form.finalRating} onChange={(e) => setField('finalRating', e.target.value)} /></div>
            <div className="field"><label>Panel recommendation</label><input placeholder="e.g. L2 Selected" value={form.panelRecommendation} onChange={(e) => setField('panelRecommendation', e.target.value)} /></div>
            <div className="field span-2"><label>Interview screenshot URL (optional)</label><input value={form.interviewScreenshotUrl} onChange={(e) => setField('interviewScreenshotUrl', e.target.value)} /></div>
            {isEdit && (
              <div className="field span-2">
                <label>Or upload a screenshot / export file (module 5)</label>
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleScreenshotUpload} />
                {screenshotAttachments.length > 0 && (
                  <ul style={{ margin: '6px 0 0', paddingLeft: 18, fontSize: 13 }}>
                    {screenshotAttachments.map((a) => (
                      <li key={a.attachmentId}><a href={attachmentDownloadHref(a.attachmentId)} target="_blank" rel="noreferrer">{a.originalFilename}</a></li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            <div className="field span-2" style={{ gridColumn: '1 / -1' }}>
              <label>Overall assessment (detailed feedback)</label>
              <textarea rows={3} value={form.overallAssessment} onChange={(e) => setField('overallAssessment', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className={isEdit ? 'btn btn-secondary' : 'btn btn-primary'} type="submit" disabled={saving}>
            {saving ? 'Saving…' : (isEdit ? 'Save draft' : 'Save assessment')}
          </button>
          {isEdit && (
            <button className="btn btn-primary" type="button" onClick={handleSubmitFeedback} disabled={saving}>
              {saving ? 'Submitting…' : 'Submit feedback'}
            </button>
          )}
          <button className="btn btn-ghost" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
        {isEdit && (
          <p style={{ color: 'var(--ink-muted)', fontSize: 12.5, marginTop: 8 }}>
            "Save draft" keeps your changes without notifying anyone. "Submit feedback" finalises the assessment,
            marks the interview as submitted, and emails the recruiter to review it.
          </p>
        )}
      </form>
    </div>
  );
}
