import React, { useEffect, useState } from 'react';
import { listUsers, updateUserRole } from '../api/apiClient';
import { useToast } from '../components/layout/ToastProvider';

const ROLES = ['ADMIN', 'RECRUITER', 'PANEL'];

/** Module 2 (admin-only): manage recruiter/panel/admin accounts and deactivate access. */
export default function UsersPage() {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = () => {
    setLoading(true);
    listUsers().then(setUsers).catch((e) => setError(e?.response?.data?.message || 'Failed to load users.')).finally(() => setLoading(false));
  };

  useEffect(load, []);

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
