import React, { useEffect, useState } from 'react';
import {
  listAllInterviewKits, createInterviewKit, updateInterviewKit, deleteInterviewKit, listActiveSkills
} from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';
import { CardHeader } from '../components/DashboardUI';

const emptyItem = () => ({ skillName: '', suggestedQuestions: '' });

const emptyForm = () => ({
  interviewKitId: null,
  name: '',
  levelOfInterview: '',
  position: '',
  description: '',
  active: true,
  items: [emptyItem()]
});

/**
 * Structured interview kits / question banks per role: ADMIN/RECRUITER manage a reusable set of
 * skills + suggested questions tied to a role/level, so panelists don't decide from scratch what
 * to ask on every interview for the same role. Applied on the assessment form (InterviewFormPage)
 * to pre-fill the panel skill rows. Mirrors SkillCatalogPage's list+inline-form layout.
 */
export default function InterviewKitsPage() {
  const toast = useToast();
  const [kits, setKits] = useState([]);
  const [skillOptions, setSkillOptions] = useState([]);
  const [form, setForm] = useState(emptyForm());
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    listAllInterviewKits()
      .then(setKits)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load interview kits.'))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);
  useEffect(() => { listActiveSkills().then(setSkillOptions).catch(() => {}); }, []);

  const startCreate = () => {
    setForm(emptyForm());
    setEditing(true);
    setError('');
  };

  const startEdit = (kit) => {
    setForm({
      interviewKitId: kit.interviewKitId,
      name: kit.name,
      levelOfInterview: kit.levelOfInterview || '',
      position: kit.position || '',
      description: kit.description || '',
      active: kit.active,
      items: kit.items && kit.items.length ? kit.items.map((it) => ({ ...it })) : [emptyItem()]
    });
    setEditing(true);
    setError('');
  };

  const cancelEdit = () => {
    setEditing(false);
    setForm(emptyForm());
  };

  const setItem = (idx, field, value) => {
    setForm((f) => ({
      ...f,
      items: f.items.map((it, i) => (i === idx ? { ...it, [field]: value } : it))
    }));
  };

  const addItem = () => setForm((f) => ({ ...f, items: [...f.items, emptyItem()] }));

  const removeItem = (idx) => setForm((f) => ({ ...f, items: f.items.filter((_, i) => i !== idx) }));

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Kit name is required.');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        levelOfInterview: form.levelOfInterview || null,
        position: form.position,
        description: form.description,
        active: form.active,
        items: form.items
          .filter((it) => it.skillName && it.skillName.trim())
          .map((it, i) => ({ ...it, itemOrder: i + 1 }))
      };
      if (form.interviewKitId) {
        await updateInterviewKit(form.interviewKitId, payload);
        toast.success('Interview kit updated.');
      } else {
        await createInterviewKit(payload);
        toast.success('Interview kit added.');
      }
      cancelEdit();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to save the interview kit.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (kit) => {
    try {
      await updateInterviewKit(kit.interviewKitId, { ...kit, active: !kit.active });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update the interview kit.');
    }
  };

  const remove = async (kit) => {
    if (!window.confirm(`Remove "${kit.name}" from the kit list?`)) return;
    try {
      await deleteInterviewKit(kit.interviewKitId);
      toast.success('Interview kit removed.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove the interview kit.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Interview Management</div>
          <h1>Interview kits</h1>
          <p>Reusable skill + suggested-question templates per role/level — applied from the assessment form so panelists start from a consistent, prepared set of questions instead of a blank list.</p>
        </div>
        {!editing && (
          <button className="btn btn-primary" type="button" onClick={startCreate}>+ New interview kit</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {editing && (
        <form onSubmit={handleSave} className="card" style={{ marginBottom: 20 }}>
          <CardHeader icon="kit" tone="indigo" title={form.interviewKitId ? 'Edit interview kit' : 'New interview kit'} />
          <div className="card-body form-grid cols-3">
            <div className="field">
              <label>Kit name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Senior Java Developer — L2" required />
            </div>
            <div className="field">
              <label>Level (optional)</label>
              <select value={form.levelOfInterview} onChange={(e) => setForm({ ...form, levelOfInterview: e.target.value })}>
                <option value="">Any level</option>
                <option value="L1">L1</option><option value="L2">L2</option><option value="L3">L3</option>
                <option value="HR">HR</option><option value="CLIENT">Client</option>
              </select>
            </div>
            <div className="field">
              <label>Role / position (optional)</label>
              <input value={form.position} onChange={(e) => setForm({ ...form, position: e.target.value })} placeholder="e.g. Senior Java Developer" />
            </div>
            <div className="field span-3">
              <label>Description (optional)</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>

          <div className="card-body" style={{ paddingTop: 0 }}>
            <div className="section-title">Skills & suggested questions</div>
            {skillOptions.length > 0 && (
              <datalist id="kit-skill-options">
                {skillOptions.map((s) => <option key={s.skillId} value={s.name} />)}
              </datalist>
            )}
            {form.items.map((item, idx) => (
              <div key={idx} className="form-grid cols-3" style={{ gap: 8, marginBottom: 8, alignItems: 'start' }}>
                <input
                  placeholder="Skill"
                  value={item.skillName}
                  onChange={(e) => setItem(idx, 'skillName', e.target.value)}
                  list={skillOptions.length > 0 ? 'kit-skill-options' : undefined}
                />
                <textarea
                  rows={2}
                  placeholder="Suggested questions (one per line)"
                  value={item.suggestedQuestions}
                  onChange={(e) => setItem(idx, 'suggestedQuestions', e.target.value)}
                  style={{ gridColumn: 'span 1' }}
                />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeItem(idx)}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn btn-secondary btn-sm" onClick={addItem}>+ Add skill</button>
          </div>

          <div className="card-body" style={{ display: 'flex', gap: 12, paddingTop: 0 }}>
            <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save kit'}</button>
            <button className="btn btn-ghost" type="button" onClick={cancelEdit}>Cancel</button>
          </div>
        </form>
      )}

      {loading && <div className="loading">Loading interview kits...</div>}

      {!loading && !editing && (
        <div className="card data-card">
          <CardHeader icon="kit" tone="sky" title="All interview kits" subtitle={`${kits.length} kit${kits.length !== 1 ? 's' : ''}`} />
          <table>
            <thead><tr><th>Kit</th><th>Level</th><th>Position</th><th>Skills</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {kits.length === 0 && <tr><td colSpan={6} className="table-empty-row">No interview kits yet.</td></tr>}
              {kits.map((kit) => (
                <tr key={kit.interviewKitId}>
                  <td><strong>{kit.name}</strong>{kit.description && <div className="muted-cell">{kit.description}</div>}</td>
                  <td>{kit.levelOfInterview || 'Any'}</td>
                  <td>{kit.position || '—'}</td>
                  <td>{(kit.items || []).length}</td>
                  <td><span className="pill">{kit.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => startEdit(kit)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(kit)}>{kit.active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={() => remove(kit)}>Remove</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
