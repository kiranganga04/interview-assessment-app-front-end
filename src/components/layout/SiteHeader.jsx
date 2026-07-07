import React from 'react';
import { NavLink } from 'react-router-dom';
import { productName, productTagline } from '../../config/navigation';

export default function SiteHeader({ auth, onLogout }) {
  const isAdmin = auth?.role === 'ADMIN';
  // Assessments (the full list/browse view) is ADMIN/RECRUITER only -- PANEL submits and manages
  // their own assessments via "New assessment" but doesn't browse everyone else's. Kept in sync
  // with the RoleRoute on /interviews in App.jsx and the @PreAuthorize on InterviewController.list().
  const canBrowseAssessments = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';

  return (
    <header className="site-header">
      <div className="product-nav-wrap">
        <div className="product-nav">
          <div className="app-title">
            <span className="mark">IA</span>
            <span>
              <strong>{productName}</strong>
              <small>{productTagline}</small>
            </span>
          </div>

          <nav className="app-nav" aria-label="Application navigation">
            {!auth && <NavLink to="/signin" className={({ isActive }) => isActive ? 'active' : ''}>Sign in</NavLink>}
            {!auth && <NavLink to="/signup" className={({ isActive }) => isActive ? 'active' : ''}>Sign up</NavLink>}
            {auth && <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'active' : ''}>Dashboard</NavLink>}
            {auth && canBrowseAssessments && <NavLink to="/interviews" className={({ isActive }) => isActive ? 'active' : ''}>Assessments</NavLink>}
            {auth && <NavLink to="/interviews/new" className={({ isActive }) => isActive ? 'active' : ''}>New assessment</NavLink>}
            {auth && isAdmin && <NavLink to="/users" className={({ isActive }) => isActive ? 'active' : ''}>Users</NavLink>}
            {auth && (
              <span className="nav-user" title={auth.email}>
                {auth.fullName} <span className="role-chip">{auth.role}</span>
              </span>
            )}
            {auth && <button type="button" className="nav-button" onClick={onLogout}>Sign out</button>}
          </nav>
        </div>
      </div>
    </header>
  );
}
