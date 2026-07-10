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
1. `MaintenancePage` component + public `/maintenance` route; health poll + manual retry. Done.
2. `apiFetch` maintenance branch → `window.location.href = "/maintenance"` before throw. Done.
3. Remove now-dead per-component `instanceof MaintenanceError` checks (5 files). Done.

## Health endpoint
- `/health` stays at backend root; `nginx.conf` adds a `location /health` proxy block so prod requests reach the backend instead of falling through to the SPA fallback.
- `HEALTH_URL` in `MaintenancePage.tsx` strips `/api` from `VITE_API_BASE_URL` and appends `/health` — works in dev (hits ASP.NET directly) and prod (hits Nginx → proxied to backend).
- CORS not needed in prod — same domain through Nginx. Dev uses existing `DevCors` policy.
- Verified working in dev. Health returns 503 while DB down, 200 when up (`AddDbContextCheck`).
