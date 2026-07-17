# Profile page: inline view/edit refactor

Date: 2026-07-16, updated 2026-07-17. Branch: `feat/profile-analysis`.

## Decisions

The profile page originally rendered all 12 sections as permanently live forms. That worked, but the page read as one big form: hard to scan, easy to dirty a section with a stray click, and every card carried a mostly-disabled Save button. We switched to the LinkedIn-style pattern:

- Every section renders a compact read-only view with a pencil button. Clicking it swaps the card in place to the existing edit form. Save or Cancel returns to view mode.
- Empty sections show muted placeholder text (per-section `emptyText`, wording set in `ProfilePage`), and the header button swaps its pencil for a + icon. The original empty-state "+ Add" body button was dropped — it was functionally identical to the pencil (both called `onEdit`).
- Entry-based sections seed a blank entry when opened via the + button, so inputs appear in one click. Multi-entry sections (salary, locations, work history, education, work rights) also show a + next to the pencil once entries exist — appends a blank entry, opens edit, and scrolls it into view. (Salary became a per-currency array on 2026-07-17 — see section below; it was previously a single nullable object with no add-another.)
- A shared `ProfileSectionCard` component owns the card chrome (title, error line, Save/Cancel row, view/edit switch) that was previously copy-pasted across all 8 section components.
- Page header gets **Edit all**. While any section is open, the header shows **Save all** (one PATCH containing every dirty field; the merge-patch endpoint already accepts multiple fields) and **Cancel all**. Per-section Save buttons keep working.
- First visit with no profile row auto-opens every section in edit mode, so the initial fill feels like the old page. The first save stays a full PUT.
- Per-section `saveBlocked` validation moved to `utils/profileValidation.ts` so the page can disable Save all while any open section is invalid. The checks themselves are unchanged.
- The profile score ring still computes from the live form state, so it updates while you type in an open section.

## Status + next session

**This profile page + model track is the active priority — it must be completed before the deferred Job Analysis work (`docs/plans/job-analysis.md`, Steps 7–10 / C8) is picked up.**

All of it is committed on `feat/profile-analysis` (section-wiring refactor, entry-list extraction, and the salary → per-currency array). `npm run build` green, all 53 frontend tests pass. Manual browser verification still to do:

1. Per-section flow: pencil → edit → Save persists and returns to view; Cancel reverts and closes; empty sections show placeholder text with a + header button.
1a. Add flows: + on an empty entry-based section (salary, locations, work history, education, work rights) opens edit with one blank entry — inputs in one click; + next to the pencil on a filled multi-entry section appends a blank entry and scrolls to it; Cancel reverts to the pre-add state.
2. Edit all → change 2–3 sections → Save all → network tab shows **one** PATCH with only the dirty fields; all sections close.
3. Concurrent-edit fix: open two sections, edit both, Save only one — the other must keep its unsaved edits (the data-sync effect now merges instead of overwriting the form).
4. First run (fresh or demo-reset account): page lands with all sections open in edit mode; first Save (or Save all) issues a PUT, later saves PATCH.
5. Invalid entries (e.g. work history without a company) keep Save and Save all disabled, same rules as before.
6. Dark mode + narrow viewport: read-view chips/text, header Edit all / Save all buttons.

Commit after verification.

## Refactor: shared section wiring (2026-07-17)

The section components had accumulated copy-paste. First cleanup batch, behavior unchanged (build green, 53 tests pass):

- `components/profile/sectionProps.ts` — shared `SectionProps<T>` prop contract. Every section now declares `type Props = SectionProps<X> & { ...extras }` instead of repeating the 9-field block.
- `sectionProps(key)` helper in `ProfilePage` generates the shared wiring (value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error). Call sites collapsed to `<WorkHistorySection {...sectionProps("workHistory")} />`; only per-section props (title, options, tag config) stay explicit.
- Dirty is computed once in the page (`dirtyKeys`, which Save all already needed) and passed down. The per-section `JSON.stringify` / `arraysEqual` checks are gone. `savedValue` now goes only to `TagSection`, which forwards it to `TagInput` for saved-chip styling.
- `TAG_SECTIONS` keyed as a `Record<TagFieldKey, ...>` (drops the `.find()!`); `data ?? EMPTY_PROFILE` hoisted to a single `saved` const.

Net: 9 files, +69/−215 lines.

## Refactor: entry-list machinery extracted (2026-07-17)

Done, behavior unchanged (build green, 53 tests pass). Net: −144 lines across the 4 sections.

- `hooks/useScrollToNewItem.ts` — app-generic scroll-to-appended-item hook (`lastItemRef` + `requestScroll()`); reusable outside profile.
- `components/profile/useEntryList.ts` — composes it; owns `addEntry`/`handleAdd`/`updateEntry`/`removeEntry` for entry-based sections.
- `components/profile/EntryRow.tsx` — entry box chrome + trash button (uses React 19 ref-as-prop; WorkRights overrides layout via `className`), plus `AddEntryButton` footer button. The WH/Edu `disabled={dirty}` add-lock inconsistency is preserved as-is (see Known follow-ups).

Open decision: possibly switch entry-based sections to a per-entry modal/dialog (LinkedIn-faithful). Conflicts with Edit all / Save all and first-visit-all-open; decide before or together with the drafts state model below. Extracted handlers would move into the dialog largely unchanged.

## Salary expectations → per-currency array (2026-07-17)

Done, committed pending manual browser check. `salaryExpectation` (single nullable object) is now `salaryExpectations: SalaryExpectation[]`, max 3, distinct currencies.

- **Root fix**: clearing a nullable object via PATCH was impossible — `null` means "leave unchanged" in the merge-patch contract, so a cleared salary never persisted. An empty array (`[]`) clears cleanly like every other section. Salary was the only field with this collision.
- Also enables multi-market seekers (e.g. NZD + AUD) and unifies salary with the entry-based sections — `SalaryExpectationSection` rewritten on `useEntryList` + `EntryRow` (mirrors `WorkingRightsSection`), dropping its bespoke single-object view/add code.
- Distinct-currency rule enforced both sides (`ProfileDTO.Validate`, `salaryExpectationsInvalid`). Backend AI prompt lists each expectation (1 → one line; >1 → "by market" bullets, model picks the matching currency).
- Migration `SalaryExpectationsArray`: renames the jsonb column and reshapes existing rows (object → `[object]`, null → `[]`).
- Backend 209 tests pass (3 new: cap, duplicate-currency, distinct-currency); frontend build + 53 tests pass.

## Languages model: combine with fluency (2026-07-18)

Done, committed. Backend build + 211 tests pass, frontend build + 53 tests pass. `Languages` was a plain `string[]` rendered via the generic `TagSection` (same family as Skills/Certifications/TargetRoles); now one general fluency level per language — no writing/speaking breakdown, a single scale per entry.

- **Fluency scale**: LinkedIn-style 5 levels — Elementary, Limited working, Professional working, Full professional, Native or bilingual — plus `Unspecified` (value 0) so the migration can reshape old string rows without inventing a fluency the user never entered. `Unspecified` is a real, selectable option in the UI, not a hidden sentinel; new entries default to `ProfessionalWorking`.
- **Model**: `Languages: List<string>` → `Languages: List<LanguageEntry>`, mirroring the existing `WorkingRightEntry` pattern (`{ Country, Status }` → `{ Language, Fluency }`) exactly, including the `Fluency` field being nullable only so `[Required]` catches an omitted value in the request DTO. New `Models/LanguageEntry.cs` + `Models/Enums/LanguageFluency.cs`; type change on `UserProfile`/`ProfileDTO`/`ProfileResponseDto`. `ValidationConstants.MaxProfileLanguageItemLength`(30)/`MaxProfileLanguagesCount`(15) carry over onto the `Language` sub-field and array count. `ProfileDTO.Validate()`'s old manual per-item length check for `Languages` is gone — `[MaxLength]` on `LanguageEntry.Language` is deep-validated automatically by `[ApiController]`, same as `WorkingRights.Country` already was.
- **EF config**: `JobTrackerContext` gets `OwnsMany(p => p.Languages, l => l.ToJson())`, closing the "no explicit config" gap noted below — Languages moves from the bare `text[]` primitive-collection group to the JSONB owned-collection group alongside `WorkingRights`/`WorkHistory`/etc.
- **Migration** (`LanguagesFluencyEntry`): reshapes `["English"]` → `[{ language: "English", fluency: "Unspecified" }]`. Postgres rejects a correlated subquery directly inside `ALTER COLUMN ... USING` (`cannot use subquery in transform expression`) for a genuine type change (`text[]` → `jsonb`, unlike the same-type `SalaryExpectationsArray` reshape) — worked around via rename-old/add-new/backfill-via-`UPDATE`/drop-old instead of a single `AlterColumn`.
- **Frontend**: moved out of the `TagSection`/`TAG_SECTIONS` family into the entry-list family (`useEntryList` + `EntryRow`, like `WorkingRightsSection`) — new `LanguagesSection.tsx` component + `LanguageCombobox.tsx` (mirrors `CountryCombobox`, no flags, searches `LANGUAGE_SUGGESTIONS` names directly). Fluency picker reuses the existing `Select` + `formatEnumLabel` pairing (`SalaryExpectationSection`'s period picker) rather than a bespoke label map — new `ENUM_DISPLAY_OVERRIDES` entries for the multi-word levels.
- **Also touched**: `ClaudeAnalysisService.cs` prompt formatting (~line 150) now surfaces fluency (`"English (NativeOrBilingual)"`, raw enum interpolation matching how `WorkingRights` already renders); `profileScore.ts` needed no change (`languages: { strategy: "presence" }` is shape-agnostic); `ProfileDTOTests`' language-item-length test replaced with `LanguageEntry_*` entry-level tests mirroring the `WorkingRightEntry_*` block; `profileScore.test.ts` fixtures updated to the new shape.

## Next session: remaining simplifications

In suggested order (1 changes the page's state architecture and needs manual testing):

1. **Drafts state model.** Replace the full `form` mirror, the data-sync merge effect, `editingRef`, and the `editingSections` set with a single `drafts: Partial<UserProfile>` holding only sections being edited. View mode reads `data` directly, so a refetch can never clobber an open edit. Open copies `data[key]` into drafts, cancel deletes the key, `editing` = key in drafts, score = `computeProfileScore({ ...saved, ...drafts })`. Removes the sync-effect bug class entirely. Touches save/cancel/first-run (PUT) flows — test those by hand.
2. **Carry-overs from Known follow-ups below**: lazy `view` prop on `ProfileSectionCard`, the add-button dirty-lock inconsistency, scoring rules for the five newer fields.
3. **Smaller**: `tagSuggestions.ts` is 10.6k lines of data eagerly imported into the page bundle — consider a dynamic `import()`. (The old `SalaryExpectationSection` add-button duplication is gone — resolved by the salary-array rewrite below.)

## Known follow-ups

- **Eager `view` prop on `ProfileSectionCard`**: the `view={...}` JSX is evaluated on every render even while editing, so view-mode markup runs against half-filled draft entries. This is how the `getCountryName("")` crash happened (guarded in the helper since); any future view code assuming complete data can crash the same way. Fix by making the card render `view` lazily (render function, or mount only when `!editing`).
- **Internal add-button dirty-lock inconsistency**: WorkHistory and Education disable their in-form add button while dirty (one new entry per save cycle); Locations and WorkRights never disable theirs. Pick one behavior.
- **Add-entry not blocked at max count**: the footer `AddEntryButton` disables at the cap (salary: 3), but the section-header `+` (`handleAdd`) still appends past it — the extra entry just can't save. Prefer *hiding* add-entry (header + footer) at max over disabling. Likely affects all multi-entry sections (locations, work rights, etc.).
- **Duplicate currency has no feedback**: a repeated currency blocks Save (correctly) but shows no message. Same silent-block pattern as other save-blocking validation; consider surfacing a hint.
- **Scoring rules**: `profileScore.ts` does not cover the five newer profile fields (`workModes`, `contractTypes`, `salaryExpectations`, `preferredLocations`, `additionalConditions`). The exhaustive `satisfies Record<keyof UserProfile, SectionRule>` constraint is commented out (relaxed to `Partial`) until scoring rules for them are designed.

## Previous pattern

Pre-refactor code (always-live forms, per-section `value/onChange/savedValue/saving/onSave/error` prop contract, PUT-then-PATCH save flow) is recoverable from git at commit `173a5fd`.
