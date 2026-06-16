# Dark Mode & Theme Plan

## Phase 1 — Completed

Deviations from plan:
- `PriorityDot.tsx` — added dark variants after all: Low `dark:bg-slate-300`; Medium `dark:bg-yellow-500`; High `dark:bg-orange-500`; Urgent `dark:bg-red-600`
- Status badges + tab styles — dark text toned down to `-400`, borders one step darker than planned
- Kanban card hover — added `dark:hover:border-white/20` + `transition-colors` (shadow invisible on dark bg)
- `index.css` `.dark` block — `--foreground`, `--card-foreground`, `--secondary-foreground` softened to `oklch(0.88 0 0)`; `scrollbar-color` added

## Current state

- `index.css` already has a full `.dark` CSS variable block — all shadcn/ui components flip automatically
- 43 of 47 component files already use semantic variables (`bg-background`, `text-foreground`, etc.)
- No theme toggle exists yet; no `.dark` class is ever applied to `<html>`

## Phase 1 — Dark mode toggle

### Step 1 — Fix hardcoded colors in 4 files

These files use status/priority-specific colors that need `dark:` variants added alongside existing classes.

**`StatusBadge.tsx`** — `statusStyles` map:

| Status | Current | Add dark: variants |
|---|---|---|
| Wishlist | `bg-slate-100 text-slate-700 border-slate-300` | `dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600` |
| Applied | `bg-blue-100 text-blue-700 border-blue-300` | `dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700` |
| Screening | `bg-yellow-100 text-yellow-700 border-yellow-300` | `dark:bg-yellow-900/50 dark:text-yellow-300 dark:border-yellow-700` |
| Interview | `bg-purple-100 text-purple-700 border-purple-300` | `dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700` |
| Offered | `bg-green-100 text-green-700 border-green-300` | `dark:bg-green-900/50 dark:text-green-300 dark:border-green-700` |
| Rejected | `bg-red-100 text-red-700 border-red-300` | `dark:bg-red-900/50 dark:text-red-300 dark:border-red-700` |

**`KanbanBoard.tsx`** — `COLUMN_BG` map:

| Status | Current | Add dark: variant |
|---|---|---|
| Wishlist | `bg-slate-50/70` | `dark:bg-slate-800/40` |
| Applied | `bg-blue-50/70` | `dark:bg-blue-900/20` |
| Screening | `bg-yellow-50/70` | `dark:bg-yellow-900/20` |
| Interview | `bg-purple-50/70` | `dark:bg-purple-900/20` |
| Offered | `bg-green-50/70` | `dark:bg-green-900/20` |
| Rejected | `bg-red-50/70` | `dark:bg-red-900/20` |

**`JobTable.tsx`** — `TAB_STYLES` map:

| Tab | Current | Add dark: variants |
|---|---|---|
| active | `bg-blue-50 text-blue-800 border-blue-300` | `dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700` |
| closing-soon | `bg-amber-50 text-amber-800 border-amber-300` | `dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700` |
| all | `bg-slate-50 text-slate-700 border-slate-300` | `dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-600` |
| rejected | `bg-rose-50 text-rose-800 border-rose-300` | `dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-700` |

**`PriorityDot.tsx`** — `priorityColors` map (intentional bright colors; keep as-is, they work on dark backgrounds):

| Priority | Current | Decision |
|---|---|---|
| Low | `bg-slate-400` | Keep — readable on dark |
| Medium | `bg-yellow-400` | Keep |
| High | `bg-orange-400` | Keep |
| Urgent | `bg-red-500` | Keep |

### Step 2 — `useTheme` hook

File: `src/hooks/useTheme.ts`

- On mount: read from `localStorage`; fall back to `prefers-color-scheme` media query
- Apply/remove `.dark` class on `<html>`
- Expose `theme` (`"light" | "dark"`) and `toggleTheme()`
- Persist choice to `localStorage` on toggle

### Step 3 — Toggle UI

- Add a sun/moon icon button to `NavBar` (right side, next to user menu)
- Calls `toggleTheme()` from `useTheme`
- No backend storage needed for dark mode — `localStorage` is sufficient

---

## Phase 2 — In Progress

Deviations from plan:
- Used `--color-primary` and `--color-ring` alongside `--primary`/`--ring` — Tailwind v4 resolves `@theme inline` var() references at build time; `--color-*` prefix needed for utility classes to react at runtime
- All `.dark` variables replicated with hue-tinted values — not just primary; covers background, card, secondary, muted, accent, border, input, ring
- Yellow hue shifted H=85 → H=95 — H=85 resolved as olive/brown; H=95 gives vivid yellow
- Dark mode primary L=0.60 — same −0.10 delta as existing dark mode foreground softening (0.985→0.88)

Themes defined (CSS only, not yet wired to preferences or UI):
- blue (H=250), red (H=15), yellow (H=95), pink (H=330, C=0.32)

"Pop" theme deferred — needs research:
- `filter: saturate()` on `html` had no visible effect
- `.bg-primary` scoped `box-shadow` glow had no visible effect
- Likely needs investigation into how Tailwind v4 generates class names at runtime and whether scoped descendant selectors on `html` work as expected

## Phase 2 — Custom color themes

### Approach

- Define multiple named theme CSS variable sets in `index.css` (e.g. `.theme-blue`, `.theme-green`, `.theme-rose`) overriding accent/primary variables
- Apply theme class alongside `.dark` on `<html>`
- Store chosen theme in `UserPreferences` (new `theme` field) — persists across devices via existing preferences endpoint
- Theme picker in `SettingsPage` — a row of color swatches

### Backend changes

- Add `Theme` string field to `UserPreferences` / `UserPreferencesDto`
- No migration needed — stored in existing JSON column

### Scope decision

Phase 2 is independent of Phase 1. Complete Phase 1 first.
