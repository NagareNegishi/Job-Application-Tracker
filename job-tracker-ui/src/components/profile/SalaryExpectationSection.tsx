// Salary expectations — one (amount, currency, period) entry per market/currency.
// View/edit mode and card chrome come from ProfileSectionCard.
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import SuggestionInput from "@/components/custom/SuggestionInput"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import EntryRow, { AddEntryButton } from "@/components/profile/EntryRow"
import { useEntryList } from "@/components/profile/useEntryList"
import { SalaryPeriod, type SalaryExpectation } from "@/types/profile"
import { formatEnumLabel } from "@/types/enums"
import { salaryExpectationsInvalid } from "@/utils/profileValidation"
import type { SectionProps } from "@/components/profile/sectionProps"
import { CURRENCY_SUGGESTIONS } from "./tagSuggestions"
import { MAX_SALARY_AMOUNT, MAX_SALARY_EXPECTATIONS_COUNT } from "@/lib/validationConstants"

function emptyEntry(): SalaryExpectation {
  return { minAmount: 0, currency: "NZD", period: SalaryPeriod.Annual }
}

const PERIOD_SUFFIX: Record<SalaryPeriod, string> = {
  Annual: "per year",
  Monthly: "per month",
  Hourly: "per hour",
}

type Props = SectionProps<SalaryExpectation[]>

export default function SalaryExpectationSection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  const { lastEntryRef, addEntry, handleAdd, updateEntry, removeEntry } =
    useEntryList(value, onChange, emptyEntry, onEdit)

  return (
    <ProfileSectionCard
      title="Salary Expectation"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={salaryExpectationsInvalid(value)}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText="No salary expectation set"
      onAdd={handleAdd}
      view={
        <ul className="text-sm space-y-1">
          {value.map((entry, i) => (
            <li key={i}>
              From <span className="font-medium">{entry.currency} {entry.minAmount.toLocaleString()}</span>
              {" "}{PERIOD_SUFFIX[entry.period]}
            </li>
          ))}
        </ul>
      }
    >
      <div className="space-y-2">
        {value.map((entry, i) => (
          <EntryRow
            key={i}
            ref={i === value.length - 1 ? lastEntryRef : undefined}
            onRemove={() => removeEntry(i)}
          >
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Minimum amount</Label>
                <Input
                  type="number"
                  min={0}
                  max={MAX_SALARY_AMOUNT}
                  value={entry.minAmount || ""}
                  onChange={e => updateEntry(i, { minAmount: e.target.value === "" ? 0 : parseInt(e.target.value, 10) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Currency</Label>
                <SuggestionInput
                  value={entry.currency}
                  onChange={v => updateEntry(i, { currency: v.toUpperCase() })}
                  placeholder="e.g. NZD"
                  maxLength={3}
                  suggestions={CURRENCY_SUGGESTIONS}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Period</Label>
                <Select
                  value={entry.period}
                  onValueChange={period => updateEntry(i, { period: period as SalaryPeriod })}
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
          </EntryRow>
        ))}
        <AddEntryButton
          label="Add currency"
          onClick={addEntry}
          disabled={value.length >= MAX_SALARY_EXPECTATIONS_COUNT}
        />
      </div>
    </ProfileSectionCard>
  )
}
