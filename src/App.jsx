import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InterviewListPage from './pages/InterviewListPage';
import InterviewFormPage from './pages/InterviewFormPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import CandidatesPage from './pages/CandidatesPage';
import InterviewersPage from './pages/InterviewersPage';
import InterviewSlotsPage from './pages/InterviewSlotsPage';
import ScheduleInterviewPage from './pages/ScheduleInterviewPage';
import { clearAuth, getStoredAuth, signOut } from './api/apiClient';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import SiteFooter from './components/layout/SiteFooter';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/layout/RouteGuards';
import { ToastProvider } from './components/layout/ToastProvider';

/**
 * Module: sidebar shell replaces the old top-nav (SiteHeader.jsx -- now unused but left in
 * place, same treatment as SkillCatalogPage.jsx) for signed-in users. Signed-out/auth pages
 * intentionally render without the sidebar/topbar, matching the old header's behavior of
 * still showing on those pages minimally -- there is nothing to navigate to before sign-in.
 */
export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const logout = () => {
    signOut();
    clearAuth();
    setAuth(null);
  };

  const routes = (
    <Routes>
      <Route path="/" element={<Navigate to={auth ? '/dashboard' : '/signin'} replace />} />
      <Route path="/signin" element={<PublicOnlyRoute auth={auth}><AuthPage mode="signin" onAuthenticated={setAuth} /></PublicOnlyRoute>} />
      <Route path="/signup" element={<PublicOnlyRoute auth={auth}><AuthPage mode="signup" onAuthenticated={setAuth} /></PublicOnlyRoute>} />
      <Route path="/forgot-password" element={<PublicOnlyRoute auth={auth}><ForgotPasswordPage /></PublicOnlyRoute>} />
      <Route path="/reset-password" element={<PublicOnlyRoute auth={auth}><ResetPasswordPage /></PublicOnlyRoute>} />

      <Route path="/dashboard" element={<ProtectedRoute auth={auth}><DashboardPage /></ProtectedRoute>} />
      <Route path="/analytics" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><AnalyticsPage /></RoleRoute>} />

      {/* PANEL can create/view/manage individual assessments, but not browse the full list -- see InterviewController.list() on the backend for the matching @PreAuthorize. */}
      <Route path="/interviews" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewListPage auth={auth} /></RoleRoute>} />
      <Route path="/interviews/new" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />
      <Route path="/interviews/schedule" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><ScheduleInterviewPage /></RoleRoute>} />
      <Route path="/interviews/:id" element={<ProtectedRoute auth={auth}><InterviewDetailPage auth={auth} /></ProtectedRoute>} />
      <Route path="/interviews/:id/edit" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />

      <Route path="/interview-slots" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewSlotsPage /></RoleRoute>} />
      <Route path="/interviewers" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewersPage /></RoleRoute>} />
      <Route path="/candidates" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><CandidatesPage /></RoleRoute>} />

      <Route path="/users" element={<RoleRoute auth={auth} roles={['ADMIN']}><UsersPage /></RoleRoute>} />

      <Route path="*" element={<Navigate to={auth ? '/dashboard' : '/signin'} replace />} />
    </Routes>
  );

  if (!auth) {
    return (
      <ToastProvider>
        <div className="app-shell">
          {routes}
          <SiteFooter />
        </div>
      </ToastProvider>
    );
  }

  return (
    <ToastProvider>
      <div className="app-shell-sidebar">
        <Sidebar auth={auth} />
        <div className="app-main">
          <TopBar auth={auth} onLogout={logout} />
          {routes}
          <SiteFooter />
        </div>
      </div>
    </ToastProvider>
  );
}
