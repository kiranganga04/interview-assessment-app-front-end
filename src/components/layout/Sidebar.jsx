import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { productName } from '../../config/navigation';
import { Icon } from '../Icon';

/**
 * Left sidebar navigation, grouped like: Dashboard / People Management /
 * Interview Management / Feedback & Reports / Administration.
 *
 * Collapsed mode shows icon-only: every item carries a real icon (not just hidden text), plus an
 * explicit aria-label and title so the accessible name and hover tooltip both survive once the
 * visible label disappears -- a collapsed rail with neither was effectively unusable.
 */
export default function Sidebar({ auth, mobileOpen = false, onCloseMobile }) {
  const [collapsed, setCollapsed] = useState(false);
  const isAdmin = auth?.role === 'ADMIN';
  const isPanel = auth?.role === 'PANEL';
  const canManageResourcing = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';
  const canBrowseAssessments = auth?.role === 'ADMIN' || auth?.role === 'RECRUITER';

  const groups = [
    {
      title: 'Dashboard',
      items: [
        { to: '/dashboard', label: 'Overview', icon: 'overview', show: true },
        { to: '/analytics', label: 'Analytics', icon: 'status', show: canBrowseAssessments }
      ]
    },
    {
      title: 'People Management',
      items: [
        { to: '/candidates', label: 'Candidates', icon: 'candidates', show: canManageResourcing },
        { to: '/interviewers', label: 'Interviewers', icon: 'interviewers', show: canManageResourcing },
        { to: '/teams', label: 'Teams', icon: 'teams', show: canManageResourcing }
      ]
    },
    {
      title: 'Interview Management',
      items: [
        { to: '/interview-slots', label: 'Interview Slots', icon: 'today', show: canManageResourcing },
        { to: '/interviews/schedule', label: 'Schedule Interview', icon: 'agenda', show: canManageResourcing },
        { to: '/interview-slots/bulk-import', label: 'Bulk Import', icon: 'upload', show: canManageResourcing }
      ]
    },
    {
      title: 'Feedback & Reports',
      items: [
        { to: '/interviews', label: 'Assessments', icon: 'interviews', show: canBrowseAssessments },
        { to: '/interviews/new', label: 'New assessment', icon: 'plus', show: canBrowseAssessments },
        { to: '/my-interviews', label: 'My Interviews', icon: 'agenda', show: isPanel },
        { to: '/my-interview-history', label: 'My Interview History', icon: 'history', show: isPanel }
      ]
    },
    {
      title: 'Administration',
      items: [
        { to: '/users', label: 'Users', icon: 'users', show: isAdmin }
      ]
    }
  ].map((group) => ({ ...group, items: group.items.filter((item) => item.show) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Below 900px the sidebar becomes a fixed off-canvas drawer (see index.css); this backdrop
          only renders/shows there, via CSS, and lets a tap outside the drawer close it. */}
      <div
        className={`sidebar-backdrop${mobileOpen ? ' show' : ''}`}
        onClick={onCloseMobile}
        aria-hidden="true"
      />
      <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`} aria-label="Primary navigation">
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
            <Icon name="chevron" className={collapsed ? '' : 'flip'} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {groups.map((group) => (
            <div className="sidebar-group" key={group.title}>
              {!collapsed && <div className="sidebar-group-title">{group.title}</div>}
              {group.items.map((item) => (
                item.soon ? (
                  <span className="sidebar-link soon" key={item.label} title="Coming soon">
                    <span className="sidebar-link-icon"><Icon name={item.icon} /></span>
                    {!collapsed && <span>{item.label}</span>}
                    {!collapsed && <small>Soon</small>}
                  </span>
                ) : (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end
                    className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
                    title={item.label}
                    aria-label={collapsed ? item.label : undefined}
                    onClick={onCloseMobile}
                  >
                    <span className="sidebar-link-icon"><Icon name={item.icon} /></span>
                    {!collapsed && <span>{item.label}</span>}
                  </NavLink>
                )
              ))}
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
