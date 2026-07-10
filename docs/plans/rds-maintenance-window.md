# RDS Maintenance Window — Implementation Plan

## Goal
Stop RDS daily 00:00–08:00 Sydney time to save ~$10/month.
Show users a meaningful maintenance message instead of a generic error during that window.

## Cost context
- EC2 schedule not worth it — EIP charge eats most of the saving (~$2 net)
- RDS stop has no penalty — full hourly billing pauses
- RDS auto-restarts after 7 days (AWS hard limit) — on that day it runs a few unscheduled hours until midnight re-stops it; negligible cost impact

---

## Decisions

### Backend
- Exception handler in `Program.cs` (lines 261–280) currently catches all unhandled exceptions → **500**
- Change: catch `System.Data.Common.DbException` specifically → return **503** instead of 500
- All other exceptions remain 500
- No schedule/clock logic in backend — backend only signals "DB is unreachable"
- `DbException` is the right base class (covers Npgsql without importing Npgsql directly)
- Note: `OnTokenValidated` (line 167) also hits DB for SecurityStamp check — will also throw `DbException` → same 503 path covers it

### Frontend
- `apiFetch` in `src/lib/api.ts` — add 503 check before the existing 401 check
- On 503: check browser clock against maintenance window (00:00–08:00 AEST)
  - In window → throw `MaintenanceError` with message: `"Service is in maintenance (midnight–8 AM Sydney time). Please try again later."`
  - Outside window → throw `ApiError` with status 503 and message: `"Service temporarily unavailable. Please try again."`
- Maintenance window constant: `{ startHour: 0, endHour: 8, timezone: "Australia/Sydney" }`
- Use `Intl.DateTimeFormat` to get current hour in AEST — handles DST automatically

### UI error display
- **No global toast/error provider exists** — errors are handled per-component
- `JobTable.tsx:191` — `if (isError) return <p>Something went wrong.</p>` — TanStack Query `isError` catches all query errors
- `DocumentList.tsx` — uses `isError` and `uploadError` state separately
- Decision: add a `MaintenanceError` class to `src/lib/api.ts`, check for it in error display locations and show the maintenance message
- Components to update: `JobTable`, `JobDetailPage`, `DocumentList`, `LoginPage` (login fails with 503 during window)
- **Per-component for now** — `instanceof MaintenanceError` inline in each component
- **Future: migrate to `QueryCache` global `onError`** — one handler for all query errors; `MutationCache` needs separate handling; requires adding a context provider or module-level signal for global UI state

---

## Files to change

| File | Change |
|---|---|
| `JobTrackerApi/Program.cs` | Exception handler: catch `DbException` → 503 |
| `job-tracker-ui/src/lib/api.ts` | Add `MaintenanceError` class + 503 detection in `apiFetch` |
| `job-tracker-ui/src/components/JobTable.tsx` | Check `MaintenanceError` in `isError` branch |
| `job-tracker-ui/src/pages/JobDetailPage.tsx` | Same |
| `job-tracker-ui/src/components/DocumentList.tsx` | Same |
| `job-tracker-ui/src/pages/LoginPage.tsx` | Check `instanceof MaintenanceError` first in the catch block, then `instanceof ApiError`; sets `error` state which renders in the existing inline error div (`apiFetch` converts 503 to `MaintenanceError`/`ApiError` before it reaches the page — no raw status check needed) |

## Health check
- `/health` already returns 503 when DB is down (`AddDbContextCheck`) — no change needed

## AWS schedule setup
- Use EventBridge Scheduler (not Lambda) — simpler, no code needed
- Two rules: stop RDS at 00:00 AEST, start RDS at 08:00 AEST
- Target: `rds:StopDBInstance` / `rds:StartDBInstance`
- IAM role: must be created manually before setting up the scheduler — grant `rds:StopDBInstance` and `rds:StartDBInstance` on the target DB instance; EventBridge Scheduler assumes this role when invoking the targets
- Set timezone to `Australia/Sydney` in the scheduler — DST handled automatically, no UTC offset needed
- Cost: free tier covers 14M invocations/month; this uses ~60/month — $0
- Not in this repo — done in AWS console or Terraform separately

### Demo reset cron alignment
- RDS uptime: 08:00–00:00 AEST = 22:00–14:00 UTC
- GitHub Actions adds ~2 hr delay to scheduled runs — cron must target no later than 12:00 UTC or the delay risks hitting the 14:00 UTC shutdown
- Demo reset cron set to `30 9 * * *` UTC → fires ~9:30 PM Sydney time — avoids peak Sydney hours and stays safely within RDS uptime

---

## Phase 2 — NZ timezone + longer shutdown (supersedes the Phase 1 window above)

RDS now runs **07:00–20:00 NZ** (down 20:00–07:00, 11h/day), scheduled in EventBridge with timezone `Pacific/Auckland` (DST-aware). Portfolio-first: up during recruiter hours (unlikely after 8pm); 07:00 start (not 08:00) leaves a buffer since RDS takes ~5–10 min to become available after the start command.

### Scheduled jobs and their coupling to the RDS window

| Job | Location | Cron | Coupling |
|---|---|---|---|
| RDS stop | EventBridge Scheduler | `0 20 * * ? *` Pacific/Auckland (20:00 NZ) | anchor |
| RDS start | EventBridge Scheduler | `0 7 * * ? *` Pacific/Auckland (07:00 NZ) | anchor |
| demo-reset | `.github/workflows/demo-reset.yml` | `0 20 * * *` UTC | must run while RDS **UP** |
| renew-cert | `.github/workflows/renew-cert.yml` | `0 15 1 * *` UTC | must run while RDS **DOWN** (maintenance) |

### DST gotcha (why these exact times — don't naively "align" them)

GitHub Actions crons are fixed UTC; EventBridge `Pacific/Auckland` follows NZ DST, so the RDS window shifts ±1h in UTC between NZST (UTC+12) and NZDT (UTC+13). Both couplings hold in both seasons:
- RDS up (UTC): NZST 19:00–08:00 · NZDT 18:00–07:00
- demo-reset `0 20` UTC (+≤2h GitHub delay): fires ~08:00–11:00 NZ — inside UP both seasons ✓. (DB is only up in the daytime now, so demo data resets during recruiter hours — accepted.)
- renew-cert `0 15` UTC: 03:00 NZST / 04:00 NZDT — inside the DOWN window both seasons ✓.

If the window ever changes, re-verify both couplings in both seasons.

**Pending:** the `demo-reset.yml` + `renew-cert.yml` edits are not yet merged to `main`. Scheduled workflows run only from the default branch, so demo-reset fails nightly until merged. The EventBridge schedules are already live.
