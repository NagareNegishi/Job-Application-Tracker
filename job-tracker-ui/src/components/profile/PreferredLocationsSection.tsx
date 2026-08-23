// Preferred locations section: per-entry country + free-text areas ("anywhere in country" if empty).
// View/edit mode and card chrome come from ProfileSectionCard.
import { Label } from "@/components/ui/label"
import TagInput from "@/components/custom/TagInput"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import EntryRow, { AddEntryButton } from "@/components/profile/EntryRow"
import { useEntryList } from "@/components/profile/useEntryList"
import type { PreferredLocationEntry } from "@/types/profile"
import { preferredLocationsInvalid } from "@/utils/profileValidation"
import CountryCombobox from "./CountryCombobox"
import CountryFlag from "./CountryFlag"
import { getCountryName } from "./countryCodes"
import { MAX_LOCATION_AREAS_COUNT, MAX_LOCATION_AREA_ITEM_LENGTH } from "@/lib/validationConstants"
import type { SectionProps } from "@/components/profile/sectionProps"

type Props = SectionProps<PreferredLocationEntry[]>

function emptyEntry(): PreferredLocationEntry {
  return { country: "", areas: [] }
}

export default function PreferredLocationsSection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  const { lastEntryRef, addEntry, handleAdd, updateEntry, removeEntry } =
    useEntryList(value, onChange, emptyEntry, onEdit)

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
      emptyText="No preferred locations added"
      onAdd={handleAdd}
      view={
        <ul className="text-sm space-y-1.5">
          {value.map((entry, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <CountryFlag code={entry.country} />
              <span className="font-medium">{getCountryName(entry.country)}</span>
              <span className="text-muted-foreground">
                {entry.areas.length > 0 ? entry.areas.join(", ") : "anywhere in country"}
              </span>
            </li>
          ))}
        </ul>
      }
    >
      <div className="space-y-3">
        {value.map((entry, i) => (
          <EntryRow
            key={i}
            ref={i === value.length - 1 ? lastEntryRef : undefined}
            onRemove={() => removeEntry(i)}
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
                  Areas <span className="font-normal">(optional: leave blank for anywhere in country)</span>
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
          </EntryRow>
        ))}
        <AddEntryButton label="Add location" onClick={addEntry} />
      </div>
    </ProfileSectionCard>
  )
}
