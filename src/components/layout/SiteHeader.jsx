import React from 'react';
import { NavLink } from 'react-router-dom';
import { companyLinks, optimumLogo } from '../../config/navigation';

export default function SiteHeader({ auth, onLogout }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <a className="company-logo" href="https://theoptimum.net/" target="_blank" rel="noreferrer" aria-label="Optimum Solutions">
          <img src={optimumLogo} alt="Optimum Solutions" />
        </a>

        <nav className="company-nav" aria-label="Company navigation">
          {companyLinks.map((link) => (
            <a key={link.label} href={link.href} target="_blank" rel="noreferrer">{link.label}</a>
          ))}
        </nav>
      </div>

      <div className="product-nav-wrap">
        <div className="product-nav">
          <div className="app-title">
            <span className="mark">IA</span>
            <span>
              <strong>Interview Assessment</strong>
              <small>Panel evaluation workspace</small>
            </span>
          </div>

          <nav className="app-nav" aria-label="Application navigation">
            {!auth && <NavLink to="/signin" className={({ isActive }) => isActive ? 'active' : ''}>Sign in</NavLink>}
            {!auth && <NavLink to="/signup" className={({ isActive }) => isActive ? 'active' : ''}>Sign up</NavLink>}
            {auth && <NavLink to="/interviews" className={({ isActive }) => isActive ? 'active' : ''}>Assessments</NavLink>}
            {auth && <NavLink to="/interviews/new" className={({ isActive }) => isActive ? 'active' : ''}>New assessment</NavLink>}
            {auth && <button type="button" className="nav-button" onClick={onLogout}>Sign out</button>}
          </nav>
        </div>
      </div>
    </header>
  );
}
