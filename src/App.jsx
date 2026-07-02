import React from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import InterviewListPage from './pages/InterviewListPage';
import InterviewFormPage from './pages/InterviewFormPage';
import InterviewDetailPage from './pages/InterviewDetailPage';

export default function App() {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="mark">IA</span>
          Interview Assessment
        </div>
        <nav>
          <NavLink to="/interviews" className={({ isActive }) => isActive ? 'active' : ''}>Assessments</NavLink>
          <NavLink to="/interviews/new" className={({ isActive }) => isActive ? 'active' : ''}>New assessment</NavLink>
        </nav>
      </header>

      <Routes>
        <Route path="/" element={<Navigate to="/interviews" replace />} />
        <Route path="/interviews" element={<InterviewListPage />} />
        <Route path="/interviews/new" element={<InterviewFormPage />} />
        <Route path="/interviews/:id" element={<InterviewDetailPage />} />
        <Route path="/interviews/:id/edit" element={<InterviewFormPage />} />
      </Routes>
    </div>
  );
}
