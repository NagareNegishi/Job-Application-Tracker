// Salary expectation — single amount + currency + period; a whole nullable owned object, not an array.
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import SuggestionInput from "@/components/ui/SuggestionInput"
import { SalaryPeriod, type SalaryExpectation } from "@/types/profile"
import { formatEnumLabel } from "@/types/enums"
import { CURRENCY_SUGGESTIONS } from "./tagSuggestions"
import { MAX_SALARY_AMOUNT } from "@/lib/validationConstants"

function emptySalaryExpectation(): SalaryExpectation {
  return { minAmount: 0, currency: "NZD", period: SalaryPeriod.Annual }
}

type Props = {
  value: SalaryExpectation | null
  onChange: (val: SalaryExpectation | null) => void
  savedValue: SalaryExpectation | null
  saving: boolean
  onSave: () => void
  error?: string
}

export default function SalaryExpectationSection({
  value, onChange, savedValue, saving, onSave, error,
}: Props) {
  const dirty = JSON.stringify(value) !== JSON.stringify(savedValue)
  const saveBlocked = value !== null && (value.minAmount <= 0 || !/^[A-Z]{3}$/.test(value.currency))

  return (
    <div className="bg-card rounded-lg border p-5 space-y-3">
      <h2 className="text-sm font-medium">Salary Expectation</h2>
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
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {dirty && (
          <Button size="sm" variant="ghost" onClick={() => onChange(savedValue)} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button size="sm" onClick={onSave} disabled={saving || !dirty || saveBlocked}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  )
}
