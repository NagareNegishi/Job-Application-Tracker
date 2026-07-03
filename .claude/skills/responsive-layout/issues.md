## job-tracker-ui/src/components/dashboard/StaleApplicationsList.tsx — stale jobs table
- Snippet: `<table className="w-full text-sm">`
- Risk: Raw table with `whitespace-nowrap` columns and no `overflow-x-auto` wrapper; columns overflow the card on narrow screens
- Suggestion: Wrap the `<table>` in `<div className="overflow-x-auto">...</div>`
