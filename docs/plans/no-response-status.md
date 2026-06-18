# NoResponse Status

Tracks decisions made when adding `NoResponse` as a seventh job application status.

## Decisions

- `NoResponse` is appended after `Rejected` in the backend enum (integer value 6). Existing DB rows are unaffected.
- It is a terminal state. No special transition rules beyond what already applies to `Rejected`.
- Excluded from the "active" tab in JobTable using the same filter rule as `Rejected`.
- The "Rejected" tab is renamed "Closed" and shows both `Rejected` and `NoResponse` entries.
- In Kanban, `NoResponse` gets its own column after `Rejected`. A vertical divider between the two marks it as outside the normal application flow.
- Display label is "No Response", added via `ENUM_DISPLAY_OVERRIDES` in `enums.ts` (same mechanism as "On-site", "Cover Letter", etc.).
- `StatusBadge` style uses amber/muted orange to distinguish it from the red used for `Rejected`.
