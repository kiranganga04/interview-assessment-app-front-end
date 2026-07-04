import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import InterviewListPage from './pages/InterviewListPage';
import InterviewFormPage from './pages/InterviewFormPage';
import InterviewDetailPage from './pages/InterviewDetailPage';
import AuthPage from './pages/AuthPage';
import { clearAuth, getStoredAuth } from './api/apiClient';
import SiteHeader from './components/layout/SiteHeader';
import SiteFooter from './components/layout/SiteFooter';
import { ProtectedRoute, PublicOnlyRoute } from './components/layout/RouteGuards';

export default function App() {
  const [auth, setAuth] = useState(() => getStoredAuth());

  const logout = () => {
    clearAuth();
    setAuth(null);
  };

  return (
    <div className="app-shell">
      <SiteHeader auth={auth} onLogout={logout} />

      <Routes>
        <Route path="/" element={<Navigate to={auth ? '/interviews' : '/signin'} replace />} />
        <Route path="/signin" element={<PublicOnlyRoute auth={auth}><AuthPage mode="signin" onAuthenticated={setAuth} /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute auth={auth}><AuthPage mode="signup" onAuthenticated={setAuth} /></PublicOnlyRoute>} />
        <Route path="/interviews" element={<ProtectedRoute auth={auth}><InterviewListPage /></ProtectedRoute>} />
        <Route path="/interviews/new" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />
        <Route path="/interviews/:id" element={<ProtectedRoute auth={auth}><InterviewDetailPage /></ProtectedRoute>} />
        <Route path="/interviews/:id/edit" element={<ProtectedRoute auth={auth}><InterviewFormPage /></ProtectedRoute>} />
      </Routes>

      <SiteFooter />
    </div>
  );
}
