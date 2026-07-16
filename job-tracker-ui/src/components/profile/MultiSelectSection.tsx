// Section chrome (title, save/cancel/error) around a closed-set CheckboxGroup — shared by WorkModes and ContractTypes.
import { Button } from "@/components/ui/button"
import CheckboxGroup from "@/components/ui/CheckboxGroup"
import { formatEnumLabel } from "@/types/enums"

type Props<T extends string> = {
  title: string
  options: readonly T[]
  value: T[]
  onChange: (values: T[]) => void
  savedValue: T[]
  saving: boolean
  onSave: () => void
  error?: string
  showSelectAll?: boolean
}

export default function MultiSelectSection<T extends string>({
  title, options, value, onChange, savedValue, saving, onSave, error, showSelectAll,
}: Props<T>) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  const idPrefix = title.replace(/\s+/g, "-").toLowerCase()

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">{title}</h2>
      <CheckboxGroup
        options={options}
        value={value}
        onChange={onChange}
        getLabel={formatEnumLabel}
        idPrefix={idPrefix}
        showSelectAll={showSelectAll}
      />
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
