## job-tracker-ui/src/components/NavBar.tsx — left nav link group
- Snippet: `className="flex items-center gap-8"`
- Risk: Logo + separator + up to 3 nav links in a non-wrapping flex row; overflows at ~640px and below
- Suggestion: add `flex-wrap` and reduce `gap-8` to `gap-4` on the left group, or hide text links behind a hamburger at `sm:` breakpoint

## job-tracker-ui/src/pages/DashboardPage.tsx — chart section grid
- Snippet: `className="grid grid-cols-2 gap-4"`
- Risk: Two-column chart grid with no responsive fallback; both columns are ~300px wide at 640px, too narrow for charts
- Suggestion: `grid-cols-1 md:grid-cols-2`

## job-tracker-ui/src/components/dashboard/OverviewSection.tsx — outer grid
- Snippet: `className="grid grid-cols-4 gap-4"`
- Risk: 4-column layout with no responsive prefix; SummaryBar (col-span-3) and ResponseRateCard are squeezed below ~768px
- Suggestion: `grid-cols-1 md:grid-cols-4`

## job-tracker-ui/src/components/dashboard/SummaryBar.tsx — stat cards grid
- Snippet: `className="grid grid-cols-3 gap-4"`
- Risk: Three equal-width stat cards with no responsive prefix; each card becomes ~100px wide on mobile
- Suggestion: `grid-cols-3` (safe since OverviewSection wraps the whole row — fix the parent grid first; if standalone, add `sm:grid-cols-3 grid-cols-1`)

## job-tracker-ui/src/components/ContactList.tsx — contacts grid
- Snippet: `className="grid grid-cols-2 gap-6"`
- Risk: Two-column contact card layout with no responsive prefix; cards become ~140px wide at 375px and action buttons overlap content
- Suggestion: `grid-cols-1 sm:grid-cols-2`

## job-tracker-ui/src/components/dashboard/StaleApplicationsList.tsx — stale jobs table
- Snippet: `<table className="w-full text-sm">`
- Risk: Raw table with `whitespace-nowrap` columns and no `overflow-x-auto` wrapper; columns overflow the card on narrow screens
- Suggestion: Wrap the `<table>` in `<div className="overflow-x-auto">...</div>`
