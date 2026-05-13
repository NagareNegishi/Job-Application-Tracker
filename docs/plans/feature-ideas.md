# Feature Ideas

Potential additions to consider. Not prioritized — pick up any when ready to plan.

## Model field additions (one migration)

All fields below added together in a single migration.

**Status: Complete.**

- **Job URL + Source** — store the listing URL and where it came from (LinkedIn, Indeed, referral, etc.); `JobUrl` must enforce `http`/`https` scheme (backend `[Url]` attribute + frontend check) to prevent XSS via `javascript:` href; `Source` shown on detail page only, never in table
- **Salary range** — `SalaryMin` / `SalaryMax` as `int?`; both null = unknown; only min set = single figure; both set = range; validate `SalaryMin ≤ SalaryMax` when both present; `SalaryMin == SalaryMax` is valid and means a fixed salary — frontend must display as a single value, not a range; if only one of min/max is set, treat as single value
- **Location** — city/country free text field; no enum needed
- **Work mode** — `WorkMode?` nullable enum; null = not specified; Remote / Hybrid / On-site values; most useful as a filter; display `OnSite` as "On-site"
- **Interview date** — `InterviewAt: DateTime?`; excluded from create form (set via edit only)

**JobInfoCard layout:**
- Row 1: Status · Priority · Interview (amber text) · Applied · Closed (gap-8)
- Row 2: Location · Work mode (pl-2, only if at least one set)
- Row 3: Salary range with `$` prefix (pl-2, only if at least one of min/max set)
- Description (if set)
- Notes (if set)
- Link + Source — flex-wrap row (pl-2), each rendered independently; label is "Link" for URL, "Source" for source field

**Bug fixed:** `PatchJob` in `JobsController` was not copying or writing back the new fields (`JobUrl`, `Source`, `SalaryMin`, `SalaryMax`, `Location`, `WorkMode`, `InterviewAt`) — both the `jobToPatch` initializer and the write-back mapping were updated.

## UI features

- **Customizable table columns**

  **Status: In progress — backend complete, frontend pending.**

  Default visible columns are unchanged: Company, Role, Status, Priority, Applied At, Closed At.
  Company and Role are always visible (fixed). Source is excluded from the table entirely.

  **Toggleable columns:**
  - Existing: Status, Priority, Applied At, Closed At
  - New fields: Location, Work Mode, Salary, Interview Date, Job URL

  **UI:**
  - "Columns" button with a checkbox dropdown
  - Button lives in a dedicated toolbar row between the page header and the tabs (keeps "Add New Job" prominent)

  **Storage (complete):**
  - Introduced `ApplicationUser : IdentityUser`; updated all references (`Program.cs`, `AuthController`, `AccountController`, `JobTrackerContext`); migration `AddApplicationUser` applied
  - `Preferences` JSON column (`string?`) on `ApplicationUser`; deserialized only in `AccountController`
  - GET/PUT `/api/account/preferences` — shape: `{ "visibleColumns": ["status", "priority", ...] }`; GET returns default set (`status`, `priority`, `appliedAt`, `closedAt`) if no preference saved
  - Reason for `ApplicationUser` over a separate table: cascade deletes are automatic, no upsert logic needed, preferences are user data and belong on the user row

  **Frontend:**

  Complete:
  - `src/lib/columns.ts` — `ColumnDef` type, `COLUMNS` array (`as const satisfies`), `ColumnKey` derived union
  - `src/services/preferencesService.ts` — `Preferences` type, `getPreferences`, `updatePreferences`
  - `src/hooks/preferencesQuery.ts` — `usePreferences`, `useUpdatePreferences`

  Pending:
  - `ColumnToggle` component — "Columns" button + checkbox dropdown; self-contained (owns both hooks); TQ dedup means `JobTable` can also call `usePreferences` without an extra fetch; styled button + `Check` icon for checkbox UI (no shadcn `Checkbox` exists)
  - Update `JobTable` — toolbar row, rekey `useColWidths` by column key, conditional headers/cells, new column renderers

  **Future (Settings page):** Let users save and reset their default column combination — the same `/api/account/preferences` endpoint will be used.
- **Dashboard / Analytics** — `/dashboard` page; no new model needed; useful widgets:
  - Pipeline funnel — count per status; shows pipeline health
  - Response rate — % of applied jobs that moved past Applied; signals resume/outreach effectiveness
  - Weekly application chart — bar chart of applications sent per week; tracks effort
  - Stale applications — jobs in Applied/Screening for 14+ days with no update; surfaces follow-up candidates
  - Upcoming interviews — only relevant once `InterviewAt` field is added
- **Kanban board view** — toggle on job list between table and Kanban grouped by `JobStatus`; drag card to change status
