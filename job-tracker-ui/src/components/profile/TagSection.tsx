// One profile card: a tag list with per-section dirty detection.
// Controlled — value/onChange live in the page so first-save can PUT the whole form.
// View/edit mode and card chrome come from ProfileSectionCard.
import TagInput from "@/components/custom/TagInput"
import ProfileSectionCard, { ViewChips } from "@/components/profile/ProfileSectionCard"
import { type MatchStrategy } from "@/utils/matchSuggestion"
import type { SectionProps } from "@/components/profile/sectionProps"

type TagSectionProps = SectionProps<string[]> & {
  title: string
  emptyText: string
  savedValue: string[] // TagInput styles already-saved tags differently
  placeholder?: string
  maxItems?: number
  maxItemLength?: number
  layout?: "wrap" | "stack"
  suggestions?: string[]
  matchStrategy?: MatchStrategy
}

export default function TagSection({
  title,
  emptyText,
  value,
  onChange,
  savedValue,
  dirty,
  saving,
  onSave,
  editing,
  onEdit,
  onCancel,
  error,
  gateTooltip,
  placeholder,
  maxItems,
  maxItemLength,
  layout,
  suggestions,
  matchStrategy,
}: TagSectionProps) {
  return (
    <ProfileSectionCard
      title={title}
      editing={editing}
      dirty={dirty}
      saving={saving}
      error={error}
      gateTooltip={gateTooltip}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText={emptyText}
      view={<ViewChips items={value} />}
    >
      <TagInput
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        maxItems={maxItems}
        maxItemLength={maxItemLength}
        layout={layout}
        savedValue={savedValue}
        suggestions={suggestions}
        matchStrategy={matchStrategy}
      />
    </ProfileSectionCard>
  )
}
