# RDS Maintenance Window — Implementation Plan

## Goal
Stop RDS overnight to save ~$10/month, and show users a maintenance message
instead of a generic error while the DB is down.

## Cost context
- EC2 schedule not worth it — EIP charge eats most of the saving (~$2 net)
- RDS stop has no penalty — full hourly billing pauses
- RDS auto-restarts after 7 days (AWS hard limit) — on that day it runs a few
  unscheduled hours until the next scheduled stop; negligible cost impact

---

## Current schedule

RDS runs **07:00–20:00 NZ** (down 20:00–07:00, 11h/day), scheduled in
EventBridge Scheduler with timezone `Pacific/Auckland` (DST-aware). Portfolio-first:
up during recruiter hours (unlikely after 8pm); 07:00 start (not 08:00) leaves a
buffer since RDS takes ~5–10 min to become available after the start command.

Set up in the AWS console / Terraform, not in this repo. EventBridge free tier
covers 14M invocations/month; this uses ~60/month — $0.

### Scheduled jobs and their coupling to the RDS window

| Job | Location | Cron | Coupling |
|---|---|---|---|
| RDS stop | EventBridge Scheduler | `0 20 * * ? *` Pacific/Auckland (20:00 NZ) | anchor |
| RDS start | EventBridge Scheduler | `0 7 * * ? *` Pacific/Auckland (07:00 NZ) | anchor |
| demo-reset | `.github/workflows/demo-reset.yml` | `0 20 * * *` UTC | must run while RDS **UP** |
| renew-cert | `.github/workflows/renew-cert.yml` | `0 15 1 * *` UTC | must run while RDS **DOWN** (maintenance) |

### DST gotcha (why these exact times — don't naively "align" them)

GitHub Actions crons are fixed UTC; EventBridge `Pacific/Auckland` follows NZ DST,
so the RDS window shifts ±1h in UTC between NZST (UTC+12) and NZDT (UTC+13). Both
couplings hold in both seasons:
- RDS up (UTC): NZST 19:00–08:00 · NZDT 18:00–07:00
- demo-reset `0 20` UTC (+≤2h GitHub delay): fires ~08:00–11:00 NZ — inside UP both
  seasons ✓. (DB is only up in the daytime now, so demo data resets during recruiter
  hours — accepted.)
- renew-cert `0 15` UTC: 03:00 NZST / 04:00 NZDT — inside the DOWN window both seasons ✓.

If the window ever changes, re-verify both couplings in both seasons.

---

## 503 maintenance handling

### Backend
- Exception handler in `Program.cs` catches `System.Data.Common.DbException`
  specifically → returns **503**; all other exceptions stay **500**.
- No schedule/clock logic in backend — it only signals "DB is unreachable".
- `DbException` is the right base class (covers Npgsql without importing it directly).
- `OnTokenValidated` also hits the DB for the SecurityStamp check → throws `DbException`,
  so the same 503 path covers it.

### Frontend
- `apiFetch` in `src/lib/api.ts` checks for 503 before the existing 401 check.
- On 503, compare the browser clock to the maintenance window:
  - In window → throw `MaintenanceError` with the maintenance message.
  - Outside window → throw `ApiError` (status 503) with a generic "try again" message.
- Uses `Intl.DateTimeFormat` to read the current hour in the window's timezone —
  handles DST automatically.

### UI error display
- No global toast/error provider — errors are handled per-component.
- `MaintenanceError` is checked with `instanceof` where errors render:
  `JobTable`, `JobDetailPage`, `DocumentList`, `LoginPage`.
- Future: migrate to a `QueryCache` global `onError` (one handler for all query errors;
  `MutationCache` needs separate handling; requires a context provider or module-level
  signal for global UI state).

### Health check
- `/health` already returns 503 when the DB is down (`AddDbContextCheck`) — no change needed.
