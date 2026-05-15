# Kanban Board Plan

## Overview

Add a view toggle to the job list page (Table / Kanban). Kanban mode shows all jobs grouped by `JobStatus` as columns. Dragging a card to a different column patches the job's status via the existing PATCH endpoint.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| @dnd-kit/core over alternatives | React 19 compatible; actively maintained; mouse/touch/keyboard out of the box |
| Server-round-trip on drop, not optimistic | `usePatchJob` + TQ invalidation already handles it; saves complexity |
| All statuses shown in Kanban, no tab filtering | Tabs are a table concept; Kanban already shows all statuses as columns |
| Hide tabs in Kanban mode | Tabs don't apply; showing them would be confusing |
| `viewMode` state in `JobTable`, not a new page | Toggle is a view preference, not a route change |
| `KanbanBoard` as a separate component | Keeps `JobTable` manageable; DnD logic stays contained |

---

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Install @dnd-kit/core + @dnd-kit/utilities | Pending |
| 2 | Add viewMode toggle to JobTable toolbar | Pending |
| 3 | Create KanbanBoard component (layout) | Pending |
| 4 | Add drag-and-drop + status patch on drop | Pending |

---

## Dependencies

### @dnd-kit/core
Core drag-and-drop primitives. Provides `DndContext`, `useDraggable`, `useDroppable`, and sensors.

### @dnd-kit/utilities
Helper utilities. Provides `CSS.Translate.toString(transform)` to convert the transform object from `useDraggable` into a CSS string.

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
| `transform` | `{ x, y, scaleX, scaleY }` — offset while dragging; convert with `CSS.Translate.toString(transform)` |

### useDroppable
Attach to a drop target column.

| Returned | Purpose |
|---|---|
| `setNodeRef` | Attach to the DOM element |
| `isOver` | `true` when a draggable is hovering over this column |

**Sources:**
- [Overview](https://docs.dndkit.com/)
- [DndContext](https://docs.dndkit.com/api-documentation/context-provider)
- [useDraggable](https://docs.dndkit.com/api-documentation/draggable/usedraggable)
- [useDroppable](https://docs.dndkit.com/api-documentation/droppable/usedroppable)
- [Sensors](https://docs.dndkit.com/api-documentation/sensors)

---

## Step 1 — Install Dependencies

```
npm install @dnd-kit/core @dnd-kit/utilities
```

---

## Step 2 — View Toggle

**Files:**
- `job-tracker-ui/src/components/JobTable.tsx` — add `viewMode` state; Table/Kanban icon buttons in toolbar; hide tabs when `viewMode === "kanban"`

---

## Step 3 — KanbanBoard Layout

**Files:**
- `job-tracker-ui/src/components/KanbanBoard.tsx` — new component; six columns (one per `JobStatus`); each column lists its jobs as cards; no DnD yet

---

## Step 4 — Drag and Drop

**Files:**
- `job-tracker-ui/src/components/KanbanBoard.tsx` — wrap with `DndContext`; `useDraggable` on cards; `useDroppable` on columns; `onDragEnd` calls `usePatchJob`
