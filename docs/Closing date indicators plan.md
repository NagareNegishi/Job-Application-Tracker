# Closing Date Indicators Plan

## Overview

Add visual closing date indicators to job table rows. As a job's closing date approaches, a badge appears on the row showing urgency via label and colour. No automatic status or priority changes — status remains user-controlled. A future opt-in setting will let users enable automatic priority adjustment driven by the same thresholds.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| Visual badge only (no auto-status) | Status change carries meaning the user may disagree with — a closing job the user is no longer interested in doesn't need to become "Closed" automatically. The badge makes it obvious without overriding intent. |
| No auto-priority by default | Priority is partly a "how much do I want this" signal, not just urgency. Silently mutating a user-set field is surprising. Opt-in gives users who want it the benefit without affecting others. |
| Frontend-only, no backend changes | `closedAt` is already stored and returned by the API. The badge is derived from it at render time — no new fields, no migrations, no API changes. |
| Thresholds: ≤3 days = urgent, ≤7 days = soon | Gives meaningful lead time without being noisy. Adjustable once in use. |

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Closing date badge on job table rows | Pending |
| 2 | User-controlled auto-priority policy in settings | Pending |

---

## Step 1 — Closing Date Badge

**Files:**
- `job-tracker-ui/src/components/ClosingDateBadge.tsx` — new file; contains the `getClosingStatus` helper and the `ClosingDateBadge` component
- `job-tracker-ui/src/components/JobTable.tsx` — imports and renders `ClosingDateBadge`; no other changes

No backend changes.

### Badge logic

A `getClosingStatus` helper function takes `closedAt: string | undefined` and returns `{ label: string; colorClasses: string } | null`. Returns `null` when no closing date is set (no badge rendered).

| Condition | Label | Colour |
|---|---|---|
| Past date | Closed | Gray/muted |
| ≤ 3 days remaining | Closing soon | Red |
| ≤ 7 days remaining | Closing soon | Orange |
| > 7 days remaining | No badge | — |

### Rendering

`ClosingDateBadge` accepts `closedAt: string | undefined` and renders nothing when `getClosingStatus` returns `null`. Badge rendered in the Closed At column of `JobTable.tsx` alongside the existing date display. Uses Tailwind utility classes selected from a fixed set (Tailwind's build scanner requires complete class strings — no string interpolation).

---

## Step 2 — User-Controlled Auto-Priority Policy (Future)

**Scope:** Opt-in setting per user. When enabled, the app automatically raises job priority based on closing date proximity — using the same thresholds as Step 1.

| Closing date | Auto priority floor |
|---|---|
| ≤ 3 days | Urgent |
| ≤ 7 days | High |
| Past | No change (already closed) |

"Floor" means the priority is raised if currently below the threshold — it never lowers a priority the user has already set higher.

### What's needed

- **Backend:** new user preference field (e.g. `AutoAdjustPriority: bool`) — requires migration
- **Backend:** logic applied on job fetch or on a scheduled basis (TBD)
- **Frontend:** toggle in a settings/preferences page (not yet built)

### Open questions before implementing

- Apply on fetch (computed, not stored) or write back to DB (persisted, visible in history)?
- Scope: closing date only, or also trigger on status changes (e.g. Interview → High)?
- Settings page: build a dedicated page or a modal/sheet?
