// Work history section — per-entry form rows for structured work experience.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { WorkHistoryEntry } from "@/types/profile"
import {
  MAX_WORK_HISTORY_TITLE_LENGTH,
  MAX_WORK_HISTORY_COMPANY_LENGTH,
  MAX_WORK_HISTORY_DESCRIPTION_LENGTH,
} from "@/lib/validationConstants"

// Computed once at module load; the max attribute on month inputs prevents future dates.
const CURRENT_MONTH = (() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
})()

type Props = {
  value: WorkHistoryEntry[]
  onChange: (entries: WorkHistoryEntry[]) => void
  savedValue: WorkHistoryEntry[]
  saving: boolean
  onSave: () => void
  error?: string
}

function emptyEntry(): WorkHistoryEntry {
  return { title: "", company: "", from: "", to: null, description: "" }
}

export default function WorkHistorySection({ value, onChange, savedValue, saving, onSave, error }: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  // Block save when any entry is missing a start date, or checkbox unchecked with no end date entered.
  const hasIncompleteDate = value.some(e => !e.from || e.to === "")

  function addEntry() {
    onChange([...value, emptyEntry()])
  }

  function updateEntry(index: number, patch: Partial<WorkHistoryEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">Work History</h2>
      <div className="space-y-3">
        {value.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 bg-muted/50 border rounded-md p-3">
            <div className="flex-1 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Title</Label>
                  <Input
                    value={entry.title}
                    onChange={e => updateEntry(i, { title: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    maxLength={MAX_WORK_HISTORY_TITLE_LENGTH}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Company</Label>
                  <Input
                    value={entry.company}
                    onChange={e => updateEntry(i, { company: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    maxLength={MAX_WORK_HISTORY_COMPANY_LENGTH}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">From</Label>
                  <Input
                    type="month"
                    value={entry.from}
                    max={CURRENT_MONTH}
                    onChange={e => updateEntry(i, { from: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">To</Label>
                  <Input
                    type="month"
                    value={entry.to ?? ""}
                    max={CURRENT_MONTH}
                    disabled={entry.to === null}
                    onChange={e => updateEntry(i, { to: e.target.value })}
                  />
                  <div className="flex items-center gap-1.5 mt-1">
                    <Checkbox
                      id={`wh-current-${i}`}
                      checked={entry.to === null}
                      onCheckedChange={checked => updateEntry(i, { to: checked ? null : "" })}
                    />
                    <Label htmlFor={`wh-current-${i}`} className="text-xs font-normal cursor-pointer">
                      Currently working here
                    </Label>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <Textarea
                  value={entry.description}
                  onChange={e => updateEntry(i, { description: e.target.value })}
                  placeholder="Responsibilities, achievements…"
                  rows={3}
                  maxLength={MAX_WORK_HISTORY_DESCRIPTION_LENGTH}
                />
              </div>
            </div>
            <Button
              size="icon" variant="ghost"
              className="text-muted-foreground hover:text-destructive shrink-0"
              onClick={() => removeEntry(i)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>
      <Button size="sm" variant="outline" onClick={addEntry} className="gap-1">
        <Plus className="h-4 w-4" />
        Add role
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => onChange(savedValue)} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving || !dirty || hasIncompleteDate}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
