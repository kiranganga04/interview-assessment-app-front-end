import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { productName } from '../../config/navigation';

/**
 * Left sidebar navigation, grouped like: Dashboard / People Management /
 * Interview Management / Feedback & Reports / Administration. Replaces the old top nav bar
 * (SiteHeader.jsx, now unused) -- every route it links to already existed before this
 * redesign except the new Schedule Interview / Interview Slots / Interviewers / Candidates /
 * Analytics pages, so nothing that worked before is missing here, just regrouped.
 */
export default function Sidebar({ auth }) {
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = auth?.role === 'ADMIN';
  const isPanel = auth?.role === 'PANEL';
  const canManageResourcing = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';
  const canBrowseAssessments = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';

  const groups = [
    {
      title: 'Dashboard',
      items: [
        { to: '/dashboard', label: 'Overview', show: true },
        { to: '/analytics', label: 'Analytics', show: canBrowseAssessments }
      ]
    },
    {
      title: 'People Management',
      items: [
        { to: '/candidates', label: 'Candidates', show: canManageResourcing },
        { to: '/interviewers', label: 'Interviewers', show: canManageResourcing },
        { to: '/teams', label: 'Teams', show: canManageResourcing }
      ]
    },
    {
      title: 'Interview Management',
      items: [
        { to: '/interview-slots', label: 'Interview Slots', show: canManageResourcing },
        { to: '/interviews/schedule', label: 'Schedule Interview', show: canManageResourcing },
        { to: '/interview-slots/bulk-import', label: 'Bulk Import', show: canManageResourcing }
      ]
    },
    {
      title: 'Feedback & Reports',
      items: [
        { to: '/interviews', label: 'Assessments', show: canBrowseAssessments },
        { to: '/interviews/new', label: 'New assessment', show: canBrowseAssessments },
        { to: '/my-interviews', label: 'My Interviews', show: isPanel }
      ]
    },
    {
      title: 'Administration',
      items: [
        { to: '/users', label: 'Users', show: isAdmin }
      ]
    }
  ].map((group) => ({ ...group, items: group.items.filter((item) => item.show) }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`} aria-label="Primary navigation">
      <div className="sidebar-brand">
        <span className="mark">IA</span>
        {!collapsed && <strong>{productName}</strong>}
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? '»' : '«'}
        </button>
      </div>

      <nav className="sidebar-nav">
        {groups.map((group) => (
          <div className="sidebar-group" key={group.title}>
            {!collapsed && <div className="sidebar-group-title">{group.title}</div>}
            {group.items.map((item) => (
              item.soon ? (
                <span className="sidebar-link soon" key={item.label} title="Coming soon">
                  {!collapsed && <span>{item.label}</span>}
                  {!collapsed && <small>Soon</small>}
                </span>
              ) : (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                  title={item.label}
                >
                  {!collapsed && <span>{item.label}</span>}
                </NavLink>
              )
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
