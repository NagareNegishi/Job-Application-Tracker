// Closed-set multi-select profile section (CheckboxGroup) — shared by WorkModes and ContractTypes.
// View/edit mode and card chrome come from ProfileSectionCard.
import CheckboxGroup from "@/components/ui/CheckboxGroup"
import ProfileSectionCard, { ViewChips } from "@/components/profile/ProfileSectionCard"
import { formatEnumLabel } from "@/types/enums"

type Props<T extends string> = {
  title: string
  options: readonly T[]
  value: T[]
  onChange: (values: T[]) => void
  savedValue: T[]
  saving: boolean
  onSave: () => void
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  error?: string
  showSelectAll?: boolean
}

export default function MultiSelectSection<T extends string>({
  title, options, value, onChange, savedValue, saving, onSave,
  editing, onEdit, onCancel, error, showSelectAll,
}: Props<T>) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  const idPrefix = title.replace(/\s+/g, "-").toLowerCase()

  return (
    <ProfileSectionCard
      title={title}
      editing={editing}
      dirty={dirty}
      saving={saving}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      addLabel={`Add ${title.toLowerCase()}`}
      view={<ViewChips items={value.map(formatEnumLabel)} />}
    >
      <CheckboxGroup
        options={options}
        value={value}
        onChange={onChange}
        getLabel={formatEnumLabel}
        idPrefix={idPrefix}
        showSelectAll={showSelectAll}
      />
    </ProfileSectionCard>
  )
}
