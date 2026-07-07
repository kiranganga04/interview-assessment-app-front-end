# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

React 18 + Vite frontend for the Interview Assessment System — a panel/recruiter/admin workspace for scheduling interviews, recording skill assessments, and tracking candidates. It is the frontend half of a full-stack app; a separate Spring Boot backend (referenced in code comments, e.g. `InterviewController.list()` / `@PreAuthorize`) is expected at `http://localhost:8080` and is not in this repo.

## Commands

```
npm run dev       # Vite dev server on :5173, proxies /api -> http://localhost:8080
npm run build      # production build to dist/
npm run preview    # preview the production build
```

There is no test runner or lint script configured in `package.json`.

Docker: `Dockerfile` does a multi-stage build (`npm install && npm run build`, then serves `dist/` via nginx using `nginx.conf`, which proxies `/api/` to a `backend` service).

## Architecture

**Routing (`src/App.jsx`)** is the single source of truth for the route table and page-level access control. Auth state (`{ token, fullName, email, role }`) is a plain `useState` in `App`, hydrated from `localStorage` via `getStoredAuth()` and passed down as `auth` — there is no context/redux for it. Route access is enforced with three guard components from `src/components/layout/RouteGuards.jsx`:
- `ProtectedRoute` — any signed-in user.
- `PublicOnlyRoute` — signed-out only (auth pages), redirects to `/dashboard` if already signed in.
- `RoleRoute` — signed-in *and* role in an allow-list, redirects to `/dashboard` (never to another role-gated route, to avoid redirect loops).

Roles are `ADMIN`, `RECRUITER`, `PANEL`. Role-based visibility is duplicated in two places that must be kept in sync: the `RoleRoute roles={...}` prop in `App.jsx`, and the `@PreAuthorize` on the matching backend controller endpoint (called out in comments where relevant, e.g. `/interviews` list is ADMIN/RECRUITER only). When adding or changing a gated route, check both.

**Layout shell.** Signed-out pages (auth/forgot/reset password) render standalone with no chrome. Signed-in pages get `Sidebar` + `TopBar` wrapped around the routed content (`app-shell-sidebar` / `app-main` in `index.css`). `Sidebar.jsx` builds its nav as a declarative array of groups/items filtered by role flags derived from `auth.role`, then drops empty groups — this is the place to add new nav entries. `SiteHeader.jsx` is legacy (pre-sidebar top-nav) and is intentionally left unused rather than deleted; don't wire it back up. `SkillCatalogPage.jsx` is similarly present but currently unreferenced from `App.jsx`'s route table.

**API layer (`src/api/apiClient.js`).** Single axios instance (`baseURL: '/api'`) with all backend calls as named exported functions grouped by resource (Auth, Candidates, Interviews, Interviewers, Interview slots, Skill catalog, Users, Files, Reports). Pages call these directly — there's no separate service/hook layer. A request interceptor attaches `Authorization: Bearer <token>` from `localStorage` (`interviewAssessmentAuth`); a response interceptor clears stored auth on any `401`. Follow this file's grouping/naming convention when adding new endpoints rather than introducing a new client or fetch pattern.

**Pages (`src/pages/`)** are self-contained: local `useState` for form/list data, `useEffect` for initial load, inline `try/catch` around API calls surfacing errors via either an inline `error-banner` div or the toast system. There is no shared data-fetching/caching library.

**Toasts (`src/components/layout/ToastProvider.jsx`).** Context-based; wrap is already done once at the top of `App.jsx`. Use `useToast()` → `.success(msg)` / `.error(msg)` / `.info(msg)` for async action feedback (auto-dismiss after 4s). Prefer toasts for mutations (create/update/delete) and inline `error-banner` for failed page loads.

**Shared display components (`src/components/`):** `RatingBadge` (1–5 scale rating chip with color class `rating-{1..5}` / `rating-na`), `SkillAssessmentTable`, `CodingRoundTable` — used by the interview form/detail pages for the panel evaluation grid.

**Styling** is a single global stylesheet (`src/index.css`) using plain class names (BEM-ish, e.g. `card`, `data-card`, `metric-grid`, `status-chip status-{status}`, `sidebar-link`) and CSS custom properties (e.g. `--ink-muted`) — no CSS modules, no Tailwind, no styled-components.

**`src/config/navigation.js`** holds product branding constants (`productName`, `productTagline`, `footerGroups`) consumed by `Sidebar` and `SiteFooter`. It was previously hotlinking a third party's branding; keep it generic/original.

## Notes

- `dist/` (the build output) is committed to this repo — if you run `npm run build`, expect it to show up in `git status`; only stage it if the change is actually about shipping a new build.
- No `.gitignore` is present at the frontend root.
