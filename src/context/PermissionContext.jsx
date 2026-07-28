import React, { createContext, useContext, useCallback, useEffect, useMemo, useState } from 'react';
import { getMe } from '../api/apiClient';

/**
 * Holds the signed-in user's effective permissions/scopes, fetched from the
 * new GET /api/auth/me (see ATMS_Entitlement_Architecture.md section E).
 *
 * Fails closed and quiet: if the fetch hasn't completed yet, or the
 * endpoint isn't deployed yet (e.g. mid-rollout), `can()` returns false and
 * nothing throws — matching this codebase's existing pattern for additive,
 * not-yet-guaranteed endpoints (see getRecruiterWorkload/getDataHygiene in
 * apiClient.js, which the Admin dashboard already calls with a .catch()
 * fallback). A hidden button is a UX inconvenience, never a security gap —
 * the backend's own @PreAuthorize/@authz checks remain authoritative
 * regardless of what this context contains (E.3 in the architecture doc).
 *
 * Refetches on window focus so a role/permission change in another tab or
 * an admin action takes effect without requiring a full sign-out (E.4).
 */
const PermissionContext = createContext({
  role: null,
  permissions: new Set(),
  scopes: {},
  loading: false,
  can: () => false,
  refresh: () => {},
});

export function PermissionProvider({ auth, children }) {
  const [state, setState] = useState({ role: null, permissions: new Set(), scopes: {}, loading: false });

  const refresh = useCallback(() => {
    if (!auth?.token) {
      setState({ role: null, permissions: new Set(), scopes: {}, loading: false });
      return;
    }
    setState((prev) => ({ ...prev, loading: true }));
    getMe()
      .then((data) => {
        setState({
          role: data?.role ?? null,
          permissions: new Set(data?.permissions ?? []),
          scopes: data?.scopes ?? {},
          loading: false,
        });
      })
      .catch(() => {
        // Endpoint not deployed yet, or a transient error — keep whatever we already had rather
        // than clearing a working permission set out from under the UI. can() still fails closed
        // for anything not already known.
        setState((prev) => ({ ...prev, loading: false }));
      });
  }, [auth?.token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!auth?.token) return undefined;
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, [auth?.token, refresh]);

  const can = useCallback((permissionKey) => state.permissions.has(permissionKey), [state.permissions]);

  const value = useMemo(() => ({ ...state, can, refresh }), [state, can, refresh]);

  return <PermissionContext.Provider value={value}>{children}</PermissionContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionContext);
}
