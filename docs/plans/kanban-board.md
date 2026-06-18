# Kanban Board Plan

## Overview

Add a view toggle to the job list page (Table / Kanban). Kanban mode shows all jobs grouped by `JobStatus` as columns. Dragging a card to a different column patches the job's status via the existing PATCH endpoint.

---

## Library Decision

| Consideration | Detail |
|---|---|
| Chosen package | `@dnd-kit/core` v6.3.1 |
| Label on docs | "Legacy" — maintainer is building a new API (`@dnd-kit/react`), not a deprecation |
| React 19 | Fully compatible |
| Community adoption | Used by Linear, Vercel; the standard for React kanban boards in 2026 |
| Why not `@dnd-kit/react` | v0.4.0 beta — API may break between minor versions; sparse docs; not production-ready |
| Why not Pragmatic DnD | React 19 compatibility gaps in optional packages; designed for Jira scale, not needed here |
| Future migration risk | When `@dnd-kit/react` reaches v1.0, a refactor will be required. Migration guide: [dndkit.com/react/guides/migration/](https://dndkit.com/react/guides/migration/) |

### Refactor marker convention

All files that touch dnd-kit APIs must include this comment at the top of the file:

```ts
// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable
```

Grep target for future refactor: `[dnd-kit-legacy]`

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| @dnd-kit/core over alternatives | React 19 compatible; actively maintained; mouse/touch/keyboard out of the box |
| Server-round-trip on drop, not optimistic | `usePatchJob` + TQ invalidation already handles it; saves complexity |
| All statuses shown in Kanban, no tab filtering | Tabs are a table concept; Kanban already shows all statuses as columns |
| `viewMode` state in `JobPage`, not `JobTable` | `JobTable` and `KanbanBoard` are sibling views; `JobPage` decides which to render |
| `KanbanBoard` as a sibling of `JobTable` | Each calls `useJobs()` independently; TQ cache is shared so no duplicate backend call on view switch |
| "Add New Job" button stays in `JobTable` | Add flow is table-specific; naturally absent in kanban mode because `JobTable` is not rendered |

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Install @dnd-kit/core | Done |
| 2 | Add viewMode toggle to JobPage; render JobTable or KanbanBoard as siblings | Done |
| 3 | Create KanbanBoard component (layout) | Done |
| 4 | Add drag-and-drop + status patch on drop | Done |

---

## Known Issues

| Issue | Root Cause | Plan |
|---|---|---|
| Dragged card can scroll beyond board bounds | `restrictToScrollContainer` modifier clamps to scroll content height, not visible viewport; dnd-kit auto-scroll moves the page so the boundary shifts | Fix via `DragOverlay` refactor |
| Drag animation not smooth | `useDraggable` transforms the original element in-place; no easing, no shadow, no scale | Fix via `DragOverlay` refactor — overlay renders a styled clone |

### DragOverlay Refactor

`DragOverlay` renders the dragging card as a portal on `<body>`, outside the board DOM entirely. The original card becomes a transparent placeholder. This solves both issues: the overlay is never clipped by any container, and it can have its own transition/shadow styles.

| Change | Detail |
|---|---|
| `onDragStart` | Set `activeJob` state to the dragged job |
| `onDragEnd` | Clear `activeJob`; patch status as before |
| `DragOverlay` | Renders a `KanbanCard` clone for `activeJob`; add `transition` + `boxShadow` for smoothness |
| Original card | Show as semi-transparent placeholder while `isDragging` |
| `restrictToScrollContainer` modifier | Can be removed — portal overlay is not affected by scroll container bounds |

---

## Dependencies

### @dnd-kit/core
Core drag-and-drop primitives (legacy stable API, v6.3.1). Provides `DndContext`, `useDraggable`, `useDroppable`, and sensors.

### @dnd-kit/utilities — not installed
Dropped. Its only use here is converting the drag transform to a CSS string, which is a one-liner inline (`transform ? \`translate3d(${transform.x}px, ${transform.y}px, 0)\` : undefined`). No other feature in the current plan or foreseeable enhancements requires it. If `@dnd-kit/sortable` is added later it pulls utilities in automatically as a peer dependency.

---

## API Reference

### DndContext
Wraps all draggable and droppable components. Uses React Context to share state between them.

| Prop | Type | Purpose |
|---|---|---|
| `sensors` | `Sensor[]` | Input methods that trigger drag (e.g. `PointerSensor` for mouse + touch) |
| `onDragEnd` | `(event) => void` | Fired when a drag completes; receives `{ active, over }` |

`active.id` — id of the dragged item  
`over` — the droppable it landed on, or `null` if dropped outside any droppable

### useDraggable
Attach to the element being dragged.

| Returned | Purpose |
|---|---|
| `setNodeRef` | Attach to the DOM element to track position |
| `listeners` | Spread onto the drag handle to activate dragging |
| `attributes` | ARIA attributes (role, tabIndex, aria-describedby) |
| `transform` | `{ x, y, scaleX, scaleY }` — offset while dragging; apply inline: `transform ? \`translate3d(${transform.x}px, ${transform.y}px, 0)\` : undefined` |

### useDroppable
Attach to a drop target column.

| Returned | Purpose |
|---|---|
| `setNodeRef` | Attach to the DOM element |
| `isOver` | `true` when a draggable is hovering over this column |

**Sources:**
- [Getting Started](https://dndkit.com/legacy/introduction/getting-started/)
- [DndContext](https://dndkit.com/legacy/api-documentation/context-provider/dnd-context/)
- [useDraggable](https://dndkit.com/legacy/api-documentation/draggable/use-draggable/)
- [useDroppable](https://dndkit.com/legacy/api-documentation/droppable/use-droppable)
- [Sensors](https://dndkit.com/legacy/api-documentation/sensors/)
- [React Drag & Drop Made Easy with @dnd-kit](https://www.youtube.com/watch?v=ZALLXGVc_HU)


---

## Step 1 — Install Dependencies

```
npm install @dnd-kit/core
```

---

## Step 2 — View Toggle

**Files:**
- `job-tracker-ui/src/pages/JobPage.tsx` — add `viewMode` state; Table/Kanban icon buttons; conditionally renders `<JobTable />` or `<KanbanBoard />`

---

## Step 3 — KanbanBoard Layout

**Files:**
- `job-tracker-ui/src/components/KanbanBoard.tsx` — new component; six columns (one per `JobStatus`); each column lists its jobs as cards; no DnD yet; calls `useJobs()` independently (TQ cache shared, no extra backend call); no "Add New Job" button

---

## Step 4 — Drag and Drop

**Files:**
- `job-tracker-ui/src/components/KanbanBoard.tsx` — wrap with `DndContext`; `useDraggable` on cards; `useDroppable` on columns; `onDragEnd` calls `usePatchJob`

---

## Feature Idea — Group By Toggle

Add a **Status | Priority** toggle inside the Kanban view. Columns, filtering, and the drag patch operation all switch based on the selection.

**Not yet started.**

### Design Decisions

| Decision | Reasoning |
|---|---|
| `groupBy` state lives inside `KanbanBoard` | Kanban-specific concern; `JobPage` doesn't need it |
| Column config object `{ id, label, bgClass }` | Decouples `KanbanColumn` from the dimension; same component renders both |
| `handleDragEnd` uses `groupBy` to pick patch path | Status grouping → `path: '/status'`; Priority grouping → `path: '/priority'` |

### Steps

| # | Item | Status |
|---|---|---|
| 1 | Add `groupBy` state + toggle UI in `KanbanBoard` | — |
| 2 | Add `PRIORITY_BG` color map | — |
| 3 | Build `getColumns()` — returns `{ id, label, bgClass }[]` for active dimension | — |
| 4 | Generalize `KanbanColumn` to accept config object instead of `status: JobStatus` | — |
| 5 | Update `handleDragEnd` to patch the right field based on `groupBy` | — |
