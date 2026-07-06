// One profile card: a tag list with per-section dirty detection and Save/Cancel.
// Controlled — value/onChange live in the page so first-save can PUT the whole form.
import TagInput from "@/components/ui/TagInput"
import { Button } from "@/components/ui/button"

// Order-sensitive shallow compare — tags preserve insertion order, so position matters
function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

type TagSectionProps = {
  title: string
  value: string[]
  onChange: (tags: string[]) => void
  savedValue: string[]
  saving: boolean
  onSave: () => void
  error?: string
  placeholder?: string
  maxItems?: number
  layout?: "wrap" | "stack"
  suggestions?: string[]
}

export default function TagSection({
  title, value, onChange, savedValue, saving, onSave, error, placeholder, maxItems, layout, suggestions,
}: TagSectionProps) {
  const dirty = !arraysEqual(value, savedValue)

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <TagInput value={value} onChange={onChange} placeholder={placeholder} maxItems={maxItems} layout={layout} savedValue={savedValue} suggestions={suggestions} />
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
