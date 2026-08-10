// Shared structure for profile sections: title row with edit/add buttons, view↔edit
// switch, empty-state placeholder, error line, and the Save/Cancel footer. Sections
// supply the read-only rendering via `view` and the edit form as children.
import type { ReactNode } from "react"
import { Pencil, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { GateIndicator } from "@/components/profile/GateIndicator"

type Props = {
  title: string
  editing: boolean
  dirty: boolean
  saving: boolean
  saveBlocked?: boolean // section-specific validation failure; disables Save on top of !dirty
  error?: string
  gateTooltip?: string // set while this field is required for AI analysis and still unmet
  onEdit: () => void
  onSave: () => void
  onCancel: () => void // reverts the section's value and exits edit mode (page-owned)
  isEmpty: boolean     // show `emptyText` instead of `view`; header icon becomes +
  emptyText: string    // placeholder when empty, e.g. "No skills added"
  onAdd?: () => void   // multi-entry sections: enter edit with a blank entry seeded
  view: ReactNode
  children: ReactNode
}

export default function ProfileSectionCard({
  title, editing, dirty, saving, saveBlocked, error, gateTooltip,
  onEdit, onSave, onCancel, isEmpty, emptyText, onAdd, view, children,
}: Props) {
  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      {/* min-h keeps the header height stable whether or not the pencil button renders */}
      <div className="flex items-center justify-between min-h-7">
        <div className="flex items-center gap-1.5">
          <h2 className="text-sm font-medium border-l-2 border-primary pl-2">{title}</h2>
          <GateIndicator tooltip={gateTooltip} />
        </div>
        {!editing && (
          <div className="flex items-center gap-1">
            {/* Multi-entry sections get a separate add-another button once entries exist */}
            {onAdd && !isEmpty && (
              <Button
                size="icon" variant="ghost"
                className="h-7 w-7 text-muted-foreground"
                aria-label={`Add ${title}`}
                onClick={onAdd}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button
              size="icon" variant="ghost"
              className="h-7 w-7 text-muted-foreground"
              aria-label={isEmpty ? `Add ${title}` : `Edit ${title}`}
              onClick={isEmpty && onAdd ? onAdd : onEdit} // empty multi-entry: seed a blank entry too
            >
              {isEmpty ? <Plus className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
            </Button>
          </div>
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
        <p className="text-sm text-muted-foreground italic">{emptyText}</p>
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
