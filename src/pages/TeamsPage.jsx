import React, { useEffect, useMemo, useState } from 'react';
import { listInterviewers } from '../api/apiClient';
import { CardHeader } from '../components/DashboardUI';

const UNASSIGNED_LABEL = 'Unassigned';

/**
 * People Management: a read-only roster view grouped by each Interviewer's existing
 * "Account" field (e.g. "Client A") -- no new database table, no separate team management
 * screen. A "team" here is just whatever's already in the Account field, grouped for you.
 * Interviewers with a blank/missing Account land in an "Unassigned" bucket rather than being
 * silently dropped. This intentionally doesn't try to fix typos/casing differences in Account
 * values (e.g. "Client A" vs "client a ") -- those show up as separate teams.
 */
export default function TeamsPage() {
  const [interviewers, setInterviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    listInterviewers()
      .then(setInterviewers)
      .catch((e) => setError(e?.response?.data?.message || 'Failed to load teams.'))
      .finally(() => setLoading(false));
  }, []);

  const teams = useMemo(() => {
    const groups = new Map();
    interviewers.forEach((iv) => {
      const key = (iv.account || '').trim() || UNASSIGNED_LABEL;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(iv);
    });
    return [...groups.entries()]
      .sort(([a], [b]) => {
        if (a === UNASSIGNED_LABEL) return 1;
        if (b === UNASSIGNED_LABEL) return -1;
        return a.localeCompare(b);
      })
      .map(([name, members]) => ({ name, members }));
  }, [interviewers]);

  const largestTeamSize = teams.reduce((max, t) => Math.max(max, t.members.length), 0);

  return (
    <main className="page dash-b">
      <div className="page-header">
        <div>
          <div className="eyebrow">People Management</div>
          <h1>Teams</h1>
          <p>Your interviewer directory, grouped by the Account field on each interviewer's profile.</p>
        </div>
      </div>

      <section className="metric-grid" aria-label="Team summary">
        <div className="metric-card"><span>Teams</span><strong>{teams.length}</strong></div>
        <div className="metric-card"><span>Total interviewers</span><strong>{interviewers.length}</strong></div>
        <div className="metric-card"><span>Largest team</span><strong>{largestTeamSize}</strong></div>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading">Loading teams...</div>}

      {!loading && !error && teams.length === 0 && (
        <div className="card data-card">
          <div className="empty-state">
            <div className="empty-icon">IA</div>
            <div>No interviewers yet -- add some from the Interviewers page and teams will appear here automatically.</div>
          </div>
        </div>
      )}

      {!loading && teams.map((team) => (
        <div className="card data-card" style={{ marginBottom: 20 }} key={team.name}>
          <CardHeader
            icon="interviewers"
            tone="violet"
            title={team.name}
            subtitle={`${team.members.length} interviewer${team.members.length !== 1 ? 's' : ''}`}
          />
          <div className="table-wrap">
            <table>
              <thead><tr><th>Name</th><th>Email</th><th>Grade</th><th>Level</th><th>Skills</th><th>Status</th></tr></thead>
              <tbody>
                {team.members.map((iv) => (
                  <tr key={iv.interviewerId}>
                    <td><strong>{iv.fullName}</strong></td>
                    <td>{iv.email}</td>
                    <td>{iv.grade || '-'}</td>
                    <td>{iv.levelCapability || '-'}</td>
                    <td>{iv.skillSet || '-'}</td>
                    <td><span className="pill">{iv.active ? 'Active' : 'Inactive'}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </main>
  );
}
