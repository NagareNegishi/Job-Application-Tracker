// Working rights section — per-entry (country, status) rows with add/remove.
// View/edit mode and card chrome come from ProfileSectionCard.
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import EntryRow, { AddEntryButton } from "@/components/profile/EntryRow"
import { useEntryList } from "@/components/profile/useEntryList"
import { WorkingRight, type WorkingRightEntry } from "@/types/profile"
import { workingRightsInvalid } from "@/utils/profileValidation"
import type { SectionProps } from "@/components/profile/sectionProps"
import CountryCombobox from "./CountryCombobox"
import { getCountryName } from "./countryCodes"

const STATUS_LABELS: Record<WorkingRight, string> = {
  Citizen: "Citizen",
  PermanentResident: "Permanent Resident",
  WorkVisa: "Work Visa",
  RequiresSponsorship: "Requires Sponsorship",
  Other: "Other",
}

type Props = SectionProps<WorkingRightEntry[]>

function emptyEntry(): WorkingRightEntry {
  return { country: "", status: WorkingRight.RequiresSponsorship }
}

export default function WorkingRightsSection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  const { lastEntryRef, addEntry, handleAdd, updateEntry, removeEntry } =
    useEntryList(value, onChange, emptyEntry, onEdit)

  return (
    <ProfileSectionCard
      title="Work Rights"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={workingRightsInvalid(value)}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText="No work rights added yet"
      onAdd={handleAdd}
      view={
        <ul className="text-sm space-y-1">
          {value.map((entry, i) => (
            <li key={i}>
              <span className="font-medium">{getCountryName(entry.country)}</span>
              <span className="text-muted-foreground">{" — "}{STATUS_LABELS[entry.status]}</span>
            </li>
          ))}
        </ul>
      }
    >
      <div className="space-y-2">
        {value.map((entry, i) => (
          <EntryRow
            key={i}
            ref={i === value.length - 1 ? lastEntryRef : undefined}
            onRemove={() => removeEntry(i)}
            className="items-center p-2"
          >
            <div className="flex flex-col sm:flex-row flex-1 gap-2">
              <div className="flex-1 min-w-0">
                <CountryCombobox
                  value={entry.country}
                  onChange={code => updateEntry(i, { country: code })}
                  excludeCodes={value.filter((_, j) => j !== i).map(e => e.country).filter(Boolean)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <Select
                  value={entry.status}
                  onValueChange={status => updateEntry(i, { status: status as WorkingRight })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(WorkingRight).map(s => (
                      <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </EntryRow>
        ))}
        <AddEntryButton label="Add country" onClick={addEntry} />
      </div>
    </ProfileSectionCard>
  )
}
