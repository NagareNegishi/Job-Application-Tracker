// Additional conditions section — free-text catch-all (experience level, nuance not covered by structured fields).
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { MAX_ADDITIONAL_CONDITIONS_LENGTH } from "@/lib/validationConstants"

const HTML_PATTERN = /<[a-zA-Z/]/

type Props = {
  value: string
  onChange: (val: string) => void
  savedValue: string
  saving: boolean
  onSave: () => void
  error?: string
}

export default function AdditionalConditionsSection({
  value, onChange, savedValue, saving, onSave, error,
}: Props) {
  const dirty = value !== savedValue
  const htmlError = HTML_PATTERN.test(value) ? "Must not contain HTML." : null

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">Additional Conditions</h2>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Anything else that matters — experience level, unpaid-only-if-exceptional, region nuance…"
        rows={4}
        maxLength={MAX_ADDITIONAL_CONDITIONS_LENGTH}
      />
      {htmlError && <p className="text-xs text-destructive">{htmlError}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => onChange(savedValue)} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving || !dirty || !!htmlError}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
