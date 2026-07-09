import React, { useEffect, useState } from 'react';
import { listInterviewSlots, createInterviewSlot, cancelInterviewSlot, listInterviewers } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

const MODES = ['VIRTUAL', 'IN_PERSON', 'TELEPHONIC'];
const MODE_LABEL = { VIRTUAL: 'Online', IN_PERSON: 'In-Person', TELEPHONIC: 'Telephonic' };
const EMPTY_FORM = { interviewerId: '', slotDate: '', startTime: '', endTime: '', mode: 'VIRTUAL', technology: '' };

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/** Interview Management (admin/recruiter-only): interviewer availability windows the Schedule Interview wizard books against. */
export default function InterviewSlotsPage() {
  const toast = useToast();
  const [slots, setSlots] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    listInterviewSlots().then(setSlots).catch((e) => setError(e?.response?.data?.message || 'Failed to load interview slots.')).finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    listInterviewers().then(setInterviewers).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.interviewerId || !form.slotDate || !form.startTime || !form.endTime) return;
    setSaving(true);
    try {
      await createInterviewSlot(form);
      setForm(EMPTY_FORM);
      toast.success('Slot added.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add slot.');
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (slot) => {
    if (!window.confirm(`Cancel slot ${slot.slotCode}?`)) return;
    try {
      await cancelInterviewSlot(slot.slotId);
      toast.success('Slot cancelled.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel slot.');
    }
  };

  const today = new Date();
  const weekStart = startOfWeek(today);
  const totalSlots = slots.length;
  const onlineCount = slots.filter((s) => s.mode === 'VIRTUAL').length;
  const inPersonCount = slots.filter((s) => s.mode === 'IN_PERSON').length;
  const thisWeekCount = slots.filter((s) => new Date(s.slotDate) >= weekStart).length;
  const technologyCount = new Set(slots.map((s) => s.technology).filter(Boolean)).size;
  const todayCount = slots.filter((s) => s.slotDate === today.toISOString().slice(0, 10)).length;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Interview Management</div>
          <h1>Interview Slots</h1>
          <p>Manage interviewer availability slots.</p>
        </div>
      </div>

      <section className="metric-grid" aria-label="Slot summary">
        <div className="metric-card"><span>Total slots</span><strong>{totalSlots}</strong></div>
        <div className="metric-card"><span>Online / Virtual</span><strong>{onlineCount}</strong></div>
        <div className="metric-card"><span>In-person</span><strong>{inPersonCount}</strong></div>
        <div className="metric-card"><span>This week</span><strong>{thisWeekCount}</strong></div>
        <div className="metric-card"><span>Technologies</span><strong>{technologyCount}</strong></div>
        <div className="metric-card"><span>Today</span><strong>{todayCount}</strong></div>
      </section>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body form-grid cols-4">
          <div className="field">
            <label>Interviewer</label>
            <select value={form.interviewerId} onChange={(e) => setForm({ ...form, interviewerId: e.target.value })}>
              <option value="">Select interviewer</option>
              {interviewers.map((iv) => <option key={iv.interviewerId} value={iv.interviewerId}>{iv.fullName}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Date</label>
            <input type="date" value={form.slotDate} onChange={(e) => setForm({ ...form, slotDate: e.target.value })} />
          </div>
          <div className="field">
            <label>Start time</label>
            <input type="time" value={form.startTime} onChange={(e) => setForm({ ...form, startTime: e.target.value })} />
          </div>
          <div className="field">
            <label>End time</label>
            <input type="time" value={form.endTime} onChange={(e) => setForm({ ...form, endTime: e.target.value })} />
          </div>
          <div className="field">
            <label>Mode</label>
            <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
              {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Technology</label>
            <input value={form.technology} onChange={(e) => setForm({ ...form, technology: e.target.value })} placeholder="e.g. Java" />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end', gridColumn: 'span 2' }}>
            <button className="btn btn-primary" type="button" disabled={saving} onClick={handleCreate}>
              {saving ? 'Adding...' : '+ Add Slot'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading slots...</div>}

      {!loading && (
        <div className="card data-card">
          <div className="table-wrap">
            <table>
              <thead><tr><th>Slot ID</th><th>Employee</th><th>Email</th><th>Contact</th><th>Skill set</th><th>Date</th><th>Time</th><th>Technology</th><th>Mode</th><th>Status</th><th></th></tr></thead>
              <tbody>
                {slots.length === 0 && <tr><td colSpan={11} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No slots yet.</td></tr>}
                {slots.map((slot) => (
                  <tr key={slot.slotId}>
                    <td><span className="pill">{slot.slotCode}</span></td>
                    <td>{slot.interviewerName}</td>
                    <td>{slot.interviewerEmail}</td>
                    <td>{slot.interviewerContact || '-'}</td>
                    <td>{slot.technology || '-'}</td>
                    <td>{slot.slotDate}</td>
                    <td>{slot.startTime}–{slot.endTime}</td>
                    <td>{slot.technology || '-'}</td>
                    <td><span className="pill">{MODE_LABEL[slot.mode] || slot.mode}</span></td>
                    <td><span className={`status-chip status-${(slot.status || '').toLowerCase()}`}>{slot.status}</span></td>
                    <td className="row-actions">
                      {slot.status === 'AVAILABLE' && (
                        <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={() => cancel(slot)}>Cancel</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
