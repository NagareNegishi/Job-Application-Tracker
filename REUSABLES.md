# Reusable pieces

A curated snapshot of the project-agnostic utils and components written for this
project, collected in `reusables/` so they can be lifted into another project.

**These are copies.** The app still imports its own originals under
`job-tracker-ui/src/`; the files here are duplicates kept in sync by hand. Two
copies of each file is deliberate — this is a portfolio project and the snapshot
is meant to travel on its own. Nothing here is wired into the build.

Everything listed is free of job-tracker domain knowledge. Most are verbatim
copies; a few (`apiFetch`, `InlineEditCard`) were generalized from a
domain-coupled original — noted per row. Domain-specific helpers (`profileScore`,
`dashboardUtils`, the `*Query` hooks, `StatusBadge`, etc.) are intentionally left
out.

## To reuse a piece

Copy its file, then pull in whatever it depends on (the "Needs" column). Two
kinds of dependency:

- **shadcn/ui** primitives (`button`, `input`, `dialog`, `calendar`, `popover`,
  `checkbox`, `label`, `select`, `command`) are bundled under `shadcn/` — copy
  those too, or re-add a fresh one with `npx shadcn@latest add <name>`.
- **In-collection** deps are other rows in these tables; grab them too.

Import paths in the copies still use the app's `@/` alias
(`@/lib/utils`, `@/components/ui/...`, `@/utils/...`) — repoint them to wherever
the files land in the target project.

## util/

| File | What it does | Needs |
|---|---|---|
| `cn.ts` | Merge Tailwind class strings with conflict resolution (the shadcn `cn` helper). | `clsx`, `tailwind-merge` |
| `dateFormat.ts` | Human-readable date fragments, e.g. `formatMonthYear(2021, 3)` → "Mar 2021". | — |
| `dateValidation.ts` | `checkDateOrder` / `checkNotFuture` — validate a from→to range at year/month/day granularity; returns an error string or null. | — |
| `matchSuggestion.ts` | `matchesSuggestion(suggestion, query, strategy)` for autocomplete — `prefix` / `word-start` / `substring`. | — |
| `scoreColor.ts` | Map a 0–100 score to a perceptually uniform OKLCH colour (fixed L/C, hue sweeps red→green). | — |
| `validateTag.ts` | Validate a tag/free-text entry (length, duplicates, max count, rejects HTML); returns an error string or null. | — |
| `useScrollToNewItem.ts` | Hook: smooth-scroll a newly appended list item into view. Attach `lastItemRef`, call `requestScroll()` before appending. | `react` |
| `useTheme.ts` | Hook: light/dark + colour-theme state persisted to `localStorage`, falling back to OS preference. Colour-theme list is app-editable. | `react` |
| `apiFetch.ts` | *Generalized from `api.ts`.* `createApiClient(config)` → an authed fetch that attaches a Bearer token, sends cookies, and on 401 does a single-flight refresh + one retry; plus `ApiError` / `handleResponse` / `handleEmptyResponse`. Refresh endpoint + session-expiry callback are config. | — |

## component/

| File | What it does | Needs |
|---|---|---|
| `UnderlinedText.tsx` | Text with a styled underline accent. | — |
| `ScoreRing.tsx` | Circular 0–100 progress ring coloured by the score. | util `scoreColor` |
| `ResponsiveButton.tsx` | Button showing label + icon on wide screens, icon-only when narrow. | shadcn `button` |
| `FormActionBar.tsx` | Save/Cancel action row for forms, with dirty/saving states. | shadcn `button`; util `cn` |
| `IconToggle.tsx` | Two-state icon toggle button. | shadcn `button`; util `cn` |
| `EntryRow.tsx` | Bordered row wrapper with a trailing delete button, plus an `AddEntryButton` footer button — for editable list-of-entries UIs. | shadcn `button`; util `cn` |
| `CheckboxGroup.tsx` | A labelled group of checkboxes over an option list. | shadcn `checkbox`, `label` |
| `ConfirmDialog.tsx` | Generic confirm/cancel modal. | shadcn `button`, `dialog` |
| `DeleteConfirmDialog.tsx` | Destructive-action confirm modal (delete styling). | util `cn`; in-collection `ConfirmDialog` |
| `DatePicker.tsx` | Popover calendar date picker. | shadcn `button`, `calendar`, `popover`; util `cn` |
| `SuggestionInput.tsx` | Text input with an autocomplete suggestion dropdown. | shadcn `input`; util `cn`, `matchSuggestion` |
| `TagInput.tsx` | Tag/chip input: type-and-enter, validation, optional suggestions. | util `matchSuggestion`, `validateTag` |
| `MonthSelect.tsx` | Month dropdown (`null` = unselected; month is optional). | shadcn `select` |
| `YearSelect.tsx` | Year dropdown, 1900→current descending (`0` = unselected sentinel). | shadcn `select` |
| `MonthYearPicker.tsx` | Labelled month + year row (month optional, year required). | in-collection `MonthSelect`, `YearSelect`; shadcn `label` |
| `CountryCombobox.tsx` | Searchable ISO-country picker with flags and an `excludeCodes` prop. Needs the `flag-icons` CSS import for flags. | in-collection `countryCodes`; shadcn `button`, `command`, `popover`; util `cn`; npm `flag-icons` |
| `countryCodes.ts` | ISO alpha-2 country list + `getCountryName` (via `Intl.DisplayNames`), sorted by display name. | — |
| `InlineEditCard.tsx` | *Generalized from `ProfileSectionCard`.* LinkedIn-style titled card: read-only view + pencil, swaps to an edit form in place, Save/Cancel footer, empty-state placeholder, optional add (+). Also exports `ViewChips`. | shadcn `button` |

## shadcn/

Stock [shadcn/ui](https://ui.shadcn.com) primitives, included only because the
components above depend on them. Each also depends on `cn` (in `util/`). These
are third-party generated, not authored here — prefer `npx shadcn@latest add
<name>` in a fresh project and use these copies as a version reference. Built
against `radix-ui@1.5`, `react-day-picker@9`, `class-variance-authority@0.7`.

| File | npm deps |
|---|---|
| `button.tsx` | `radix-ui`, `class-variance-authority` |
| `input.tsx` | — |
| `label.tsx` | `radix-ui` |
| `checkbox.tsx` | `radix-ui` |
| `dialog.tsx` | `radix-ui` (+ in-collection `button`) |
| `popover.tsx` | `radix-ui` |
| `calendar.tsx` | `react-day-picker` (+ in-collection `button`) |
| `select.tsx` | `radix-ui` |
| `command.tsx` | `cmdk` (+ in-collection `dialog`) |
