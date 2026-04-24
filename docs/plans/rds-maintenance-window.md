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
