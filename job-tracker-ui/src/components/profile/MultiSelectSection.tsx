// Closed-set multi-select profile section (CheckboxGroup) — shared by WorkModes and ContractTypes.
// View/edit mode and card chrome come from ProfileSectionCard.
import CheckboxGroup from "@/components/custom/CheckboxGroup"
import ProfileSectionCard, { ViewChips } from "@/components/profile/ProfileSectionCard"
import { formatEnumLabel } from "@/types/enums"
import type { SectionProps } from "@/components/profile/sectionProps"

type Props<T extends string> = SectionProps<T[]> & {
  title: string
  emptyText: string
  options: readonly T[]
  showSelectAll?: boolean
}

export default function MultiSelectSection<T extends string>({
  title, emptyText, options, value, onChange, dirty, saving, onSave,
  editing, onEdit, onCancel, error, showSelectAll,
}: Props<T>) {
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
      emptyText={emptyText}
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
