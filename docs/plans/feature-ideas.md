# Feature Ideas

Potential additions to consider. Not prioritized — pick up any when ready to plan.

## Quick wins (model field additions)

- **Job URL + Source** — store the listing URL and where it came from (LinkedIn, Indeed, referral, etc.)
- **Salary range** — `SalaryMin` / `SalaryMax` int fields; useful when comparing offers
- **Location + Work mode** — city/country string + Remote / Hybrid / On-site enum; common filter need
- **Interview date** — `InterviewAt: DateTime?`; `Interview` status exists but no date field yet

## UI features

- **Dashboard / Analytics** — `/dashboard` page: totals by status, applications over time chart, Applied→Interview→Offer conversion rate; no new model needed
- **Kanban board view** — toggle on job list between table and Kanban grouped by `JobStatus`; drag card to change status
- **CSV export** — export the job list to a CSV file; client-side or server-side
- **Bulk status change** — select multiple jobs in the table and update status in one action
