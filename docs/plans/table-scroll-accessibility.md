# Table Horizontal Scroll Accessibility

**Issue:** The `overflow-x-auto` div in `JobTable.tsx` puts the horizontal scrollbar at the table's bottom edge — only reachable when the user has scrolled the page all the way down to the table bottom. Same problem exists in `KanbanBoard.tsx`.

## Overflow only exists with extra columns

Default visible columns total 840px. Container = max-w-5xl (1024px) − px-6 (48px) − p-6 card padding (48px) = ~928px. **No overflow with default columns.** Overflow only occurs when the user enables extra columns (location, salary, etc.) or uses a narrow window.

Any fix must account for this — the sticky bar or alternative is a no-op at default column widths.

## What was tried (both sessions — reverted)

**Session 1:** Added `tableRef`, `stickyBarRef`, `onTableScroll`, `onBarScroll` to `JobTable.tsx`. Logic correct but never wired to JSX. Left as dead code.

**Session 2:** Wired refs + rendered sticky bar (`position: sticky; bottom: 0`) below the table. Two failures:
1. Native scrollbar hide — tried `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden` (Tailwind v4 arbitrary classes, unconfirmed) then `@utility no-scrollbar { &::-webkit-scrollbar { display: none } }` (nested syntax in `@utility`, unconfirmed). Neither verified before applying.
2. Sticky bar not interactable — inner div had `height: 1` but sticky bar outer div had no explicit height. Browser may not render horizontal scrollbar track without sufficient container height (needs ~14px minimum).

Both sessions reverted. `JobTable.tsx` and `index.css` are back to pre-attempt state.

## CSS approach to verify before next attempt

Plain CSS in `index.css` (no Tailwind directives required — Vite passes it through as-is):
```css
.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
```
Do not use `@utility` with nested `&::` rules without confirming that syntax compiles. Do not use `[&::-webkit-scrollbar]:hidden` without browser testing in Tailwind v4.

## Options going forward

**Option A — Fixed-height table container**
Give `overflow-x-auto` a `max-height` (e.g. `max-h-[calc(100vh-16rem)]`) so the table scrolls both axes in a contained box. Horizontal scrollbar always at the container bottom, always visible. No sticky bar needed. Add `position: sticky; top: 0` on `TableHeader` to keep headers visible during vertical scroll. Trade-off: table height is capped.

**Option B — Sticky bar redo**
Re-implement with: (1) explicit `height: 14px` on the sticky bar outer div, (2) plain `.no-scrollbar` CSS class to hide native scrollbar, (3) verify overflow exists before considering the feature useful.
