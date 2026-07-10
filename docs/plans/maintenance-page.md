# Maintenance Page — Plan

## Goal
When the DB is down during the scheduled window, redirect users to a dedicated
`/maintenance` page instead of showing a bare "Something went wrong" per component.

## Decisions
- **Redirect, not overlay** — intercept in `apiFetch`; on in-window 503 do
  `window.location.href = "/maintenance"` (mirrors the existing 401 → `/login` path).
  One global interception point; makes the per-component `instanceof MaintenanceError`
  checks redundant.
- **Keep the clock-window check** — only in-window 503 redirects; outside stays a
  generic `ApiError`. Trade-off: the ~5–10 min RDS start-up gap after 07:00 NZ shows a
  generic error, not maintenance — accepted.
- **`/maintenance` is a public route** — outside `ProtectedRoute`; renders regardless of auth.
- **Auto-recovery** — page polls the backend health endpoint with plain `fetch`
  (never `apiFetch`, to avoid a redirect loop); on 200 → navigate back to `/`.
- **Return destination** — `/` for now (redirect loses the prior URL).
- **Poll interval** — 30–60 s, plus a manual "Try again" button (RDS start is minutes).

## Steps
1. `MaintenancePage` component + public `/maintenance` route; health poll + manual retry.
2. `apiFetch` maintenance branch → `window.location.href = "/maintenance"` before throw.
3. (Optional) remove now-dead per-component `instanceof MaintenanceError` checks.

## To verify during build
- Health endpoint path (`/health` at root vs under `VITE_API_BASE_URL`), anonymous access, CORS.
- Health returns 503 while DB down, 200 when up (`AddDbContextCheck`).
