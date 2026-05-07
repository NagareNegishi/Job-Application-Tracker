# Feature Ideas

Potential additions to consider. Not prioritized — pick up any when ready to plan.

## Model field additions (one migration)

All fields below added together in a single migration.

**Progress:** Frontend steps 1–5 done — `WorkMode` enum, validation constants, `Job`/`CreateJobRequest`/`UpdateJobRequest`/`JobPatchOperation` types updated, `JobCreateSheet` and `JobEditSheet` updated with all new inputs and diff logic.
**Remaining:** Step 6 — `JobInfoCard` display.

- **Job URL + Source** — store the listing URL and where it came from (LinkedIn, Indeed, referral, etc.); `JobUrl` must enforce `http`/`https` scheme (backend `[Url]` attribute + frontend check) to prevent XSS via `javascript:` href; `Source` shown on detail page only, never in table
- **Salary range** — `SalaryMin` / `SalaryMax` as `int?`; both null = unknown; only min set = single figure; both set = range; validate `SalaryMin ≤ SalaryMax` when both present; `SalaryMin == SalaryMax` is valid and means a fixed salary — frontend must display as a single value, not a range; if only one of min/max is set, treat as single value
- **Location** — city/country free text field; no enum needed
- **Work mode** — `WorkMode?` nullable enum; null = not specified; Remote / Hybrid / On-site values; most useful as a filter; display `OnSite` as "On-site"
- **Interview date** — `InterviewAt: DateTime?`; excluded from create form (set via edit only)

**JobInfoCard layout — decided:**
- Row 1: Status · Priority · Applied · Closed (wider gap than before)
- Row 2: Location · Work mode (together, only if at least one set)
- Row 3: Salary range (only if at least one of min/max set)
- Interview date: highlighted callout section with distinct background color, between metadata rows and body sections — treated as high-priority info
- Description (if set)
- Notes (if set)
- Job URL (clickable link) + Source — after notes, least relevant so placed last inside the card

## UI features

- **Customizable table columns** — default view stays unchanged (Company, Role, Status, Priority, Applied At, Closed At); Company and Role are fixed; all other existing columns and all new fields above are user-toggleable; `Source` excluded from table entirely
- **Dashboard / Analytics** — `/dashboard` page; no new model needed; useful widgets:
  - Pipeline funnel — count per status; shows pipeline health
  - Response rate — % of applied jobs that moved past Applied; signals resume/outreach effectiveness
  - Weekly application chart — bar chart of applications sent per week; tracks effort
  - Stale applications — jobs in Applied/Screening for 14+ days with no update; surfaces follow-up candidates
  - Upcoming interviews — only relevant once `InterviewAt` field is added
- **Kanban board view** — toggle on job list between table and Kanban grouped by `JobStatus`; drag card to change status
