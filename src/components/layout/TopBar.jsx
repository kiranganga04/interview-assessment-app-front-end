import React from 'react';

/** Slim top bar shown above the routed page content: greeting + who's signed in + sign out. */
export default function TopBar({ auth, onLogout }) {
  if (!auth) {
    return null;
  }

  return (
    <div className="app-topbar">
      <div className="app-topbar-greeting">
        Welcome back, <strong>{auth.fullName}</strong>
      </div>
      <div className="app-topbar-actions">
        <span className="nav-user" title={auth.email}>
          {auth.fullName} <span className="role-chip">{auth.role}</span>
        </span>
        <button type="button" className="nav-button" onClick={onLogout}>Sign out</button>
      </div>
    </div>
  );
}
