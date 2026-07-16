# Profile page: inline view/edit refactor

Date: 2026-07-16. Branch: `feat/profile-analysis`.

## Decisions

The profile page originally rendered all 12 sections as permanently live forms. That worked, but the page read as one big form: hard to scan, easy to dirty a section with a stray click, and every card carried a mostly-disabled Save button. We switched to the LinkedIn-style pattern:

- Every section renders a compact read-only view with a pencil button. Clicking it swaps the card in place to the existing edit form. Save or Cancel returns to view mode.
- Empty sections show a "+ Add …" button instead of a blank card.
- A shared `ProfileSectionCard` component owns the card chrome (title, error line, Save/Cancel row, view/edit switch) that was previously copy-pasted across all 8 section components.
- Page header gets **Edit all**. While any section is open, the header shows **Save all** (one PATCH containing every dirty field; the merge-patch endpoint already accepts multiple fields) and **Cancel all**. Per-section Save buttons keep working.
- First visit with no profile row auto-opens every section in edit mode, so the initial fill feels like the old page. The first save stays a full PUT.
- Per-section `saveBlocked` validation moved to `utils/profileValidation.ts` so the page can disable Save all while any open section is invalid. The checks themselves are unchanged.
- The profile score ring still computes from the live form state, so it updates while you type in an open section.

## Status + next session

Code complete, **not committed**. `npm run build` green, all 53 frontend tests pass. Manual browser verification still to do:

1. Per-section flow: pencil → edit → Save persists and returns to view; Cancel reverts and closes; empty sections show "+ Add …".
2. Edit all → change 2–3 sections → Save all → network tab shows **one** PATCH with only the dirty fields; all sections close.
3. Concurrent-edit fix: open two sections, edit both, Save only one — the other must keep its unsaved edits (the data-sync effect now merges instead of overwriting the form).
4. First run (fresh or demo-reset account): page lands with all sections open in edit mode; first Save (or Save all) issues a PUT, later saves PATCH.
5. Invalid entries (e.g. work history without a company) keep Save and Save all disabled, same rules as before.
6. Dark mode + narrow viewport: read-view chips/text, header Edit all / Save all buttons.

Commit after verification.

## Known follow-ups

- **Salary empty-state double click**: an empty Salary section shows "+ Add salary expectation", which opens edit mode where the form's own null-state shows a second identical button. Two clicks before the inputs appear. Possible fix: seed an empty `SalaryExpectation` when entering edit from the empty state (Cancel still reverts to none). Deferred for now.
- **Scoring rules**: `profileScore.ts` does not cover the five newer profile fields (`workModes`, `contractTypes`, `salaryExpectation`, `preferredLocations`, `additionalConditions`). The exhaustive `satisfies Record<keyof UserProfile, SectionRule>` constraint is commented out (relaxed to `Partial`) until scoring rules for them are designed.

## Previous pattern

Pre-refactor code (always-live forms, per-section `value/onChange/savedValue/saving/onSave/error` prop contract, PUT-then-PATCH save flow) is recoverable from git at commit `173a5fd`.
