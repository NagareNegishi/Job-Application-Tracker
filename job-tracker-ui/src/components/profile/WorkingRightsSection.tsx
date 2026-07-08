// Working rights section — per-entry (country, status) rows with add/remove and per-section save.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { WorkingRight, type WorkingRightEntry } from "@/types/profile"
import CountryCombobox from "./CountryCombobox"

const STATUS_LABELS: Record<WorkingRight, string> = {
  Citizen: "Citizen",
  PermanentResident: "Permanent Resident",
  WorkVisa: "Work Visa",
  RequiresSponsorship: "Requires Sponsorship",
  Other: "Other",
}

type Props = {
  value: WorkingRightEntry[]
  onChange: (entries: WorkingRightEntry[]) => void
  savedValue: WorkingRightEntry[]
  saving: boolean
  onSave: () => void
  error?: string
}

export default function WorkingRightsSection({
  value, onChange, savedValue, saving, onSave, error,
}: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)

  function addEntry() {
    onChange([...value, { country: "", status: WorkingRight.RequiresSponsorship }])
  }

  function updateEntry(index: number, patch: Partial<WorkingRightEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">Working Rights</h2>
      <div className="space-y-2">
        {value.map((entry, i) => (
          <div key={i} className="flex items-center gap-2">
            <CountryCombobox
              value={entry.country}
              onChange={code => updateEntry(i, { country: code })}
            />
            <Select
              value={entry.status}
              onValueChange={status => updateEntry(i, { status: status as WorkingRight })}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(WorkingRight).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="icon"
              variant="ghost"
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
        Add entry
      </Button>
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
