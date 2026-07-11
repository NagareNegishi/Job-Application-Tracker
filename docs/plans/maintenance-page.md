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

## Post-deploy fixes (a real maintenance window exposed three gaps)

- **DB-down returned 500, not 503.** With no `EnableRetryOnFailure` on `UseNpgsql`, EF Core wraps a connection failure in a top-level `InvalidOperationException`; the `NpgsqlException` (a `DbException`) is nested in `InnerException`, so the old top-level `is DbException` check missed it. Fix: the exception handler walks the whole `InnerException` chain for `DbException` (`Program.cs`). `/health` (`AddDbContextCheck`) already returned 503 correctly — only the request path mislabelled the outage.
  - Refs: [Npgsql exceptions](https://www.npgsql.org/doc/diagnostics/exceptions_notices.html) (`NpgsqlException : DbException`); [npgsql#5183](https://github.com/npgsql/npgsql/issues/5183) / [efcore#11303](https://github.com/dotnet/efcore/issues/11303) (EF wraps transient connect failures).
- **Cold load bounced users to `/login`, not `/maintenance`.** `silentRefresh` bypasses `apiFetch` (the only place with the 503 redirect). Fix: `silentRefresh` redirects to `/maintenance` on an in-window 503, guarded by `pathname !== "/maintenance"` — it runs on every `App.tsx` mount, so an unguarded redirect reload-loops on the maintenance page. Also covers `apiFetch`'s 401-retry path (`api.ts`).
- **Generic errors showed "Unknown error".** Fix: `throwApiError` falls back to a client-authored, status-based message (`genericFallbackMessage`). It deliberately does **not** echo the backend's `{ error }` field — that's the generic/untrusted channel (info-disclosure boundary); controlled `message`/`description[]` are still shown verbatim (`api.ts`).
