import React from 'react';
import { Icon } from './Icon';

/**
 * Shared dashboard UI kit: an icon stat tile and a card header with an icon badge, built on the
 * shared feather-style icon set in Icon.jsx. Keeps every dashboard visually consistent and
 * premium without pulling in an icon library dependency.
 */

/** Icon stat tile for the KPI row. */
export function StatCard({ icon, tone = 'indigo', label, value, sub }) {
  return (
    <div className="stat-card">
      <span className={`stat-icon tone-${tone}`}><Icon name={icon} /></span>
      <div className="stat-meta">
        <span className="stat-label">{label}</span>
        <strong className="stat-value">{value}</strong>
        {sub && <small className="stat-sub">{sub}</small>}
      </div>
    </div>
  );
}

/** Card header with an icon badge, title, optional subtitle and a right-aligned action slot. */
export function CardHeader({ icon, tone = 'indigo', title, subtitle, action }) {
  return (
    <div className="card-header">
      <div className="card-head-main">
        {icon && <span className={`card-icn tone-${tone}`}><Icon name={icon} /></span>}
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}
