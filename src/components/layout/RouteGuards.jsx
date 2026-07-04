import React from 'react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ auth, children }) {
  return auth ? children : <Navigate to="/signin" replace />;
}

export function PublicOnlyRoute({ auth, children }) {
  return auth ? <Navigate to="/interviews" replace /> : children;
}

/** Module 2: gate a route to one or more roles once the user is already known to be signed in. */
export function RoleRoute({ auth, roles, children }) {
  if (!auth) return <Navigate to="/signin" replace />;
  if (!roles.includes(auth.role)) return <Navigate to="/interviews" replace />;
  return children;
}
