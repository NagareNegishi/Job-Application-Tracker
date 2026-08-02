// Languages section — per-entry (language, fluency) rows with add/remove.
// View/edit mode and card chrome come from ProfileSectionCard.
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import EntryRow, { AddEntryButton } from "@/components/profile/EntryRow"
import { useEntryList } from "@/components/profile/useEntryList"
import { LanguageFluency, type LanguageEntry } from "@/types/profile"
import { formatEnumLabel } from "@/types/enums"
import { languagesInvalid } from "@/utils/profileValidation"
import type { SectionProps } from "@/components/profile/sectionProps"
import LanguageCombobox from "./LanguageCombobox"
import { MAX_LANGUAGES_COUNT } from "@/lib/validationConstants"

type Props = SectionProps<LanguageEntry[]>

function emptyEntry(): LanguageEntry {
  return { language: "", fluency: LanguageFluency.ProfessionalWorking }
}

export default function LanguagesSection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  const { lastEntryRef, addEntry, handleAdd, updateEntry, removeEntry } =
    useEntryList(value, onChange, emptyEntry, onEdit)

  return (
    <ProfileSectionCard
      title="Languages"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={languagesInvalid(value)}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText="No languages added yet"
      onAdd={handleAdd}
      view={
        <ul className="text-sm space-y-1">
          {value.map((entry, i) => (
            <li key={i}>
              <span className="font-medium">{entry.language}</span>
              <span className="text-muted-foreground">{" — "}{formatEnumLabel(entry.fluency)}</span>
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
                <LanguageCombobox
                  value={entry.language}
                  onChange={language => updateEntry(i, { language })}
                  excludeValues={value.filter((_, j) => j !== i).map(e => e.language).filter(Boolean)}
                />
              </div>
              <div className="flex-1 min-w-0">
                <Select
                  value={entry.fluency}
                  onValueChange={fluency => updateEntry(i, { fluency: fluency as LanguageFluency })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.values(LanguageFluency)
                      // Unspecified is a legacy migration sentinel, not a user choice
                      // offer it only when a migrated row already carries it
                      .filter(f => f !== LanguageFluency.Unspecified || entry.fluency === LanguageFluency.Unspecified)
                      .map(f => (
                        <SelectItem key={f} value={f}>{formatEnumLabel(f)}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </EntryRow>
        ))}
        <AddEntryButton
          label="Add language"
          onClick={addEntry}
          disabled={value.length >= MAX_LANGUAGES_COUNT}
        />
      </div>
    </ProfileSectionCard>
  )
}
