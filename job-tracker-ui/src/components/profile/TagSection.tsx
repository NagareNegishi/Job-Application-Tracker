// One profile card: a tag list with per-section dirty detection.
// Controlled — value/onChange live in the page so first-save can PUT the whole form.
// View/edit mode and card chrome come from ProfileSectionCard.
import TagInput from "@/components/ui/TagInput"
import ProfileSectionCard, { ViewChips } from "@/components/profile/ProfileSectionCard"
import { type MatchStrategy } from "@/utils/matchSuggestion"

// Order-sensitive shallow compare — tags preserve insertion order, so position matters
function arraysEqual(a: string[], b: string[]) {
  return a.length === b.length && a.every((v, i) => v === b[i])
}

type TagSectionProps = {
  title: string
  emptyText: string
  value: string[]
  onChange: (tags: string[]) => void
  savedValue: string[]
  saving: boolean
  onSave: () => void
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  error?: string
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
  saving,
  onSave,
  editing,
  onEdit,
  onCancel,
  error,
  placeholder,
  maxItems,
  maxItemLength,
  layout,
  suggestions,
  matchStrategy,
}: TagSectionProps) {
  const dirty = !arraysEqual(value, savedValue)

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
