// Work history section — per-entry form rows for structured work experience.
// View/edit mode and card chrome come from ProfileSectionCard.
import { useEffect, useRef } from "react"
import { Trash2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import SuggestionInput from "@/components/ui/SuggestionInput"
import ProfileSectionCard from "@/components/profile/ProfileSectionCard"
import type { WorkHistoryEntry } from "@/types/profile"
import MonthYearPicker from "./MonthYearPicker"
import { TARGET_ROLE_SUGGESTIONS } from "@/components/profile/tagSuggestions"
import { checkDateOrder, checkNotFuture } from "@/utils/dateValidation"
import { workHistoryInvalid } from "@/utils/profileValidation"
import { formatMonthYear } from "@/utils/dateFormat"
import type { SectionProps } from "@/components/profile/sectionProps"
import {
  MAX_WORK_HISTORY_TITLE_LENGTH,
  MAX_WORK_HISTORY_COMPANY_LENGTH,
  MAX_WORK_HISTORY_DESCRIPTION_LENGTH,
} from "@/lib/validationConstants"

type Props = SectionProps<WorkHistoryEntry[]>

function emptyEntry(): WorkHistoryEntry {
  return { title: "", company: "", fromYear: 0, fromMonth: null, toYear: null, toMonth: null, description: "" }
}

// "Mar 2021 – Present" / "Mar 2021 – Jun 2023" for the read view
function formatRange(e: WorkHistoryEntry): string {
  const from = formatMonthYear(e.fromYear, e.fromMonth)
  const to = e.toYear === null ? "Present" : formatMonthYear(e.toYear, e.toMonth)
  return `${from} – ${to}`
}

export default function WorkHistorySection({
  value, onChange, dirty, saving, onSave, editing, onEdit, onCancel, error,
}: Props) {
  // Future-date check (start, then end) precedes the ordering check; first failure wins per entry.
  const errors = value.map(e =>
    checkNotFuture(e.fromYear, e.fromMonth)
    ?? checkNotFuture(e.toYear, e.toMonth)
    ?? checkDateOrder(e.fromYear, e.toYear, e.fromMonth, e.toMonth)
  )

  // Scroll the entry appended by header-add into view once edit mode has rendered it
  const lastEntryRef = useRef<HTMLDivElement | null>(null)
  const scrollPending = useRef(false)

  useEffect(() => {
    if (scrollPending.current && lastEntryRef.current) {
      lastEntryRef.current.scrollIntoView({ behavior: "smooth", block: "center" })
      scrollPending.current = false
    }
  })

  function addEntry() {
    onChange([...value, emptyEntry()])
  }

  // Header + button: blank entry ready to fill, whether the section was empty or not
  function handleAdd() {
    addEntry()
    onEdit()
    scrollPending.current = true
  }

  function updateEntry(index: number, patch: Partial<WorkHistoryEntry>) {
    onChange(value.map((e, i) => i === index ? { ...e, ...patch } : e))
  }

  function removeEntry(index: number) {
    onChange(value.filter((_, i) => i !== index))
  }

  return (
    <ProfileSectionCard
      title="Work History"
      editing={editing}
      dirty={dirty}
      saving={saving}
      saveBlocked={workHistoryInvalid(value)}
      error={error}
      onEdit={onEdit}
      onSave={onSave}
      onCancel={onCancel}
      isEmpty={value.length === 0}
      emptyText="No work history added yet"
      onAdd={handleAdd}
      view={
        <ul className="space-y-3">
          {value.map((entry, i) => (
            <li key={i}>
              <p className="text-sm font-medium">{entry.title}</p>
              <p className="text-sm text-muted-foreground">{entry.company} · {formatRange(entry)}</p>
              {entry.description && (
                <p className="text-sm whitespace-pre-wrap mt-1">{entry.description}</p>
              )}
            </li>
          ))}
        </ul>
      }
    >
      <div className="space-y-3">
        {value.map((entry, i) => {
          const isCurrent = entry.toYear === null

          return (
            <div
              key={i}
              ref={i === value.length - 1 ? lastEntryRef : undefined}
              className="flex items-start gap-2 bg-muted/50 border rounded-md p-3"
            >
              <div className="flex-1 space-y-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Title <span className="text-destructive">*</span>
                  </Label>
                  <SuggestionInput
                    value={entry.title}
                    onChange={v => updateEntry(i, { title: v })}
                    placeholder="e.g. Software Engineer"
                    maxLength={MAX_WORK_HISTORY_TITLE_LENGTH}
                    suggestions={TARGET_ROLE_SUGGESTIONS}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Company or organization <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    value={entry.company}
                    onChange={e => updateEntry(i, { company: e.target.value })}
                    placeholder="e.g. Google"
                    maxLength={MAX_WORK_HISTORY_COMPANY_LENGTH}
                  />
                </div>
                <div className="flex items-center gap-1.5">
                  <Checkbox
                    id={`wh-current-${i}`}
                    checked={isCurrent}
                    onCheckedChange={checked =>
                      updateEntry(i, { toYear: checked ? null : 0, toMonth: null })
                    }
                  />
                  <Label htmlFor={`wh-current-${i}`} className="text-xs font-normal cursor-pointer">
                    I am currently working in this role
                  </Label>
                </div>
                <MonthYearPicker
                  label="Start date"
                  month={entry.fromMonth}
                  year={entry.fromYear}
                  onMonthChange={v => updateEntry(i, { fromMonth: v })}
                  onYearChange={v => updateEntry(i, { fromYear: v })}
                />
                {!isCurrent && (
                  <MonthYearPicker
                    label="End date"
                    month={entry.toMonth}
                    year={entry.toYear ?? 0}
                    onMonthChange={v => updateEntry(i, { toMonth: v })}
                    onYearChange={v => updateEntry(i, { toYear: v })}
                  />
                )}
                {errors[i] && (
                  <p className="text-xs text-destructive">{errors[i]}</p>
                )}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Description</Label>
                  <Textarea
                    value={entry.description}
                    onChange={e => updateEntry(i, { description: e.target.value })}
                    placeholder="Responsibilities, achievements…"
                    rows={3}
                    maxLength={MAX_WORK_HISTORY_DESCRIPTION_LENGTH}
                  />
                </div>
              </div>
              <Button
                size="icon" variant="ghost"
                className="text-muted-foreground hover:text-destructive shrink-0"
                onClick={() => removeEntry(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )
        })}
        <Button size="sm" variant="outline" onClick={addEntry} disabled={dirty} className="gap-1">
          <Plus className="h-4 w-4" />
          Add role
        </Button>
      </div>
    </ProfileSectionCard>
  )
}
