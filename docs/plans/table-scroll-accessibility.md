# Table Horizontal Scroll Accessibility

**Issue:** Horizontal scrollbar on `JobTable` only reachable at the bottom of the table. Exists when extra columns (location, salary, etc.) are enabled or window is narrow — default columns (840px) fit within the container (~928px) so no overflow at defaults.

## Solution

**Viewport-contained flex chain** — no JavaScript, no extra DOM elements.

1. `JobPage.tsx` — outer div: `h-screen flex flex-col overflow-hidden`; content div and card div: `flex-1 flex flex-col min-h-0`
2. `JobTable.tsx` — outer div: `h-full`; tabs+table wrapper: `flex-1 min-h-0`; scroll container: `overflow-auto flex-1 min-h-0`
3. `table-plain.tsx` (new) — `Table` variant without `overflow-x-auto` on the shadcn wrapper div, so horizontal overflow propagates to our bounded container instead of being intercepted inside
4. `TableHeader` — `sticky top-0 z-10 bg-card`

**Why it works:** the scroll container's bottom edge is always at the viewport bottom, so the horizontal scrollbar is always visible. `overflow-hidden` on `h-screen` also contains `KanbanBoard` without needing changes there.
