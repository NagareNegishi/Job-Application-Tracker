# Dashboard / Analytics

Route: `/dashboard`. No new backend model or endpoint required — computed from existing jobs data on the frontend.

## Prerequisites

`appliedAt` must be reliably filled for the weekly chart and response rate to be accurate.

### Auto-fill appliedAt on status change

- **Backend** (`JobsController.PatchJob`): when PATCH sets `status = Applied` and current `appliedAt` is null → set `appliedAt = now`. Enforces the rule at the API level regardless of caller.
- **Frontend**: when user changes status to `Applied` and `appliedAt` is already set → show confirm dialog: *"Applied At is [date]. Reset to today?"* Yes adds `appliedAt` to the patch; No patches status only.
- Covers Kanban drag and any inline status change.

## Widgets (v1)

| Widget | What it shows | Data source |
|---|---|---|
| Summary bar | Total active / rejected / offers | Job status counts |
| Status funnel | Count per status + overall response rate | All jobs |
| Weekly activity chart | Applications sent per week (bar chart) | `appliedAt` field |
| Response rate | % of Applied that moved past Applied | Job status |
| Upcoming interviews | Jobs with `interviewAt` in next 14 days | `interviewAt` field |
| Stale applications | Jobs in Applied/Screening/Assessment/Interview for 14+ days with no update | `updatedAt` + status |

## Key decisions

- All calculations frontend-only — no new API endpoint; uses jobs already fetched by TanStack Query
- Stale threshold: 14 days
- Upcoming interview window: 14 days
- Source breakdown deferred — only useful when Source field is consistently filled in
- Funnel shows counts per status + one top-level response rate metric; stage-to-stage conversion rates are not meaningful because Assessment and Interview can repeat and appear in any order
- `Assessment` status added to `JobStatus` enum — sits between Screening and Interview in Kanban column order as a sensible default, but no fixed pipeline order is enforced
