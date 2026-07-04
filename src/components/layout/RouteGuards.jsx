import React from 'react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ auth, children }) {
  return auth ? children : <Navigate to="/signin" replace />;
}

export function PublicOnlyRoute({ auth, children }) {
  return auth ? <Navigate to="/interviews" replace /> : children;
}
