# Profile page: inline view/edit refactor

Date: 2026-07-16, updated 2026-08-04. Branch: `feat/profile-analysis`.

**This profile page + model track is the active priority — finish it before the deferred Job Analysis work (`docs/plans/job-analysis.md`, Steps 7–10 / C8).**

## Decisions

Profile originally rendered all 12 sections as permanently-live forms — the page read as one big form (hard to scan, easy to dirty with a stray click, every card carried a mostly-disabled Save). Switched to the LinkedIn-style view/edit pattern:

- Every section renders a compact read-only view with a pencil button; clicking swaps the card in place to the edit form. Save/Cancel returns to view mode.
- Empty sections show muted placeholder text (per-section `emptyText`, set in `ProfilePage`); the header button shows + instead of the pencil. The old empty-state "+ Add" body button was dropped — identical to the pencil (both call `onEdit`).
- Entry-based sections seed a blank entry when opened via +, so inputs appear in one click. Multi-entry sections (salary, locations, work history, education, work rights) also show a + next to the pencil once entries exist — appends a blank entry, opens edit, scrolls it into view.
- Shared `ProfileSectionCard` owns the card chrome (title, error line, Save/Cancel row, view/edit switch) previously copy-pasted across all 8 section components.
- Page header has **Edit all**; while any section is open it shows **Save all** (one PATCH with every dirty field) and **Cancel all**. Per-section Save still works.
- First visit with no profile row auto-opens every section in edit mode; the first save is a full PUT, later saves PATCH.
- Per-section `saveBlocked` validation lives in `utils/profileValidation.ts` so the page can disable Save all while any open section is invalid.
- The profile score ring computes from live form state, so it updates while you type.

## Completed (committed on `feat/profile-analysis`)

`npm run build` green; frontend 53 tests, backend 220 tests pass.

- **Shared section wiring (07-17).** `components/profile/sectionProps.ts` — `SectionProps<T>` contract; `sectionProps(key)` helper in `ProfilePage` generates shared wiring, call sites collapse to `<WorkHistorySection {...sectionProps("workHistory")} />`. Dirty computed once in the page (`dirtyKeys`), passed down — per-section `JSON.stringify`/`arraysEqual` gone. `TAG_SECTIONS` keyed as `Record<TagFieldKey, ...>`.
- **Entry-list machinery (07-17).** `hooks/useScrollToNewItem.ts` (app-generic scroll-to-appended-item); `components/profile/useEntryList.ts` (add/update/remove for entry sections); `components/profile/EntryRow.tsx` (entry chrome + trash, `AddEntryButton`).
- **Salary → per-currency array (07-17).** `salaryExpectation` (single nullable object) → `salaryExpectations: SalaryExpectation[]`, max 3, distinct currencies. Root fix: clearing a nullable object via PATCH was impossible (`null` = "leave unchanged" in merge-patch), so a cleared salary never persisted; `[]` clears cleanly. Also enables multi-market seekers (NZD + AUD) and moves salary onto `useEntryList`/`EntryRow`. Distinct-currency enforced both sides. Migration `SalaryExpectationsArray` (object → `[object]`, null → `[]`).
- **Languages combined with fluency (07-18).** `Languages: List<string>` → `List<LanguageEntry>` (`{ Language, Fluency }`), mirroring `WorkingRightEntry`. New `LanguageEntry.cs` + `LanguageFluency.cs` (5 LinkedIn levels + `Unspecified` for migrated rows). EF `OwnsMany(...).ToJson()`. Frontend moved from `TagSection` to the entry-list family — `LanguagesSection.tsx` + `LanguageCombobox.tsx`. Migration `LanguagesFluencyEntry` needed rename/backfill/drop: Postgres rejects a correlated subquery in `ALTER COLUMN ... USING` for the `text[]`→`jsonb` type change (unlike the same-type `SalaryExpectationsArray` reshape).
- **Duplicate protection (07-18).** Server-side dedup in `ProfileDTO.Validate()` for every multi-value field with a single-value key: `TargetRoles`/`Skills`/`Certifications` (case-insensitive), `WorkModes`/`ContractTypes` (enum), `Languages` (by language), `WorkingRights`/`PreferredLocations` (by country); `WorkHistory`/`Education` excluded (no natural key). Frontend `profileValidation.ts` `hasDuplicate` wired into `languagesInvalid`/`workingRightsInvalid`/`preferredLocationsInvalid`.
- **Creatable language combobox (07-18).** Restored the free-text-language ability lost when Languages moved off `TagInput` onto `LanguageCombobox`. The cmdk `Command` now tracks the `CommandInput` value; when the trimmed query is non-empty and matches no suggestion or excluded value (case-insensitive, mirroring server dedup), it renders an `Add "<typed>"` item that commits the typed text. `CountryCombobox` stays closed-set (no such item). Frontend-only — backend already accepts any `[MaxLength(30)]` string.
- **`Unspecified` fluency = legacy-only (07-18).** Reversed the earlier "user-selectable" call. `LanguagesSection.tsx` filters `Unspecified` out of the fluency `Select`, keeping it only when the current entry already holds it — else editing a migrated row shows a blank dropdown (radix `Select` renders nothing for a value absent from its items). New entries default to `ProfessionalWorking`; the read view still shows `Unspecified` via `formatEnumLabel`.

## Manual browser verification (pre-merge checklist)

1. Per-section: pencil → edit → Save persists + returns to view; Cancel reverts + closes; empty sections show placeholder + a + header button.
1a. Add flows: + on an empty entry-based section opens edit with one blank entry; + next to a pencil on a filled multi-entry section appends and scrolls; Cancel reverts to the pre-add state.
2. Edit all → change 2–3 sections → Save all → one PATCH with only the dirty fields; all sections close.
3. Concurrent edit: open two sections, edit both, Save one — the other keeps its unsaved edits (data-sync effect merges, not overwrites).
4. First run (fresh/demo-reset): all sections open in edit; first Save issues PUT, later saves PATCH.
5. Invalid entries (work history without a company, a duplicate value) keep Save + Save all disabled.
6. Dark mode + narrow viewport: read-view chips/text, header buttons.

## Next session (in order)

Feature work first — the drafts refactor is deferred (see **Deferred** below).

1. **Scoring rules for the 5 newer fields.** `profileScore.ts` doesn't cover `workModes`, `contractTypes`, `salaryExpectations`, `preferredLocations`, `additionalConditions`. The exhaustive `satisfies Record<keyof UserProfile, SectionRule>` constraint is relaxed to `Partial` until these are designed.
2. **Language free-text validation** — gated on risk review; see the dedicated section below.
3. **Smaller:** `tagSuggestions.ts` (10.6k lines) is eagerly imported into the page bundle — consider a dynamic `import()`.

## Deferred

**Drafts state model — simplification, not a bug fix.** Originally slated as the top task on the belief that saving one section could clobber unsaved edits in another open section. Re-checked 2026-08-04: that case is already handled. The data-sync effect in `ProfilePage.tsx` rebuilds `form` from fresh server `data` but preserves every key still in `editingRef`, so the concurrent-save path does **not** lose edits. There is no currently-reproducible data-loss bug here.

The refactor's value is therefore *simplification*: collapse the full `form` mirror + the data-sync merge effect + `editingRef` + the `editingSections` set into one `drafts: Partial<UserProfile>` holding only sections being edited. View mode would read `data` directly; open copies `data[key]` into drafts; cancel deletes the key; `editing` = key in drafts; score = `computeProfileScore({ ...saved, ...drafts })`. Upside: fewer moving parts, and it removes the eager-`view`-prop hazard (see Known follow-ups) by construction. Touches save/cancel/first-run (PUT) flows — verify by hand. Deferred until the feature work above lands; still worth doing before Job Analysis if picked up.

## Known follow-ups

- **Eager `view` prop on `ProfileSectionCard`:** the `view={...}` JSX evaluates on every render even while editing, so view-mode markup runs against half-filled draft entries (this caused the `getCountryName("")` crash, since guarded in the helper). Fix by rendering `view` lazily (render function, or mount only when `!editing`).
- **Add-button dirty-lock inconsistency:** WorkHistory/Education disable their in-form add button while dirty; Locations/WorkRights never do. Pick one.
- **Add-entry not blocked at max count:** the footer `AddEntryButton` disables at the cap (salary: 3), but the header `+` (`handleAdd`) still appends past it (the extra entry just can't save). Prefer *hiding* add (header + footer) at max over disabling; likely affects all multi-entry sections.
- **Duplicate value has no feedback:** a repeated currency/value blocks Save correctly but shows no message — same silent-block as other save-blocking validation. Consider a hint.

## Language free-text validation (researched 2026-07-18 — not yet implemented)

**Why:** the creatable `LanguageCombobox` now lets users type any string. We want it to cover real languages the suggestion list misses, without letting users enter arbitrary/garbage text. The suggestion list is only ISO 639-1 (`ISO6391.getAllNames()`, 183 names, longest "Old Church Slavonic" at 19 chars); the comprehensive set is ISO 639-3 (~7,900 languages).

**Findings (ISO 639-3 reference-name rules):**
- Names are multi-word and run longer than the suggestions. Confirmed: "Saint Lucian Creole French" (26), "Algerian Saharan Arabic" (23); with ISO 639-3 parenthetical disambiguators (e.g. `Malay (individual language)`) they exceed 30. **The current 30-char cap (`MaxProfileLanguageItemLength`) is too tight for exactly the long regional/creole names free-text exists to cover.**
- ISO 639-3 restricts reference names to: the 26 basic-Latin letters + diacritics, and five punctuation marks — space, hyphen-minus `-`, apostrophe `'`, and parentheses `( )`; inside parens also `.` and digits. Real names use all of these: apostrophes/glottal stops (`K'iche'`, Hawaiian `ʻŌlelo Hawaiʻi` — the ʻokina is U+02BB or `’`, not just ASCII `'`), hyphens (`Luba-Katanga`), diacritics (`Bokmål`, `Volapük`, `Arbëreshë`).
- **Repeated letters cannot be blocked** — real names double letters constantly (`Kalaallisut`, `Wolaytta`). The only safe anti-garbage signal is a run of **3+ identical consecutive chars** (no natural name has `aaa`).

**Proposed change (deferred pending risk review):**
1. Raise `MaxProfileLanguageItemLength` 30 → ~55 (JSON column — **no migration**; update backend const + frontend const + any tests referencing 30).
2. Validation rule, **mirrored both sides**: allowed chars = `\p{L}\p{M}`, space, `-`, `'` `’` `ʻ`, `()`, `.`, digits; must contain ≥1 letter; no 3+ identical consecutive chars; ≤ cap.
3. **Extract as its own reusable util** (e.g. `isValidLanguageName`), consumed by both the combobox `canCreate` gate and `profileValidation.ts` — deserves standalone treatment, not an inline check.

**Risks to verify before implementing:**
- **Legacy/seed data:** a stored language that fails the new rule would block the *next save of the whole profile* (server `ProfileDTO.Validate()` runs on the full DTO even when another section is edited). Check demo-seed languages and any existing rows.
- **Suggestion-list conformance:** confirm all 183 `ISO6391.getAllNames()` values pass the rule — some name lists carry commas/semicolons (`"Chinese, Mandarin"`, `"Haitian; Haitian Creole"`) which the ISO 639-3 rule would reject; a failing suggestion would be unpickable. Widen the rule or accept it.
- **False positives from the 3+-repeat rule:** sanity-check against the suggestion list + known long ISO 639-3 names for any legitimate triple.
- **ʻokina/apostrophe variants:** allowing `'`/`’`/`ʻ` means `Hawaiʻi` and `Hawai'i` count as distinct languages — dedup won't merge them. Probably acceptable; note it.
- **Rule drift:** frontend (TS `\p{L}`, needs the `u` regex flag) and backend (.NET regex) are separate implementations — must be kept in sync; add tests on both sides.

Sources: [ISO 639-3 — Wikipedia](https://en.wikipedia.org/wiki/ISO_639-3), [ISO 639-3 code tables — SIL](https://iso639-3.sil.org/code_tables/download_tables), [ʻOkina — Wikipedia](https://en.wikipedia.org/wiki/%CA%BBOkina).
