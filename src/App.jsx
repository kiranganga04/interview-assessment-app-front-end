import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InterviewListPage from './pages/InterviewListPage';
import InterviewFormPage from './pages/InterviewFormPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import RecruiterDashboardPage from './pages/RecruiterDashboardPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UsersPage from './pages/UsersPage';
import CandidatesPage from './pages/CandidatesPage';
import InterviewersPage from './pages/InterviewersPage';
import InterviewSlotsPage from './pages/InterviewSlotsPage';
import ScheduleInterviewPage from './pages/ScheduleInterviewPage';
import MyInterviewsPage from './pages/MyInterviewsPage';
import MyInterviewHistoryPage from './pages/MyInterviewHistoryPage';
import PanelDashboardPage from './pages/PanelDashboardPage';
import TeamsPage from './pages/TeamsPage';
import BulkImportSlotsPage from './pages/BulkImportSlotsPage';
import { clearAuth, getStoredAuth, signOut } from './api/apiClient';
import Sidebar from './components/layout/Sidebar';
import TopBar from './components/layout/TopBar';
import SiteHeader from './components/layout/SiteHeader';
import SiteFooter from './components/layout/SiteFooter';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/layout/RouteGuards';
import { ToastProvider } from './components/layout/ToastProvider';

/**
 * Module: sidebar shell replaces the old top-nav for signed-in users. Signed-out/auth pages
 * (sign in, sign up, forgot/reset password) get their own minimal chrome instead: SiteHeader
 * in its no-auth mode (brand + Sign in/Sign up links only, no dashboard nav) plus a compact
 * SiteFooter -- enough to feel like part of the app without dragging in the full marketing
 * footer/nav that only makes sense once someone is signed in.
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

      {/* Each role gets its own Dashboard Overview, routed here:
          PANEL   → personal dashboard built from their own interviews (PanelDashboardPage)
          RECRUITER → operational "my pipeline" dashboard (RecruiterDashboardPage)
          ADMIN   → org-wide governance dashboard (AdminDashboardPage)
          All three read RBAC-scoped report endpoints, so each sees only the data they're allowed to. */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute auth={auth}>
            {auth?.role === 'PANEL'
              ? <PanelDashboardPage />
              : auth?.role === 'ADMIN'
                ? <AdminDashboardPage />
                : <RecruiterDashboardPage />}
          </ProtectedRoute>
        }
      />
      <Route path="/analytics" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><AnalyticsPage /></RoleRoute>} />

      {/* PANEL manages individual assessments assigned to them (via My Interviews) and view/edit by id,
          but doesn't browse the full list or free-create a new record -- see InterviewController.list()/
          create() on the backend for the matching @PreAuthorize. */}
      <Route path="/interviews" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewListPage auth={auth} /></RoleRoute>} />
      <Route path="/interviews/new" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewFormPage /></RoleRoute>} />
      <Route path="/interviews/schedule" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><ScheduleInterviewPage /></RoleRoute>} />
      <Route path="/interviews/:id" element={<ProtectedRoute auth={auth}><InterviewDetailPage auth={auth} /></ProtectedRoute>} />
      <Route path="/interviews/:id/edit" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />
      <Route path="/my-interviews" element={<RoleRoute auth={auth} roles={['PANEL']}><MyInterviewsPage /></RoleRoute>} />
      <Route path="/my-interview-history" element={<RoleRoute auth={auth} roles={['PANEL']}><MyInterviewHistoryPage /></RoleRoute>} />

      <Route path="/interview-slots" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewSlotsPage /></RoleRoute>} />
      <Route path="/interview-slots/bulk-import" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><BulkImportSlotsPage /></RoleRoute>} />
      <Route path="/interviewers" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><InterviewersPage /></RoleRoute>} />
      <Route path="/candidates" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><CandidatesPage /></RoleRoute>} />
      <Route path="/teams" element={<RoleRoute auth={auth} roles={['ADMIN', 'RECRUITER']}><TeamsPage /></RoleRoute>} />

      <Route path="/users" element={<RoleRoute auth={auth} roles={['ADMIN']}><UsersPage /></RoleRoute>} />

      <Route path="*" element={<Navigate to={auth ? '/dashboard' : '/signin'} replace />} />
    </Routes>
  );

  if (!auth) {
    return (
      <ToastProvider>
        <div className="app-shell">
          <SiteHeader auth={null} />
          {routes}
          <SiteFooter compact />
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
