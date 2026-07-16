// Shared chrome for profile sections: title row, view↔edit mode switch, empty-state
// "+ Add" prompt, error line, and the Save/Cancel footer. Sections supply the read-only
// rendering via `view` and the edit form as children.
import type { ReactNode } from "react"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

type Props = {
  title: string
  editing: boolean
  dirty: boolean
  saving: boolean
  saveBlocked?: boolean // section-specific validation failure; disables Save on top of !dirty
  error?: string
  onEdit: () => void
  onSave: () => void
  onCancel: () => void // reverts the section's value and exits edit mode (page-owned)
  isEmpty: boolean     // no saved/typed content → show the "+ Add" prompt instead of `view`
  addLabel: string     // empty-state button label, e.g. "Add skills"
  view: ReactNode
  children: ReactNode
}

export default function ProfileSectionCard({
  title, editing, dirty, saving, saveBlocked, error,
  onEdit, onSave, onCancel, isEmpty, addLabel, view, children,
}: Props) {
  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      {/* min-h keeps the header height stable whether or not the pencil button renders */}
      <div className="flex items-center justify-between min-h-7">
        <h2 className="text-sm font-medium">{title}</h2>
        {!editing && !isEmpty && (
          <Button
            size="icon" variant="ghost"
            className="h-7 w-7 text-muted-foreground"
            aria-label={`Edit ${title}`}
            onClick={onEdit}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
      {editing ? (
        <>
          {children}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={onCancel} disabled={saving}>
              Cancel
            </Button>
            <Button size="sm" onClick={onSave} disabled={saving || !dirty || saveBlocked}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </>
      ) : isEmpty ? (
        <Button size="sm" variant="outline" onClick={onEdit} className="gap-1">
          <Plus className="h-4 w-4" />
          {addLabel}
        </Button>
      ) : (
        view
      )}
    </div>
  )
}

/** Read-only chip list shared by the tag and multi-select sections; mirrors TagInput's saved-tag style. */
export function ViewChips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map(item => (
        <span
          key={item}
          className="inline-flex items-center rounded-md bg-secondary text-secondary-foreground px-3 py-1.5 text-sm font-semibold"
        >
          {item}
        </span>
      ))}
    </div>
  )
}
