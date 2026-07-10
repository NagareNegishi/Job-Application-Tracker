// Education section — per-entry form rows for structured education history.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import SuggestionInput from "@/components/ui/SuggestionInput"
import type { EducationEntry } from "@/types/profile"
import YearSelect from "./YearSelect"
import { INSTITUTION_SUGGESTIONS, DEGREE_SUGGESTIONS } from "@/components/profile/tagSuggestions"
import {
  MAX_EDUCATION_INSTITUTION_LENGTH,
  MAX_EDUCATION_DEGREE_LENGTH,
} from "@/lib/validationConstants"

type Props = {
  value: EducationEntry[]
  onChange: (entries: EducationEntry[]) => void
  savedValue: EducationEntry[]
  saving: boolean
  onSave: () => void
  error?: string
}

function emptyEntry(): EducationEntry {
  return { institution: "", degree: "", from: 0, to: null }
}

export default function EducationSection({ value, onChange, savedValue, saving, onSave, error }: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  const saveBlocked = value.some(e =>
    !e.institution.trim() || !e.degree.trim() || e.from === 0 || e.to === 0
  )

  function addEntry() {
    onChange([...value, emptyEntry()])
  }

  function updateEntry(index: number, patch: Partial<EducationEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">Education</h2>
      <div className="space-y-3">
        {value.map((entry, i) => {
          const isCurrent = entry.to === null

          return (
            <div key={i} className="flex items-start gap-2 bg-muted/50 border rounded-md p-3">
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Institution <span className="text-destructive">*</span>
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
                    placeholder="e.g. Bachelor of Science in Computer Science"
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
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Start year <span className="text-destructive">*</span>
                  </Label>
                  <YearSelect
                    value={entry.from}
                    onChange={v => updateEntry(i, { from: v })}
                  />
                </div>
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
        Add education
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
