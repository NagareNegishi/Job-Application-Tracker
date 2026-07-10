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
                {/* institution field */}
                {/* degree field */}
                {/* currently enrolled checkbox */}
                {/* start year */}
                {/* end year — hidden when isCurrent */}
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
