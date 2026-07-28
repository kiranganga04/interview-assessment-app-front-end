import React from 'react';

/** Slim top bar shown above the routed page content: greeting + who's signed in + sign out.
 *  Also renders the hamburger button that opens the mobile nav drawer below 900px (hidden via
 *  CSS at desktop widths, where the sidebar is always visible). */
export default function TopBar({ auth, onLogout, onMenuClick }) {
  if (!auth) {
    return null;
  }

  return (
    <div className="app-topbar">
      <button
        type="button"
        className="sidebar-mobile-toggle"
        onClick={onMenuClick}
        aria-label="Open navigation menu"
        title="Menu"
      >
        <span />
        <span />
        <span />
      </button>
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
