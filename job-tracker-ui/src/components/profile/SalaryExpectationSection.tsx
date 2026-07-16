// Salary expectation — single amount + currency + period; a whole nullable owned object, not an array.
// View/edit mode and card chrome come from ProfileSectionCard.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import SuggestionInput from "@/components/ui/SuggestionInput"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import { SalaryPeriod, type SalaryExpectation } from "@/types/profile"
import { formatEnumLabel } from "@/types/enums"
import { salaryExpectationInvalid } from "@/utils/profileValidation"
import { CURRENCY_SUGGESTIONS } from "./tagSuggestions"
import { MAX_SALARY_AMOUNT } from "@/lib/validationConstants"

function emptySalaryExpectation(): SalaryExpectation {
  return { minAmount: 0, currency: "NZD", period: SalaryPeriod.Annual }
}

const PERIOD_SUFFIX: Record<SalaryPeriod, string> = {
  Annual: "per year",
  Monthly: "per month",
  Hourly: "per hour",
}

type Props = {
  value: SalaryExpectation | null
  onChange: (val: SalaryExpectation | null) => void
  savedValue: SalaryExpectation | null
  saving: boolean
  onSave: () => void
  editing: boolean
  onEdit: () => void
  onCancel: () => void
  error?: string
}

export default function SalaryExpectationSection({
  value, onChange, savedValue, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  const saveBlocked = salaryExpectationInvalid(value)

  return (
    <ProfileSectionCard
      title="Salary Expectation"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={saveBlocked}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value === null}
      emptyText="No salary expectation set"
      // Seed on add-from-empty so inputs appear in one click; no onAdd when filled (single object)
      onAdd={value === null ? () => { onChange(emptySalaryExpectation()); onEdit() } : undefined}
      view={value !== null && (
        <p className="text-sm">
          From <span className="font-medium">{value.currency} {value.minAmount.toLocaleString()}</span>
          {" "}{PERIOD_SUFFIX[value.period]}
        </p>
      )}
    >
      {value === null ? (
        <Button size="sm" variant="outline" onClick={() => onChange(emptySalaryExpectation())} className="gap-1">
          <Plus className="h-4 w-4" />
          Add salary expectation
        </Button>
      ) : (
        <div className="flex items-start gap-2 bg-muted/50 border rounded-md p-3">
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Minimum amount</Label>
              <Input
                type="number"
                min={0}
                max={MAX_SALARY_AMOUNT}
                value={value.minAmount || ""}
                onChange={e => onChange({ ...value, minAmount: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Currency</Label>
              <SuggestionInput
                value={value.currency}
                onChange={v => onChange({ ...value, currency: v.toUpperCase() })}
                placeholder="e.g. NZD"
                maxLength={3}
                suggestions={CURRENCY_SUGGESTIONS}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Period</Label>
              <Select
                value={value.period}
                onValueChange={period => onChange({ ...value, period: period as SalaryPeriod })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(SalaryPeriod).map(p => (
                    <SelectItem key={p} value={p}>{formatEnumLabel(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button
            size="icon" variant="ghost"
            className="text-muted-foreground hover:text-destructive shrink-0"
            onClick={() => onChange(null)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </ProfileSectionCard>
  )
}
