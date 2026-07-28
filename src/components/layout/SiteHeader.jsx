import React from 'react';
import { NavLink } from 'react-router-dom';
import { productName, productTagline } from '../../config/navigation';

/**
 * Header for the signed-out shell (sign in / sign up / forgot / reset password) only -- App.jsx
 * never renders this once someone is authenticated (Sidebar + TopBar take over). Kept deliberately
 * minimal: brand mark + Sign in/Sign up, nothing to navigate to before you're signed in.
 */
export default function SiteHeader() {
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
            <NavLink to="/signin" className={({ isActive }) => isActive ? 'active' : ''}>Sign in</NavLink>
            <NavLink to="/signup" className={({ isActive }) => isActive ? 'active' : ''}>Sign up</NavLink>
          </nav>
        </div>
      </div>
    </header>
  );
}
