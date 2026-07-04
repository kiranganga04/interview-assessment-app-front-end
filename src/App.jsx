import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InterviewListPage from './pages/InterviewListPage';
import InterviewFormPage from './pages/InterviewFormPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import AuthPage from './pages/AuthPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import SkillCatalogPage from './pages/SkillCatalogPage';
import UsersPage from './pages/UsersPage';
import { clearAuth, getStoredAuth, signOut } from './api/apiClient';
import SiteHeader from './components/layout/SiteHeader';
import SiteFooter from './components/layout/SiteFooter';
import { ProtectedRoute, PublicOnlyRoute, RoleRoute } from './components/layout/RouteGuards';
import { ToastProvider } from './components/layout/ToastProvider';

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const logout = () => {
    signOut();
    clearAuth();
    setAuth(null);
  };

  return (
    <ToastProvider>
      <div className="app-shell">
        <SiteHeader auth={auth} onLogout={logout} />

        <Routes>
          <Route path="/" element={<Navigate to={auth ? '/dashboard' : '/signin'} replace />} />
          <Route path="/signin" element={<PublicOnlyRoute auth={auth}><AuthPage mode="signin" onAuthenticated={setAuth} /></PublicOnlyRoute>} />
          <Route path="/signup" element={<PublicOnlyRoute auth={auth}><AuthPage mode="signup" onAuthenticated={setAuth} /></PublicOnlyRoute>} />
          <Route path="/forgot-password" element={<PublicOnlyRoute auth={auth}><ForgotPasswordPage /></PublicOnlyRoute>} />
          <Route path="/reset-password" element={<PublicOnlyRoute auth={auth}><ResetPasswordPage /></PublicOnlyRoute>} />

          <Route path="/dashboard" element={<ProtectedRoute auth={auth}><DashboardPage /></ProtectedRoute>} />
          <Route path="/interviews" element={<ProtectedRoute auth={auth}><InterviewListPage auth={auth} /></ProtectedRoute>} />
          <Route path="/interviews/new" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />
          <Route path="/interviews/:id" element={<ProtectedRoute auth={auth}><InterviewDetailPage auth={auth} /></ProtectedRoute>} />
          <Route path="/interviews/:id/edit" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />

          <Route path="/skills" element={<RoleRoute auth={auth} roles={['ADMIN']}><SkillCatalogPage /></RoleRoute>} />
          <Route path="/users" element={<RoleRoute auth={auth} roles={['ADMIN']}><UsersPage /></RoleRoute>} />

          <Route path="*" element={<Navigate to={auth ? '/dashboard' : '/signin'} replace />} />
        </Routes>

        <SiteFooter />
      </div>
    </ToastProvider>
  );
}
