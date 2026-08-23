# Dashboard / Analytics

Route: `/dashboard`. No new backend model or endpoint required — computed from existing jobs data on the frontend.

## Prerequisites

`appliedAt` must be reliably filled for the weekly chart and response rate to be accurate.

### Auto-fill appliedAt on status change — Done

- **Backend** (`JobsController.PatchJob`): when PATCH sets `status = Applied` and current `appliedAt` is null → set `appliedAt = now`. Enforces the rule at the API level regardless of caller.
- **Frontend** (`JobEditSheet`, `KanbanBoard`): when user changes status to `Applied` and `appliedAt` is already set → confirm dialog: *"Applied At is [date]. Reset to today?"* "Reset to today" adds `/appliedAt: now` to the patch; "Keep existing" patches status only. `ConfirmDialog` (generic) / `DeleteConfirmDialog` (wrapper) introduced in `ui/`.
- Covers Kanban drag and edit sheet submit.

## Status classification

Three-way split used across all widgets:

| Group | Statuses |
|---|---|
| **Active** | Wishlist, Applied, Screening, Assessment, Interview |
| **Won** | Offer |
| **Closed** | Rejected, Withdrawn, No Response |

New enum values `Assessment`, `Withdrawn`, `NoResponse` — already shipped.

Response rate formula:
```
(Screening + Assessment + Interview + Offer + Rejected) ÷ (Applied + Screening + Assessment + Interview + Offer + Rejected + No Response)
```
i.e. applications that got any human reply ÷ applications that could have gotten a reply (excludes Wishlist and Withdrawn).

## Widgets (v1)

| Widget | What it shows | Data source |
|---|---|---|
| Summary bar | Active count / Offer count / Closed count | Status classification above |
| Status funnel | Count per status + overall response rate | All jobs |
| Weekly activity chart | Applications sent per week (bar chart) | `appliedAt` field |
| Response rate | % of applications that got any human reply | Formula above |
| Stale applications | Active jobs (excl. Wishlist) with no update for 14+ days | `updatedAt` + status |

## Key decisions

- All calculations frontend-only — no new API endpoint; uses jobs already fetched by TanStack Query
- Stale threshold: 14 days
- Upcoming interview window: 14 days
- Source breakdown deferred — only useful when Source field is consistently filled in
- Funnel shows counts per status + one top-level response rate metric; stage-to-stage conversion rates are not meaningful because Assessment and Interview can repeat and appear in any order
- New enum values: `Assessment` (sits between Screening and Interview in Kanban column order), `Withdrawn`, `No Response` — no fixed pipeline order enforced
- `Offer` is terminal positive (Won), not Active — once you have an offer the application is complete
- `Accepted` not added — Offer is sufficient as the final win state; users don't need to track post-offer acceptance in a job tracker
- Chart library: `react-chartjs-2` v5.3.1 + `chart.js` v4; install: `npm install react-chartjs-2 chart.js`
- Weekly activity widget: vertical bar chart via `<Bar />`
- Status funnel widget: horizontal bar chart via `<Bar indexAxis="y" />` — no true funnel shape, no extra plugin needed
- `computeWeeklyApplications` unblocked — chart library decided
- Weekly activity tracks `appliedAt` — applications sent per week; jobs without `appliedAt` excluded
- Week label format: `"Jun 29 '25"` (Monday of week start, ISO week convention)
- Scope selector (`"all" | "year" | "month"`) is UI state in `DashboardPage` — filters jobs by `appliedAt` before passing to `computeWeeklyApplications`; function stays pure, always groups whatever it receives
- `computeStaleApplications` unblocked: `statusChangedAt` added to `Job` entity + migration done; `staleThresholdDays` is a function parameter — `UserPreferences` integration deferred to `StaleIndicator` component
- Stale criteria: status is Applied/Screening/Assessment/Interview, AND (`closedAt` not set OR `closedAt` is in the past), AND `today − statusChangedAt ≥ thresholdDays`
- `computeStaleApplications` signature: `(jobs: Job[], thresholdDays: number): Job[]`

## Implementation Plan

### Route
- Path: `/dashboard`
- Wrapped in `ProtectedRoute` (same as `/jobs`)
- Add "Dashboard" nav link in `NavBar` alongside "Jobs"

### Page Frame — `src/pages/DashboardPage.tsx`
- Calls `useJobs()` — jobs already cached by TanStack Query, no extra fetch
- Single `useMemo` block computes all 6 widget values when jobs change
- Layout: summary bar full-width top row; 2-column grid below for remaining widgets
- Each widget is an inline card section — no separate component files in v1

### Logic — `src/utils/dashboardUtils.ts`
Pure functions only; no React, no side effects:

| Function | Input | Output |
|---|---|---|
| `classifyStatus(status)` | `JobStatus` | `"active" \| "won" \| "closed"` |
| `computeSummary(jobs)` | `Job[]` | `{ active, won, closed }` |
| `computeResponseRate(jobs)` | `Job[]` | `number` (0–100) |
| `computeStatusFunnel(jobs)` | `Job[]` | `{ status, count }[]` |
| `computeWeeklyApplications(jobs)` | `Job[]` | `{ week: string, count: number }[]` from `appliedAt` |
| `computeStaleApplications(jobs, thresholdDays)` | `Job[], number` | `Job[]` active (excl. Wishlist), `statusChangedAt` 21+ days ago (configurable) |

### Tests — `src/utils/dashboardUtils.test.ts`
Unit tests for all functions above. Edge cases: empty array, null `appliedAt`, boundary dates.

### Stale indicator component — `src/components/ui/StaleIndicator.tsx`
Reusable component, same pattern as `PriorityDot`. Amber `Clock` icon with a tooltip ("No status change in X days — consider following up"). Used in jobs list (table row + Kanban card). Blocked on same prerequisites as `computeStaleApplications`: `statusChangedAt` backend field + `staleThresholdDays` in `UserPreferences`.

### Frontend Data Flow
1. `DashboardPage` calls `useJobs()` — returns cached `Job[]`
2. `useMemo` runs all compute functions → destructured into widget props
3. Each widget section reads from memo values — no local state

## Progress

| # | Step | Status |
|---|---|---|
| 1 | Route + NavBar link | Done |
| 2a | Backend: `StatusChangedAt` on `Job` + migration + 3 tests | Done |
| 2b | `dashboardUtils.ts` — `computeWeeklyApplications` | Done |
| 2c | `dashboardUtils.ts` — `computeStaleApplications` | Done |
| 3 | Tests for `dashboardUtils.ts` | Done |
| 4 | `DashboardPage.tsx` — page frame + all widgets | — |
| 5 | `StaleIndicator` component — amber Clock icon + tooltip in jobs list + Kanban card | Done |
