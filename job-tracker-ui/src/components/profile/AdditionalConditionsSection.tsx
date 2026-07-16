// Additional conditions section — free-text catch-all (experience level, nuance not covered by structured fields).
// View/edit mode and card chrome come from ProfileSectionCard.
import { Textarea } from "@/components/ui/textarea"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import { additionalConditionsInvalid } from "@/utils/profileValidation"
import { MAX_ADDITIONAL_CONDITIONS_LENGTH } from "@/lib/validationConstants"

type Props = {
  value: string
  onChange: (val: string) => void
  savedValue: string
  saving: boolean
  onSave: () => void
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  error?: string
}

export default function AdditionalConditionsSection({
  value, onChange, savedValue, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  const dirty = value !== savedValue
  const htmlError = additionalConditionsInvalid(value) ? "Must not contain HTML." : null

  return (
    <ProfileSectionCard
      title="Additional Conditions"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={!!htmlError}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value === ""}
      emptyText="No additional conditions"
      view={<p className="text-sm whitespace-pre-wrap">{value}</p>}
    >
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Anything else that matters — experience level, unpaid-only-if-exceptional, region nuance…"
        rows={4}
        maxLength={MAX_ADDITIONAL_CONDITIONS_LENGTH}
      />
      {htmlError && <p className="text-xs text-destructive">{htmlError}</p>}
    </ProfileSectionCard>
  )
}
