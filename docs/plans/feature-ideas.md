# Feature Ideas

Potential additions to consider. Not prioritized — pick up any when ready to plan.

## Model field additions (one migration)

All fields below added together in a single migration.

- **Job URL + Source** — store the listing URL and where it came from (LinkedIn, Indeed, referral, etc.); `JobUrl` must enforce `http`/`https` scheme (backend `[Url]` attribute + frontend check) to prevent XSS via `javascript:` href; `Source` shown on detail page only, never in table
- **Salary range** — `SalaryMin` / `SalaryMax` int fields; useful when comparing offers
- **Location** — city/country free text field; no enum needed
- **Work mode** — Remote / Hybrid / On-site enum; most useful as a filter
- **Interview date** — `InterviewAt: DateTime?`; `Interview` status exists but no date field yet

## UI features

- **Customizable table columns** — default view stays unchanged (Company, Role, Status, Priority, Applied At, Closed At); Company and Role are fixed; all other existing columns and all new fields above are user-toggleable; `Source` excluded from table entirely
- **Dashboard / Analytics** — `/dashboard` page: totals by status, applications over time chart, Applied→Interview→Offer conversion rate; no new model needed
- **Kanban board view** — toggle on job list between table and Kanban grouped by `JobStatus`; drag card to change status
- **CSV export** — export the job list to a CSV file; client-side or server-side
- **Bulk status change** — select multiple jobs in the table and update status in one action
