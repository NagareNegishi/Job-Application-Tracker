// Preferred locations section — per-entry country + free-text areas ("anywhere in country" if empty).
// View/edit mode and card chrome come from ProfileSectionCard.
import { useEffect, useRef } from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import TagInput from "@/components/ui/TagInput"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import type { PreferredLocationEntry } from "@/types/profile"
import { preferredLocationsInvalid } from "@/utils/profileValidation"
import CountryCombobox from "./CountryCombobox"
import { getCountryName } from "./countryCodes"
import { MAX_LOCATION_AREAS_COUNT, MAX_LOCATION_AREA_ITEM_LENGTH } from "@/lib/validationConstants"
import type { SectionProps } from "@/components/profile/sectionProps"

type Props = SectionProps<PreferredLocationEntry[]>

export default function PreferredLocationsSection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  // Scroll the entry appended by header-add into view once edit mode has rendered it
  const lastEntryRef = useRef<HTMLDivElement | null>(null)
  const scrollPending = useRef(false)

  useEffect(() => {
    if (scrollPending.current && lastEntryRef.current) {
      lastEntryRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      scrollPending.current = false
    }
  })

  function addEntry() {
    onChange([...value, { country: "", areas: [] }])
  }

  // Header + button: blank entry ready to fill, whether the section was empty or not
  function handleAdd() {
    addEntry()
    onEdit()
    scrollPending.current = true
  }

  function updateEntry(index: number, patch: Partial<PreferredLocationEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <ProfileSectionCard
      title="Preferred Locations"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={preferredLocationsInvalid(value)}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText="No preferred locations added yet"
      onAdd={handleAdd}
      view={
        <ul className="text-sm space-y-1">
          {value.map((entry, i) => (
            <li key={i}>
              <span className="font-medium">{getCountryName(entry.country)}</span>
              <span className="text-muted-foreground">
                {" — "}{entry.areas.length > 0 ? entry.areas.join(", ") : "anywhere"}
              </span>
            </li>
          ))}
        </ul>
      }
    >
      <div className="space-y-3">
        {value.map((entry, i) => (
          <div
            key={i}
            ref={i === value.length - 1 ? lastEntryRef : undefined}
            className="flex items-start gap-2 bg-muted/50 border rounded-md p-3"
          >
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
        <Button size="sm" variant="outline" onClick={addEntry} className="gap-1">
          <Plus className="h-4 w-4" />
          Add location
        </Button>
      </div>
    </ProfileSectionCard>
  )
}
