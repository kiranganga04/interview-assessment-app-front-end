import React, { useEffect, useState } from 'react';
import { listInterviewSlots, searchInterviewSlots, createInterviewSlot, cancelInterviewSlot, listInterviewers } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

const MODES = ['VIRTUAL', 'IN_PERSON', 'TELEPHONIC'];
const MODE_LABEL = { VIRTUAL: 'Online', IN_PERSON: 'In-Person', TELEPHONIC: 'Telephonic' };
const EMPTY_FORM = { interviewerId: '', slotDate: '', startTime: '', endTime: '', mode: 'VIRTUAL', technology: '' };
const PAGE_SIZE = 10;

function startOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Interview Management (admin/recruiter-only): interviewer availability windows the Schedule
 * Interview wizard books against. The table's search/filter/sort/pagination are server-side
 * (page/size/sort + search/status/mode against GET /api/interview-slots/search), mirroring the
 * Assessment records list. The summary cards above the table (Total slots, Online/Virtual, This
 * week, etc.) are whole-directory counts, not just the current page, so they're fed by a
 * separate unpaginated listInterviewSlots() call -- the same pattern already used on this page
 * for the Interviewer dropdown, and cheap at this table's realistic size.
 */
export default function InterviewSlotsPage() {
  const toast = useToast();
  const [pageData, setPageData] = useState({ content: [], page: 0, size: PAGE_SIZE, totalElements: 0, totalPages: 0 });
  const [allSlots, setAllSlots] = useState([]);
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modeFilter, setModeFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState('slotDate');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);

  const toggleSort = (key) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };
  const sortArrow = (key) => (sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');

  const load = () => {
    setLoading(true);
    setError('');
    const params = { page, size: PAGE_SIZE, sort: `${sortKey},${sortDir}` };
    if (search.trim()) params.search = search.trim();
    if (statusFilter !== 'ALL') params.status = statusFilter;
    if (modeFilter !== 'ALL') params.mode = modeFilter;
    searchInterviewSlots(params)
      .then(setPageData)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load interview slots.'))
      .finally(() => setLoading(false));
  };

  const loadStats = () => {
    listInterviewSlots().then(setAllSlots).catch(() => {});
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(load, [page, search, statusFilter, modeFilter, sortKey, sortDir]);

  useEffect(() => {
    loadStats();
    listInterviewers().then(setInterviewers).catch(() => {});
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.interviewerId || !form.slotDate || !form.startTime || !form.endTime) {
      toast.error('Please select an interviewer, date, start time, and end time.');
      return;
    }
    setSaving(true);
    try {
      await createInterviewSlot(form);
      setForm(EMPTY_FORM);
      toast.success('Slot added.');
      load();
      loadStats();
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
      loadStats();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to cancel slot.');
    }
  };

  const today = new Date();
  const weekStart = startOfWeek(today);
  const totalSlots = allSlots.length;
  const onlineCount = allSlots.filter((s) => s.mode === 'VIRTUAL').length;
  const inPersonCount = allSlots.filter((s) => s.mode === 'IN_PERSON').length;
  const thisWeekCount = allSlots.filter((s) => new Date(s.slotDate) >= weekStart).length;
  const technologyCount = new Set(allSlots.map((s) => s.technology).filter(Boolean)).size;
  const todayCount = allSlots.filter((s) => s.slotDate === today.toISOString().slice(0, 10)).length;

  const slots = pageData.content || [];
  const hasActiveFilter = Boolean(search.trim()) || statusFilter !== 'ALL' || modeFilter !== 'ALL';

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
          <div className="card-body form-grid cols-4" style={{ paddingBottom: 0 }}>
            <div className="field" style={{ gridColumn: 'span 2' }}>
              <label>Search</label>
              <input value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} placeholder="Search slot ID, employee, email, technology..." />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={statusFilter} onChange={(e) => { setPage(0); setStatusFilter(e.target.value); }}>
                <option value="ALL">All</option>
                <option value="AVAILABLE">Available</option>
                <option value="BOOKED">Booked</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>
            <div className="field">
              <label>Mode</label>
              <select value={modeFilter} onChange={(e) => { setPage(0); setModeFilter(e.target.value); }}>
                <option value="ALL">All</option>
                {MODES.map((m) => <option key={m} value={m}>{MODE_LABEL[m]}</option>)}
              </select>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="sortable" onClick={() => toggleSort('slotCode')}>Slot ID{sortArrow('slotCode')}</th>
                  <th className="sortable" onClick={() => toggleSort('interviewerName')}>Employee{sortArrow('interviewerName')}</th>
                  <th>Email</th>
                  <th>Contact</th>
                  <th className="sortable" onClick={() => toggleSort('technology')}>Skill set{sortArrow('technology')}</th>
                  <th className="sortable" onClick={() => toggleSort('slotDate')}>Date{sortArrow('slotDate')}</th>
                  <th className="sortable" onClick={() => toggleSort('startTime')}>Time{sortArrow('startTime')}</th>
                  <th>Technology</th>
                  <th className="sortable" onClick={() => toggleSort('mode')}>Mode{sortArrow('mode')}</th>
                  <th className="sortable" onClick={() => toggleSort('status')}>Status{sortArrow('status')}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {slots.length === 0 && (
                  <tr>
                    <td colSpan={11} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>
                      {hasActiveFilter ? 'No slots match your search/filter.' : 'No slots yet.'}
                    </td>
                  </tr>
                )}
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
          {pageData.totalElements > 0 && (
            <div className="pagination">
              <button className="btn btn-ghost btn-sm" disabled={page <= 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>← Previous</button>
              <span>Page {pageData.page + 1} of {Math.max(pageData.totalPages, 1)} · {pageData.totalElements} slot{pageData.totalElements !== 1 ? 's' : ''}</span>
              <button className="btn btn-ghost btn-sm" disabled={page + 1 >= pageData.totalPages} onClick={() => setPage((p) => p + 1)}>Next →</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
