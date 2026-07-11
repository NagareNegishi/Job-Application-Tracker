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

## Post-deploy bugs (found 2026-07 in a real maintenance window)

### Bug 1 — login showed "Unknown error", not the maintenance page
- Symptom: during RDS downtime `POST /api/auth/login` returned **500**, not 503, so `apiFetch`'s in-window 503 → `/maintenance` branch never fired; the `{ error }` body also isn't understood by `throwApiError`, degrading to "Unknown error".
- Root cause: `UseNpgsql` has no `EnableRetryOnFailure`, so EF Core's execution strategy wraps a connection failure in a top-level `System.InvalidOperationException` ("...likely due to a transient failure"). The real `NpgsqlException` (a `System.Data.Common.DbException`) is nested in `InnerException`, so the old top-level `error.Error is DbException` check missed it and fell through to the generic 500.
- Why `/health` still worked: `AddDbContextCheck` reports Unhealthy → 503 correctly; only the request path mislabelled the outage, which is why maintenance-page polling recovered but login didn't.
- Fix (Option A): the exception handler walks the whole `InnerException` chain for `DbException`. `NpgsqlException` is always in the chain for a connect failure, so this catches both wrapped and unwrapped cases. Done (`Program.cs`).

Verified against official sources:
- Npgsql: `NpgsqlException` subclasses `System.Data.DbException`; network errors raise an `NpgsqlException` wrapping an `IOException`/`SocketException` — [exceptions doc](https://www.npgsql.org/doc/diagnostics/exceptions_notices.html), [NpgsqlException API](https://www.npgsql.org/doc/api/Npgsql.NpgsqlException.html).
- EF Core (no retry) re-wraps a transient connect failure in `InvalidOperationException` — reproduced stack in [npgsql#5183](https://github.com/npgsql/npgsql/issues/5183), behaviour in [efcore#11303](https://github.com/dotnet/efcore/issues/11303).

### Bug 2 — cold load bounces logged-in users to `/login`, not `/maintenance`
- Symptom: opening the app during downtime lands on `/login` instead of `/maintenance`.
- Root cause: `App.tsx` → `silentRefresh` uses plain `fetch` and has no maintenance handling; on refresh failure it just clears the init gate, so `ProtectedRoute` redirects to `/login`. The `/maintenance` redirect lives only in `apiFetch`, which the cold-load refresh bypasses. (Fix #1's backend 503 doesn't help here — `silentRefresh` ignores the status.)
- Fix: `silentRefresh` now detects an in-window 503 and redirects to `/maintenance`. Guarded by `pathname !== "/maintenance"` because `App.tsx` runs `silentRefresh` on every mount, so an unguarded redirect would reload-loop on the maintenance page itself. Also covers `apiFetch`'s 401-retry path, which shares `silentRefresh`. Done (`api.ts`).
- Defensive follow-up: `throwApiError` should read the `{ error }` body field so a DB-down response never degrades to "Unknown error". Pending.
