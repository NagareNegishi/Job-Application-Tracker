// Work history section — per-entry form rows for structured work experience.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import type { WorkHistoryEntry } from "@/types/profile"
import {
  MAX_WORK_HISTORY_TITLE_LENGTH,
  MAX_WORK_HISTORY_COMPANY_LENGTH,
  MAX_WORK_HISTORY_DESCRIPTION_LENGTH,
} from "@/lib/validationConstants"

const MONTHS = [
  { value: "1", label: "January" },  { value: "2", label: "February" },
  { value: "3", label: "March" },    { value: "4", label: "April" },
  { value: "5", label: "May" },      { value: "6", label: "June" },
  { value: "7", label: "July" },     { value: "8", label: "August" },
  { value: "9", label: "September" },{ value: "10", label: "October" },
  { value: "11", label: "November" },{ value: "12", label: "December" },
]

const CURRENT_YEAR = new Date().getFullYear()
// Descending so the most recent year appears first in the dropdown.
const YEARS = Array.from({ length: CURRENT_YEAR - 1899 }, (_, i) => CURRENT_YEAR - i)

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
                    Company <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={entry.company}
                    onChange={e => updateEntry(i, { company: e.target.value })}
                    placeholder="e.g. Acme Corp"
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
                    Currently working here
                  </Label>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Start date</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">Month</Label>
                      <Select
                        value={entry.fromMonth !== null ? String(entry.fromMonth) : ""}
                        onValueChange={v => updateEntry(i, { fromMonth: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Optional" />
                        </SelectTrigger>
                        <SelectContent>
                          {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs text-muted-foreground">
                        Year <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={entry.fromYear !== 0 ? String(entry.fromYear) : ""}
                        onValueChange={v => updateEntry(i, { fromYear: parseInt(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                {!isCurrent && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">End date</Label>
                    <div className="flex gap-2">
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">Month</Label>
                        <Select
                          value={entry.toMonth !== null ? String(entry.toMonth) : ""}
                          onValueChange={v => updateEntry(i, { toMonth: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Optional" />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          Year <span className="text-destructive">*</span>
                        </Label>
                        <Select
                          value={entry.toYear !== null && entry.toYear !== 0 ? String(entry.toYear) : ""}
                          onValueChange={v => updateEntry(i, { toYear: parseInt(v) })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Year" />
                          </SelectTrigger>
                          <SelectContent>
                            {YEARS.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
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
