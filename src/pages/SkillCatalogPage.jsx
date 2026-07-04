import React, { useEffect, useState } from 'react';
import { listAllSkills, createSkill, updateSkill, deleteSkill } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

/** Module 4 (admin-only): manage the skill catalog that the assessment form's dropdown pulls from. */
export default function SkillCatalogPage() {
  const toast = useToast();
  const [skills, setSkills] = useState([]);
  const [form, setForm] = useState({ name: '', applicableLevels: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    listAllSkills().then(setSkills).catch((e) => setError(e?.response?.data?.message || 'Failed to load skills.')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    try {
      await createSkill(form);
      setForm({ name: '', applicableLevels: '' });
      toast.success('Skill added.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add skill.');
    }
  };

  const toggleActive = async (skill) => {
    try {
      await updateSkill(skill.skillId, { ...skill, active: !skill.active });
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update skill.');
    }
  };

  const remove = async (skill) => {
    if (!window.confirm(`Remove "${skill.name}" from the catalog?`)) return;
    try {
      await deleteSkill(skill.skillId);
      toast.success('Skill removed.');
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to remove skill.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Administration</div>
          <h1>Skill catalog</h1>
          <p>Panelists pick from this list on the assessment form instead of retyping skill names.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body form-grid cols-3">
          <div className="field">
            <label>Skill name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Kubernetes" />
          </div>
          <div className="field">
            <label>Applicable levels (optional)</label>
            <input value={form.applicableLevels} onChange={(e) => setForm({ ...form, applicableLevels: e.target.value })} placeholder="e.g. L2,L3" />
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="button" onClick={handleCreate}>+ Add skill</button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading skills...</div>}

      {!loading && (
        <div className="card data-card">
          <table>
            <thead><tr><th>Skill</th><th>Applicable levels</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {skills.length === 0 && <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No skills yet.</td></tr>}
              {skills.map((skill) => (
                <tr key={skill.skillId}>
                  <td><strong>{skill.name}</strong></td>
                  <td>{skill.applicableLevels || 'All levels'}</td>
                  <td><span className="pill">{skill.active ? 'Active' : 'Inactive'}</span></td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(skill)}>{skill.active ? 'Deactivate' : 'Activate'}</button>
                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--r1)' }} onClick={() => remove(skill)}>Remove</button>
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
