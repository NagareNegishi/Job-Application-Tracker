# Additional Job Statuses

Tracks decisions made when adding new `JobStatus` values beyond the original set.

## NoResponse

- Appended after `Rejected` in the backend enum (integer value 6). Existing DB rows unaffected.
- Terminal state. No special transition rules beyond what already applies to `Rejected`.
- Excluded from the "active" tab in JobTable using the same filter rule as `Rejected`.
- The "Rejected" tab is renamed "Closed" and shows both `Rejected` and `NoResponse` entries.
- In Kanban, `NoResponse` gets its own column after `Rejected`. A vertical divider between the two marks it as outside the normal application flow.
- Display label is "No Response", added via `ENUM_DISPLAY_OVERRIDES` in `enums.ts`.
- `StatusBadge` style: amber/muted orange to distinguish from the red used for `Rejected`.

## Assessment

- Appended after `NoResponse` in the backend enum.
- Active state — included in Active group in JobTable and dashboard.
- Kanban: own column between Screening and Interview.
- Display label: "Assessment" (no override needed).
- `StatusBadge` style: purple/indigo to distinguish from Interview.
- Included in stale applications check alongside Applied/Screening/Interview.

## Withdrawn

- Appended after `Assessment` in the backend enum. Existing DB rows unaffected.
- Terminal state — same filter rules as Rejected and NoResponse.
- Shown in the "Closed" tab alongside Rejected and NoResponse.
- Kanban: own column at the end, after NoResponse.
- Display label: "Withdrawn" (no override needed).
- `StatusBadge` style: gray/neutral — exit, not a failure.
- Excluded from response rate denominator (applicant's choice, not a missed reply).
