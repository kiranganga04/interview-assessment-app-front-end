import React from 'react';
import { Navigate } from 'react-router-dom';

export function ProtectedRoute({ auth, children }) {
  return auth ? children : <Navigate to="/signin" replace />;
}

export function PublicOnlyRoute({ auth, children }) {
  return auth ? <Navigate to="/dashboard" replace /> : children;
}

/**
 * Module 2: gate a route to one or more roles once the user is already known to be signed in.
 * `redirectTo` defaults to "/dashboard" (accessible to every role) rather than any role-gated
 * route -- pointing it at another RoleRoute-protected path would create a redirect loop for
 * whichever role gets bounced from both.
 */
export function RoleRoute({ auth, roles, redirectTo = '/dashboard', children }) {
  if (!auth) return <Navigate to="/signin" replace />;
  if (!roles.includes(auth.role)) return <Navigate to={redirectTo} replace />;
  return children;
}
