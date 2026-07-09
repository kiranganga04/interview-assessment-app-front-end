import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listInterviewSlots, listCandidates, createCandidate, scheduleInterview } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

const LEVELS = ['L1', 'L2', 'L3', 'HR', 'CLIENT'];
const MODE_LABEL = { VIRTUAL: 'Online', IN_PERSON: 'In-Person', TELEPHONIC: 'Telephonic' };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowIso() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Interview Management: books an AVAILABLE interview slot instead of free-typing a
 * panel member/date/time -- the slot determines interviewer, date/time and mode.
 * This is additive to the existing "New assessment" form (InterviewFormPage), which is
 * unchanged and still how the full assessment with skill ratings gets filled in later.
 */
export default function ScheduleInterviewPage() {
  const navigate = useNavigate();
  const toast = useToast();

  const [slotDate, setSlotDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotId, setSlotId] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [candidateId, setCandidateId] = useState('');
  const [newCandidateMode, setNewCandidateMode] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ candidateName: '', email: '', mobileNumber: '', overallExperience: '', currentRole: '' });
  const [levelOfInterview, setLevelOfInterview] = useState('L1');
  const [position, setPosition] = useState('');
  const [recruiterName, setRecruiterName] = useState('');
  const [recruiterEmail, setRecruiterEmail] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listCandidates().then(setCandidates).catch(() => {});
  }, []);

  useEffect(() => {
    if (!slotDate) {
      setSlots([]);
      setSlotId('');
      return;
    }
    setLoadingSlots(true);
    listInterviewSlots({ availableOnly: true, from: slotDate })
      .then((all) => setSlots(all.filter((s) => s.slotDate === slotDate)))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
    setSlotId('');
  }, [slotDate]);

  const selectedSlot = useMemo(() => slots.find((s) => String(s.slotId) === String(slotId)), [slots, slotId]);
  const selectedCandidate = useMemo(
    () => candidates.find((c) => String(c.candidateId) === String(candidateId)),
    [candidates, candidateId]
  );
  const isOnline = selectedSlot?.mode === 'VIRTUAL';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!slotId) { setError('Please select a date and time slot.'); return; }
    if (!newCandidateMode && !candidateId) { setError('Please select a candidate.'); return; }
    if (!newCandidateMode && candidateId && !selectedCandidate?.email) {
      setError('This candidate doesn’t have an email on file yet. Add one from the Candidates page, or use "+ New candidate instead" to enter one now.');
      return;
    }
    if (newCandidateMode && !newCandidate.candidateName.trim()) { setError('Please enter the candidate name.'); return; }
    if (newCandidateMode && !newCandidate.email.trim()) { setError('Please enter the candidate’s email so they can be notified.'); return; }
    if (!recruiterEmail.trim()) { setError('Please enter the recruiter email.'); return; }
    if (isOnline && !meetingLink.trim()) { setError('Please add a meeting link for this online interview.'); return; }

    setSaving(true);
    try {
      let resolvedCandidateId = candidateId;
      if (newCandidateMode) {
        const created = await createCandidate(newCandidate);
        resolvedCandidateId = created.candidateId;
      }
      const interview = await scheduleInterview({
        candidateId: resolvedCandidateId,
        slotId,
        levelOfInterview,
        position,
        recruiterName,
        recruiterEmail,
        meetingLink
      });
      toast.success('Interview scheduled. Confirmation emails are on their way to the interviewer, candidate, and recruiter.');
      navigate(`/interviews/${interview.interviewId}`);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to schedule interview.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Interview Management</div>
          <h1>Schedule Interview</h1>
          <p>Book an available interviewer slot for a candidate.</p>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="card-body">
          <h3 style={{ marginBottom: 12 }}>1. Select interview date</h3>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <button type="button" className={`btn ${slotDate === todayIso() ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setSlotDate(todayIso())}>Today</button>
            <button type="button" className={`btn ${slotDate === tomorrowIso() ? 'btn-primary' : 'btn-secondary'} btn-sm`} onClick={() => setSlotDate(tomorrowIso())}>Tomorrow</button>
            <input type="date" value={slotDate} onChange={(e) => setSlotDate(e.target.value)} />
          </div>

          <h3 style={{ marginBottom: 12 }}>2. Time Slot</h3>
          <div className="field" style={{ marginBottom: 6 }}>
            <select value={slotId} onChange={(e) => setSlotId(e.target.value)} disabled={!slotDate || loadingSlots}>
              <option value="">{loadingSlots ? 'Loading...' : 'Select a time slot'}</option>
              {slots.map((s) => (
                <option key={s.slotId} value={s.slotId}>
                  {s.startTime}–{s.endTime} · {s.interviewerName} · {s.technology || 'General'} · {MODE_LABEL[s.mode] || s.mode}
                </option>
              ))}
            </select>
          </div>
          <p className="muted-cell">Only active future slots are shown. {slotDate && slots.length === 0 && !loadingSlots ? '0 interviewers available for this date.' : `${slots.length} interviewer${slots.length === 1 ? '' : 's'} available`}</p>

          <h3 style={{ margin: '20px 0 12px' }}>3. Interviewer</h3>
          <div className="form-grid cols-3">
            <div className="field">
              <label>Interviewer name</label>
              <input value={selectedSlot?.interviewerName || ''} disabled placeholder="Select date and time slot first" />
            </div>
            <div className="field">
              <label>Interviewer email</label>
              <input value={selectedSlot?.interviewerEmail || ''} disabled />
            </div>
            <div className="field">
              <label>Interviewer contact</label>
              <input value={selectedSlot?.interviewerContact || ''} disabled />
            </div>
          </div>

          <h3 style={{ margin: '20px 0 12px' }}>Interview Configuration</h3>
          <div className="form-grid cols-3">
            <div className="field">
              <label>Interview type</label>
              <input value={selectedSlot ? (MODE_LABEL[selectedSlot.mode] || selectedSlot.mode) : ''} disabled placeholder="Time is auto-filled from slot selection" />
            </div>
            <div className="field">
              <label>Interview round</label>
              <select value={levelOfInterview} onChange={(e) => setLevelOfInterview(e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Position</label>
              <input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="e.g. Backend Developer" />
            </div>
            <div className="field">
              <label>Recruiter name</label>
              <input value={recruiterName} onChange={(e) => setRecruiterName(e.target.value)} placeholder="Optional" />
            </div>
            <div className="field">
              <label>Recruiter email</label>
              <input
                type="email"
                value={recruiterEmail}
                onChange={(e) => setRecruiterEmail(e.target.value)}
                placeholder="you@company.com"
                required
              />
            </div>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Meeting link{isOnline ? '' : ' (optional for this mode)'}</label>
              <input
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="Paste your Zoom or Google Meet link"
                required={isOnline}
              />
            </div>
          </div>

          <h3 style={{ margin: '20px 0 12px' }}>Candidate</h3>
          {!newCandidateMode ? (
            <div className="form-grid cols-3">
              <div className="field" style={{ gridColumn: 'span 2' }}>
                <label>Candidate</label>
                <select value={candidateId} onChange={(e) => setCandidateId(e.target.value)}>
                  <option value="">Select candidate</option>
                  {candidates.map((c) => <option key={c.candidateId} value={c.candidateId}>{c.candidateName}{c.email ? '' : ' (no email on file)'}</option>)}
                </select>
                {selectedCandidate && !selectedCandidate.email && (
                  <small style={{ color: 'var(--r1)' }}>No email on file for this candidate — add one from the Candidates page before scheduling, or add a new candidate instead.</small>
                )}
              </div>
              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewCandidateMode(true)}>+ New candidate instead</button>
              </div>
            </div>
          ) : (
            <div className="form-grid cols-3">
              <div className="field">
                <label>Candidate name</label>
                <input value={newCandidate.candidateName} onChange={(e) => setNewCandidate({ ...newCandidate, candidateName: e.target.value })} />
              </div>
              <div className="field">
                <label>Candidate email</label>
                <input
                  type="email"
                  value={newCandidate.email}
                  onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                  placeholder="candidate@example.com"
                  required
                />
              </div>
              <div className="field">
                <label>Mobile</label>
                <input value={newCandidate.mobileNumber} onChange={(e) => setNewCandidate({ ...newCandidate, mobileNumber: e.target.value })} />
              </div>
              <div className="field">
                <label>Experience</label>
                <input value={newCandidate.overallExperience} onChange={(e) => setNewCandidate({ ...newCandidate, overallExperience: e.target.value })} placeholder="e.g. 5+" />
              </div>
              <div className="field">
                <label>Current role</label>
                <input value={newCandidate.currentRole} onChange={(e) => setNewCandidate({ ...newCandidate, currentRole: e.target.value })} />
              </div>
              <div className="field" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setNewCandidateMode(false)}>Pick existing candidate instead</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn-primary" disabled={saving} onClick={handleSubmit}>
              {saving ? 'Scheduling...' : 'Schedule Interview'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
          </div>
        </div>
      </div>
    </div>
  );
}
