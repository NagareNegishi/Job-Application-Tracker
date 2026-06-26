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

  **Status: Complete.**

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

  **Frontend (complete):**
  - `src/lib/columns.ts` — `ColumnDef` type, `COLUMNS` array (`as const satisfies`), `ColumnKey` derived union
  - `src/services/preferencesService.ts` — `Preferences` type, `getPreferences`, `updatePreferences`
  - `src/hooks/preferencesQuery.ts` — `usePreferences`, `useUpdatePreferences`
  - `src/components/ui/checkbox.tsx` — shadcn Checkbox added (backed by `radix-ui` already in project)
  - `src/components/ColumnToggle.tsx` — "Columns" button + checkbox dropdown; buffers changes in local draft state, commits single PUT on popover close; TQ dedup means `JobTable` calling `usePreferences` adds no extra fetch
  - `src/components/JobTable.tsx` — `useColWidths` rekeyed by `ColumnKey` (widths survive toggle); toolbar row added; conditional headers/cells via `isVisible` helper; renderers for Location, Work Mode, Salary, Interview Date, Job URL

  **Future (Settings page):** Let users save and reset their default column combination — the same `/api/account/preferences` endpoint will be used.

  **Sort + filter for new columns:** Complete.
  - Location — filter only (unique values dropdown, same pattern as Role)
  - Work Mode — filter only (display labels via `formatEnumLabel`; stored as label string in filter state)
  - Salary — no sort, no filter
  - Interview Date — sort only, no filter
  - Job URL — no sort, no filter

  Also added `formatEnumLabel` to `enums.ts` — single function for all enum display conversions; register new overrides in `ENUM_DISPLAY_OVERRIDES` when needed.
- **Dashboard / Analytics** — `/dashboard` page; see `docs/plans/dashboard-analytics.md`
- **Kanban board view** — toggle on job list between table and Kanban grouped by `JobStatus`; drag card to change status

## Auto-fill Job Details (AI Parsing)

Reduce manual entry when adding a job. A "Parse" button in the Add Job sheet sends job text to Claude API and pre-fills the form fields. User reviews before saving.

**Implementation plan: two phases.**

### Phase 1 — Copy-paste (implement first)

User copies listing text from any job page, pastes into a textarea in the Add Job sheet, clicks "Parse". Backend sends raw text to Claude API, returns a partial `JobDTO`, pre-fills the form.

**Why first:** Works for every site including LinkedIn and Indeed (NZ's primary job boards), no scraping, no ToS risk, reliable.

**Backend:** `POST /api/jobs/parse-listing` — `{ text: string }` → Claude extraction → partial `JobDTO`  
**Frontend:** Textarea + "Parse" button in Add Job sheet; on success pre-fills fields; user reviews and saves

### Phase 2 — URL fetch (future consideration)

User pastes a URL → backend fetches the page → Claude parses HTML → pre-fills form. Falls back to Phase 1 paste UI if fetch fails.

**Why deferred:** LinkedIn and Indeed (dominant in NZ) block server-side fetches. Greenhouse/Lever/Workable/Ashby pages are fetchable but less common in NZ market. Revisit when there is demand.
