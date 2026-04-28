# Job Table Tabs Plan

## Overview

Add tab navigation to the job table for quick triage. The "Closing Soon" tab surfaces unapplied jobs with a near deadline so the user doesn't miss them.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| Tab navigation over row-level indicators | Row indicators add clutter without aiding triage; a tab makes urgent jobs a single-click destination |
| Tab set: Active / Closing Soon / All / Rejected | All four tabs always visible; Active is the default landing tab |
| Closing Soon threshold: ≤7 days, Wishlist status only | Targets unapplied jobs the user is at risk of missing; applied/in-progress jobs don't need the same urgency nudge |
| Frontend-only, no backend changes | `closedAt` already returned by API; tab filtering derived at render time |

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Tab navigation on job table | Done |

---

## Step 1 — Tab Navigation

**Files:**
- `job-tracker-ui/src/components/JobTable.tsx` — add tab state and per-tab filter logic; use shadcn `Tabs` component (install via `npx shadcn@latest add tabs`)

No new component file. No backend changes.

### Tabs

| Tab | What it shows |
|---|---|
| Active | Jobs where status is not Rejected |
| Closing Soon | Jobs where status is Wishlist and `closedAt` ≤ 7 days from today |
| All | All jobs unfiltered |
| Rejected | Jobs with status Rejected |

### Behaviour

- Default tab: Active
- Existing column filters (status, priority, role) apply within the active tab
- Tab selection is local UI state — not persisted
