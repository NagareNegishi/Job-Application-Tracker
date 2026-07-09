// Work history section — per-entry form rows for structured work experience.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import type { WorkHistoryEntry } from "@/types/profile"
import MonthYearPicker from "./MonthYearPicker"
import {
  MAX_WORK_HISTORY_TITLE_LENGTH,
  MAX_WORK_HISTORY_COMPANY_LENGTH,
  MAX_WORK_HISTORY_DESCRIPTION_LENGTH,
} from "@/lib/validationConstants"

type Props = {
  value: WorkHistoryEntry[]
  onChange: (entries: WorkHistoryEntry[]) => void
  savedValue: WorkHistoryEntry[]
  saving: boolean
  onSave: () => void
  error?: string
}

function emptyEntry(): WorkHistoryEntry {
  return { title: "", company: "", fromYear: 0, fromMonth: null, toYear: null, toMonth: null, description: "" }
}

export default function WorkHistorySection({ value, onChange, savedValue, saving, onSave, error }: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  // fromYear === 0: no start year chosen. toYear === 0: unchecked but no end year chosen.
  const saveBlocked = value.some(e =>
    !e.title.trim() || !e.company.trim() || e.fromYear === 0 || e.toYear === 0
  )

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
        {value.map((entry, i) => {
          const isCurrent = entry.toYear === null

          return (
            <div key={i} className="flex items-start gap-2 bg-muted/50 border rounded-md p-3">
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={entry.title}
                    onChange={e => updateEntry(i, { title: e.target.value })}
                    placeholder="e.g. Software Engineer"
                    maxLength={MAX_WORK_HISTORY_TITLE_LENGTH}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Company or organization <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={entry.company}
                    onChange={e => updateEntry(i, { company: e.target.value })}
                    placeholder="e.g. Google"
                    maxLength={MAX_WORK_HISTORY_COMPANY_LENGTH}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`wh-current-${i}`}
                    checked={isCurrent}
                    onCheckedChange={checked =>
                      updateEntry(i, { toYear: checked ? null : 0, toMonth: null })
                    }
                  />
                  <Label htmlFor={`wh-current-${i}`} className="text-xs font-normal cursor-pointer">
                    I am currently working in this role
                  </Label>
                </div>
                <MonthYearPicker
                  label="Start date"
                  month={entry.fromMonth}
                  year={entry.fromYear}
                  onMonthChange={v => updateEntry(i, { fromMonth: v })}
                  onYearChange={v => updateEntry(i, { fromYear: v })}
                />
                {!isCurrent && (
                  <MonthYearPicker
                    label="End date"
                    month={entry.toMonth}
                    year={entry.toYear ?? 0}
                    onMonthChange={v => updateEntry(i, { toMonth: v })}
                    onYearChange={v => updateEntry(i, { toYear: v })}
                  />
                )}
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
          )
        })}
      </div>
      <Button size="sm" variant="outline" onClick={addEntry} disabled={dirty} className="gap-1">
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
        <Button size="sm" onClick={onSave} disabled={saving || !dirty || saveBlocked}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
