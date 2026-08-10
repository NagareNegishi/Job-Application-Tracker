// Education section — per-entry form rows for structured education history.
// View/edit mode and card chrome come from ProfileSectionCard.
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import SuggestionInput from "@/components/ui/SuggestionInput"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import EntryRow, { AddEntryButton } from "@/components/profile/EntryRow"
import { useEntryList } from "@/components/profile/useEntryList"
import type { EducationEntry } from "@/types/profile"
import YearSelect from "./YearSelect"
import { INSTITUTION_SUGGESTIONS, DEGREE_SUGGESTIONS } from "@/components/profile/tagSuggestions"
import { checkDateOrder } from "@/utils/dateValidation"
import { educationInvalid } from "@/utils/profileValidation"
import type { SectionProps } from "@/components/profile/sectionProps"
import {
  MAX_EDUCATION_INSTITUTION_LENGTH,
  MAX_EDUCATION_DEGREE_LENGTH,
} from "@/lib/validationConstants"

type Props = SectionProps<EducationEntry[]>

function emptyEntry(): EducationEntry {
  return { institution: "", degree: "", from: 0, to: null }
}

export default function EducationSection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error, gateTooltip,
}: Props) {
  const errors = value.map(e => checkDateOrder(e.from, e.to))

  const { lastEntryRef, addEntry, handleAdd, updateEntry, removeEntry } =
    useEntryList(value, onChange, emptyEntry, onEdit)

  return (
    <ProfileSectionCard
      title="Education"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={educationInvalid(value)}
      error={error}
      gateTooltip={gateTooltip}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText="No education added"
      onAdd={handleAdd}
      view={
        <ul className="space-y-3">
          {value.map((entry, i) => (
            <li key={i}>
              <p className="text-sm font-medium">{entry.degree}</p>
              <p className="text-sm text-muted-foreground">
                {entry.institution} · {entry.from} – {entry.to ?? "Present"}
              </p>
            </li>
          ))}
        </ul>
      }
    >
      <div className="space-y-3">
        {value.map((entry, i) => {
          const isCurrent = entry.to === null

          return (
            <EntryRow
              key={i}
              ref={i === value.length - 1 ? lastEntryRef : undefined}
              onRemove={() => removeEntry(i)}
            >
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    School or institution <span className="text-destructive">*</span>
                  </Label>
                  <SuggestionInput
                    value={entry.institution}
                    onChange={v => updateEntry(i, { institution: v })}
                    placeholder="e.g. University of Auckland"
                    maxLength={MAX_EDUCATION_INSTITUTION_LENGTH}
                    suggestions={INSTITUTION_SUGGESTIONS}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Degree <span className="text-destructive">*</span>
                  </Label>
                  <SuggestionInput
                    value={entry.degree}
                    onChange={v => updateEntry(i, { degree: v })}
                    placeholder="e.g. BSc Computer Science"
                    maxLength={MAX_EDUCATION_DEGREE_LENGTH}
                    suggestions={DEGREE_SUGGESTIONS}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`edu-current-${i}`}
                    checked={isCurrent}
                    onCheckedChange={checked =>
                      updateEntry(i, { to: checked ? null : 0 })
                    }
                  />
                  <Label htmlFor={`edu-current-${i}`} className="text-xs font-normal cursor-pointer">
                    I am currently enrolled here
                  </Label>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Start year <span className="text-destructive">*</span>
                    </Label>
                    <YearSelect
                      value={entry.from}
                      onChange={v => updateEntry(i, { from: v })}
                    />
                  </div>
                  <div className="flex-1">
                    {!isCurrent && (
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">
                          End year <span className="text-destructive">*</span>
                        </Label>
                        <YearSelect
                          value={entry.to ?? 0}
                          onChange={v => updateEntry(i, { to: v })}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {errors[i] && (
                  <p className="text-xs text-destructive">{errors[i]}</p>
                )}
              </div>
            </EntryRow>
          )
        })}
        <AddEntryButton label="Add education" onClick={addEntry} disabled={dirty} />
      </div>
    </ProfileSectionCard>
  )
}
