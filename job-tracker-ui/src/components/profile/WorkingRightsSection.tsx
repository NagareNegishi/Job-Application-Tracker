// Working rights section — per-entry (country, status) rows with add/remove.
// View/edit mode and card chrome come from ProfileSectionCard.
import { useEffect, useRef } from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
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

export default function WorkingRightsSection({
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
    onChange([...value, { country: "", status: WorkingRight.RequiresSponsorship }])
  }

  // Header + button: blank entry ready to fill, whether the section was empty or not
  function handleAdd() {
    addEntry()
    onEdit()
    scrollPending.current = true
  }

  function updateEntry(index: number, patch: Partial<WorkingRightEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

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
          <div
            key={i}
            ref={i === value.length - 1 ? lastEntryRef : undefined}
            className="flex items-center gap-2 bg-muted/50 border rounded-md p-2"
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
        <Button size="sm" variant="outline" onClick={addEntry} className="gap-1">
          <Plus className="h-4 w-4" />
          Add country
        </Button>
      </div>
    </ProfileSectionCard>
  )
}
