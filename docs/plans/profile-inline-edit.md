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

## Previous pattern (recorded before the refactor)

Everything below describes the code as of commit `173a5fd`, before the refactor. The other seven section components follow the same shape as the example and can be recovered from git history at that commit.

### Contract

`ProfilePage` held one `form` object (`UserProfile`) plus the query result `data`. Every section was a controlled component receiving the same six props:

| Prop | Meaning |
|---|---|
| `value` | current form value for this section's field |
| `onChange` | writes back into the page's `form` state |
| `savedValue` | last saved value (`data?.[key]`), used for dirty detection and Cancel |
| `saving` | true while this section's save request is in flight |
| `onSave` | triggers `saveSection(key)` on the page |
| `error` | save-failure message for this section |

Behavior rules, identical in every section:

- `dirty = value !== savedValue` (JSON compare for arrays/objects), computed inside the section.
- Save button always visible, disabled when `!dirty`, when `saving`, or when the section's own `saveBlocked` validation failed.
- Cancel button only appeared while dirty and did `onChange(savedValue)` (revert in place, no mode to exit).
- Sections were always in edit mode. There was no read-only rendering.

### Save flow (from `ProfilePage.tsx` at `173a5fd`)

First save created the profile with a PUT of the whole form. Later saves PATCHed only the changed field:

```ts
async function saveSection(key: keyof UserProfile) {
  setSavingSection(key)
  setSectionErrors(prev => ({ ...prev, [key]: "" }))
  try {
    if (!profileExists.current) {
      // First save — PUT the full form so the row is created with all current values
      await createProfile(form)
      profileExists.current = true
    } else {
      await patchProfile({ [key]: form[key] } as ProfilePatch)
    }
  } catch {
    setSectionErrors(prev => ({ ...prev, [key]: "Failed to save. Please try again." }))
  } finally {
    setSavingSection(null)
  }
}
```

### Representative section: `TagSection.tsx` (full file at `173a5fd`)

```tsx
// One profile card: a tag list with per-section dirty detection and Save/Cancel.
// Controlled — value/onChange live in the page so first-save can PUT the whole form.
import TagInput from "@/components/ui/TagInput"
import { Button } from "@/components/ui/button"
import { type MatchStrategy } from "@/utils/matchSuggestion"

// Order-sensitive shallow compare — tags preserve insertion order, so position matters
function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

type TagSectionProps = {
  title: string
  value: string[]
  onChange: (tags: string[]) => void
  savedValue: string[]
  saving: boolean
  onSave: () => void
  error?: string
  placeholder?: string
  maxItems?: number
  maxItemLength?: number
  layout?: "wrap" | "stack"
  suggestions?: string[]
  matchStrategy?: MatchStrategy
}

export default function TagSection({
  title,
  value,
  onChange,
  savedValue,
  saving,
  onSave,
  error,
  placeholder,
  maxItems,
  maxItemLength,
  layout,
  suggestions,
  matchStrategy,
}: TagSectionProps) {
  const dirty = !arraysEqual(value, savedValue)

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <TagInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxItems={maxItems}
        maxItemLength={maxItemLength}
        layout={layout}
        savedValue={savedValue}
        suggestions={suggestions}
        matchStrategy={matchStrategy}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => onChange(savedValue)} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving || !dirty}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
```
