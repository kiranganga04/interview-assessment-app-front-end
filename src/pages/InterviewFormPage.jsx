import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  listCandidates, createCandidate,
  getInterview, createInterview, updateInterview
} from '../api/apiClient';
import SkillAssessmentTable from '../components/SkillAssessmentTable';
import CodingRoundTable from '../components/CodingRoundTable';

const DEFAULT_SKILLS = ['Core Java', 'Springboot, API', 'Microservices', 'SQL', 'Coding', 'Design patterns']
  .map((name, i) => ({ skillOrder: i + 1, skillName: name, selfRating: '', rating: '', feedback: '' }));

const emptyForm = {
  candidateId: '',
  panelMemberName: '',
  recruiterName: '',
  levelOfInterview: 'L1',
  modeOfInterview: 'VIRTUAL',
  interviewDate: '',
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

  const [form, setForm] = useState(emptyForm);
  const [candidates, setCandidates] = useState([]);
  const [newCandidateMode, setNewCandidateMode] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ candidateName: '', mobileNumber: '', overallExperience: '', currentRole: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listCandidates().then(setCandidates).catch(() => {});
    if (isEdit) {
      getInterview(id).then((iv) => {
        setForm({
          candidateId: iv.candidateId,
          panelMemberName: iv.panelMemberName || '',
          recruiterName: iv.recruiterName || '',
          levelOfInterview: iv.levelOfInterview || 'L1',
          modeOfInterview: iv.modeOfInterview || 'VIRTUAL',
          interviewDate: iv.interviewDate || '',
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
      }).catch((e) => setError(e?.response?.data?.message || 'Failed to load record.'));
    }
  }, [id, isEdit]);

  const setField = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const handleAddCandidate = async () => {
    if (!newCandidate.candidateName.trim()) return;
    const created = await createCandidate(newCandidate);
    setCandidates((c) => [...c, created]);
    setField('candidateId', created.candidateId);
    setNewCandidateMode(false);
    setNewCandidate({ candidateName: '', mobileNumber: '', overallExperience: '', currentRole: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.candidateId) {
      setError('Please select or create a candidate first.');
      return;
    }
    setSaving(true);
    const payload = {
      ...form,
      candidateId: Number(form.candidateId),
      communicationRating: form.communicationRating === '' ? null : Number(form.communicationRating),
      finalRating: form.finalRating === '' ? null : Number(form.finalRating),
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
    };
    try {
      const saved = isEdit ? await updateInterview(id, payload) : await createInterview(payload);
      navigate(`/interviews/${saved.interviewId}`);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save assessment.');
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
              {!newCandidateMode ? (
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
              <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start', padding: '4px 0' }} onClick={() => setNewCandidateMode((v) => !v)}>
                {newCandidateMode ? 'Cancel' : '+ New candidate'}
              </button>
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
            />
          </div>
        </div>

        <div className="card" style={{ marginBottom: 20 }}>
          <div className="card-header"><h3>Final summary</h3></div>
          <div className="card-body form-grid cols-3">
            <div className="field"><label>Communication rating</label><input type="number" min="1" max="5" step="0.5" value={form.communicationRating} onChange={(e) => setField('communicationRating', e.target.value)} /></div>
            <div className="field"><label>Final rating</label><input type="number" min="1" max="5" step="0.5" value={form.finalRating} onChange={(e) => setField('finalRating', e.target.value)} /></div>
            <div className="field"><label>Panel recommendation</label><input placeholder="e.g. L2 Selected" value={form.panelRecommendation} onChange={(e) => setField('panelRecommendation', e.target.value)} /></div>
            <div className="field span-2"><label>Interview screenshot URL</label><input value={form.interviewScreenshotUrl} onChange={(e) => setField('interviewScreenshotUrl', e.target.value)} /></div>
            <div className="field span-2" style={{ gridColumn: '1 / -1' }}>
              <label>Overall assessment (detailed feedback)</label>
              <textarea rows={3} value={form.overallAssessment} onChange={(e) => setField('overallAssessment', e.target.value)} />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save assessment'}</button>
          <button className="btn btn-secondary" type="button" onClick={() => navigate(-1)}>Cancel</button>
        </div>
      </form>
    </div>
  );
}
