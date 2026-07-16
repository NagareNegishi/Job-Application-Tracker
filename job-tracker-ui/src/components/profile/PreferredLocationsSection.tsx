// Preferred locations section — per-entry country + free-text areas ("anywhere in country" if empty).
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import TagInput from "@/components/ui/TagInput"
import type { PreferredLocationEntry } from "@/types/profile"
import CountryCombobox from "./CountryCombobox"
import { MAX_LOCATION_AREAS_COUNT, MAX_LOCATION_AREA_ITEM_LENGTH } from "@/lib/validationConstants"

type Props = {
  value: PreferredLocationEntry[]
  onChange: (entries: PreferredLocationEntry[]) => void
  savedValue: PreferredLocationEntry[]
  saving: boolean
  onSave: () => void
  error?: string
}

export default function PreferredLocationsSection({
  value, onChange, savedValue, saving, onSave, error,
}: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)

  function addEntry() {
    onChange([...value, { country: "", areas: [] }])
  }

  function updateEntry(index: number, patch: Partial<PreferredLocationEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">Preferred Locations</h2>
      <div className="space-y-3">
        {value.map((entry, i) => (
          <div key={i} className="flex items-start gap-2 bg-muted/50 border rounded-md p-3">
            <div className="flex-1 space-y-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Country <span className="text-destructive">*</span>
                </Label>
                <CountryCombobox
                  value={entry.country}
                  onChange={code => updateEntry(i, { country: code })}
                  excludeCodes={value.filter((_, j) => j !== i).map(e => e.country).filter(Boolean)}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  Areas <span className="font-normal">(optional — leave blank for anywhere in country)</span>
                </Label>
                <TagInput
                  value={entry.areas}
                  onChange={areas => updateEntry(i, { areas })}
                  placeholder="Type a city or region and press Enter"
                  maxItems={MAX_LOCATION_AREAS_COUNT}
                  maxItemLength={MAX_LOCATION_AREA_ITEM_LENGTH}
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
        Add location
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => onChange(savedValue)} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving || !dirty || value.some(e => !e.country)}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
