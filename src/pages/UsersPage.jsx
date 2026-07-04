import React, { useEffect, useState } from 'react';
import { listUsers, createUser, updateUserRole } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

const ROLES = ['ADMIN', 'RECRUITER', 'PANEL'];
const EMPTY_FORM = { fullName: '', email: '', password: '', role: 'RECRUITER' };

/** Module 2 (admin-only): manage recruiter/panel/admin accounts and deactivate access. */
export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [creating, setCreating] = useState(false);

  const load = () => {
    setLoading(true);
    listUsers().then(setUsers).catch((e) => setError(e?.response?.data?.message || 'Failed to load users.')).finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) return;
    setCreating(true);
    try {
      await createUser(form);
      setForm(EMPTY_FORM);
      toast.success(`${form.fullName} added as ${form.role}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add user.');
    } finally {
      setCreating(false);
    }
  };

  const changeRole = async (user, role) => {
    try {
      await updateUserRole(user.userId, { role, active: user.active });
      toast.success(`${user.fullName} is now ${role}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update role.');
    }
  };

  const toggleActive = async (user) => {
    try {
      await updateUserRole(user.userId, { role: user.role, active: !user.active });
      toast.success(`${user.fullName} ${user.active ? 'deactivated' : 'reactivated'}.`);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update user.');
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <div className="eyebrow">Administration</div>
          <h1>User management</h1>
          <p>Control who can access the system and what they're allowed to do.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body form-grid cols-4">
          <div className="field">
            <label>Full name</label>
            <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="e.g. Priya Nair" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@example.com" />
          </div>
          <div className="field">
            <label>Temporary password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" />
          </div>
          <div className="field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
            </select>
          </div>
          <div className="field" style={{ justifyContent: 'flex-end' }}>
            <button className="btn btn-primary" type="button" disabled={creating} onClick={handleCreate}>
              {creating ? 'Adding...' : '+ Add user'}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading users...</div>}

      {!loading && (
        <div className="card data-card">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.length === 0 && <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-muted)' }}>No users yet.</td></tr>}
              {users.map((user) => (
                <tr key={user.userId}>
                  <td><strong>{user.fullName}</strong></td>
                  <td>{user.email}</td>
                  <td>
                    <select value={user.role} onChange={(e) => changeRole(user, e.target.value)}>
                      {ROLES.map((role) => <option key={role} value={role}>{role}</option>)}
                    </select>
                  </td>
                  <td><span className="pill">{user.active ? 'Active' : 'Deactivated'}</span></td>
                  <td className="row-actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(user)}>
                      {user.active ? 'Deactivate' : 'Reactivate'}
                    </button>
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
