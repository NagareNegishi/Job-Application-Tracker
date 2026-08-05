# Profile page: inline view/edit refactor

Branch: `feat/profile-analysis`. Updated 2026-08-04.

The profile page + model work is built and committed on this branch. All mandatory work is done (view/edit refactor, model changes, scoring for the newer fields, bundle split). What remains is optional (below); the next track is the deferred Job Analysis work (`docs/plans/job-analysis.md`, Steps 7–10 / C8).

## Architecture (load-bearing decisions)

- **View/edit in place.** Each section renders a read-only view with a pencil; clicking swaps the card to an edit form. Shared `ProfileSectionCard` owns the chrome (title, error line, Save/Cancel, view/edit switch). Empty sections show placeholder text + a `+` header button that seeds a blank entry.
- **Edit all / Save all.** The page header can open every section at once; Save all issues one PATCH with only the dirty fields. Per-section Save also works. First save on a profile with no row is a full PUT; later saves PATCH.
- **Validation** lives in `utils/profileValidation.ts` (per-section `saveBlocked`) so the page can disable Save all while any open section is invalid.
- **Score ring** computes from live form state (`computeProfileScore`), updating as you type.
- **Data-model gotchas:**
  - `salaryExpectations` is an array, not a nullable object, so a cleared value persists — in merge-PATCH `null` means "leave unchanged", so a single nullable object could never be cleared; `[]` clears cleanly. Max 3, distinct currencies.
  - `Languages` are `LanguageEntry { Language, Fluency }`; `Unspecified` fluency is legacy-migration-only (filtered out of the picker for new entries).
  - Server-side dedup in `ProfileDTO.Validate()` for every multi-value field with a natural key; `WorkHistory`/`Education` excluded (no key).

## Remaining (optional; do before Job Analysis if picked up)

**Drafts state-model simplification — not a bug fix.** The concurrent-save data-loss case people worried about is already handled: the data-sync effect in `ProfilePage.tsx` rebuilds `form` from server `data` but preserves keys still in `editingRef`. The refactor is pure simplification — collapse the `form` mirror + data-sync merge effect + `editingRef` + `editingSections` set into one `drafts: Partial<UserProfile>` holding only the sections being edited (view reads `data`; open copies `data[key]` in; cancel deletes the key; `editing` = key in drafts; score = `computeProfileScore({ ...saved, ...drafts })`). Removes the eager-`view`-prop hazard below by construction. Touches save/cancel/first-run flows — verify by hand.

**Polish follow-ups:**
- **Eager `view` prop on `ProfileSectionCard`:** `view={...}` JSX evaluates every render even while editing, so view markup runs against half-filled draft entries (caused the `getCountryName("")` crash, now guarded). Render `view` lazily (render function, or mount only when `!editing`).
- **Add-button dirty-lock inconsistency:** WorkHistory/Education disable their in-form add button while dirty; Locations/WorkRights don't. Pick one.
- **Add-entry not blocked at max:** the header `+` (`handleAdd`) appends past the cap (salary: 3) even though the footer add disables there. Prefer hiding add at max, both places.
- **Duplicate value has no feedback:** a repeated value blocks Save but shows no message. Consider a hint.

## Dropped

**Language free-text validation.** The creatable `LanguageCombobox` accepts any typed name. Decided not to validate it: English-first app, few non-English users, and a bad value only degrades the user's own AI analysis (self-inflicted, no security or multi-user risk). The existing backend `[MaxLength(30)]` guard is enough. Revisit only if a real user hits it — e.g. a legitimate name over 30 chars; the one cheap anti-garbage check worth adding then is "no 3+ identical consecutive chars".
