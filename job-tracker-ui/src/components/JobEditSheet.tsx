import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/DatePicker"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { usePatchJob } from "@/hooks/jobQuery"
import {
  MAX_COMPANY_LENGTH,
  MAX_DESCRIPTION_LENGTH,
  MAX_JOB_URL_LENGTH,
  MAX_LOCATION_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_ROLE_LENGTH,
  MAX_SOURCE_LENGTH,
} from "@/lib/validationConstants"
import { JobStatus, Priority, WorkMode } from "@/types/enums"
import type { Job, JobPatchOperation } from "@/types/job"
import { useEffect, useState } from "react"

// FormState represents the internal state of the job edit form
interface FormState {
  company: string
  role: string
  status: JobStatus
  priority: Priority
  appliedAt: Date | undefined
  closedAt: Date | undefined
  description: string
  notes: string
  jobUrl: string
  source: string
  salaryMin: number | ""
  salaryMax: number | ""
  location: string
  workMode: WorkMode | ""
  interviewAt: Date | undefined
}

// Converts a Job object to the FormState shape
function toFormState(job: Job): FormState {
  return {
    company: job.company,
    role: job.role,
    status: job.status,
    priority: job.priority,
    appliedAt: job.appliedAt ? new Date(job.appliedAt) : undefined,
    closedAt: job.closedAt ? new Date(job.closedAt) : undefined,
    description: job.description ?? "",
    notes: job.notes ?? "",
    jobUrl: job.jobUrl ?? "",
    source: job.source ?? "",
    salaryMin: job.salaryMin ?? "",
    salaryMax: job.salaryMax ?? "",
    location: job.location ?? "",
    workMode: job.workMode ?? "",
    interviewAt: job.interviewAt ? new Date(job.interviewAt) : undefined,
  }
}


/**
 * Props for JobEditSheet component, which provides a form for editing job details.
 */
interface JobEditSheetProps {
  job: Job
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * JobEditSheet component provides a form for editing job details.
 * It uses a Sheet component for the UI and manages form state internally.
 */
export function JobEditSheet({ job, open, onOpenChange }: JobEditSheetProps) {

  const [form, setForm] = useState<FormState>(() => toFormState(job))
  const { mutate: patchJob, isPending } = usePatchJob()

  // Reset form when sheet opens with fresh job data
  useEffect(() => {
    if (open) setForm(toFormState(job))
  }, [job, open])


  // Helper function to update form state for a specific field
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }


  // Handles form submission by comparing current form state with original job data
  function handleSubmit() {
    const operations: JobPatchOperation[] = []
    // Required fields
    if (form.company !== (job.company))
      operations.push({ op: "replace", path: "/company", value: form.company })
    if (form.role !== (job.role))
      operations.push({ op: "replace", path: "/role", value: form.role })
    if (form.status !== job.status)
      operations.push({ op: "replace", path: "/status", value: form.status })
    if (form.priority !== (job.priority))
      operations.push({ op: "replace", path: "/priority", value: form.priority })

    // Optional fields, Date fields need to be compared as ISO strings to avoid timezone issues
    const appliedAtISO = form.appliedAt?.toISOString() ?? null
    const existingAppliedAt = job.appliedAt ? new Date(job.appliedAt).toISOString() : null
    if (appliedAtISO !== existingAppliedAt)
      operations.push({ op: "replace", path: "/appliedAt", value: appliedAtISO })

    const closedAtISO = form.closedAt?.toISOString() ?? null
    const existingClosedAt = job.closedAt ? new Date(job.closedAt).toISOString() : null
    if (closedAtISO !== existingClosedAt)
      operations.push({ op: "replace", path: "/closedAt", value: closedAtISO })

    if (form.description !== (job.description ?? ""))
      operations.push({ op: "replace", path: "/description", value: form.description })

    if (form.notes !== (job.notes ?? ""))
      operations.push({ op: "replace", path: "/notes", value: form.notes })

    // Nothing changed
    if (operations.length === 0) {
      onOpenChange(false)
      return
    }

    // Trigger the patch
    patchJob(
      { id: job.id, operations },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Job</SheetTitle>
        </SheetHeader>

        {/* form fields go here */}

        {/* Edit Company */}
        <div className="space-y-1.5">
          <Label htmlFor="company">Company</Label>
          <Input
            id="company"
            value={form.company}
            onChange={e => setField("company", e.target.value)}
            maxLength={MAX_COMPANY_LENGTH}
          />
        </div>

        {/* Edit Role */}
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Input
            id="role"
            value={form.role}
            onChange={e => setField("role", e.target.value)}
            maxLength={MAX_ROLE_LENGTH}
          />
        </div>

        {/* Edit Status */}
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            // Select component returns string -> need to cast back to JobStatus
            onValueChange={v => setField("status", v as JobStatus)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(JobStatus).map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Edit Priority */}
        <div className="space-y-1.5">
          <Label>Priority</Label>
          <Select
            value={form.priority}
            onValueChange={v => setField("priority", v as Priority)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.values(Priority).map(p => (
                <SelectItem key={p} value={p}>{p} </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Edit Applied At */}
        <div className="space-y-1.5">
          <Label>Applied At</Label>
          <DatePicker
            value={form.appliedAt}
            onChange={d => setField("appliedAt", d)}
            placeholder="Select date"
          />
        </div>

        {/* Edit Closed At */}
        <div className="space-y-1.5">
          <Label>Closed At</Label>
          <DatePicker
            value={form.closedAt}
            onChange={d => setField("closedAt", d)}
            placeholder="Select date"
          />
        </div>

        {/* Job URL */}
        <div className="space-y-1.5">
          <Label htmlFor="jobUrl">Job URL</Label>
          <Input
            id="jobUrl"
            type="url"
            value={form.jobUrl}
            onChange={e => setField("jobUrl", e.target.value)}
            maxLength={MAX_JOB_URL_LENGTH}
            placeholder="https://..."
          />
        </div>

        {/* Source */}
        <div className="space-y-1.5">
          <Label htmlFor="source">Source</Label>
          <Input
            id="source"
            value={form.source}
            onChange={e => setField("source", e.target.value)}
            maxLength={MAX_SOURCE_LENGTH}
            placeholder="LinkedIn, Indeed, referral..."
          />
        </div>

        {/* Location */}
        <div className="space-y-1.5">
          <Label htmlFor="location">Location</Label>
          <Input
            id="location"
            value={form.location}
            onChange={e => setField("location", e.target.value)}
            maxLength={MAX_LOCATION_LENGTH}
            placeholder="City, Country"
          />
        </div>

        {/* Work Mode */}
        <div className="space-y-1.5">
          <Label>Work Mode</Label>
          <Select
            value={form.workMode}
            onValueChange={v => setField("workMode", v as WorkMode)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select work mode" />
            </SelectTrigger>
            <SelectContent>
              {Object.values(WorkMode).map(m => (
                <SelectItem key={m} value={m}>{m === "OnSite" ? "On-site" : m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Salary */}
        <div className="space-y-1.5">
          <Label>Salary Range</Label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              value={form.salaryMin}
              onChange={e => setField("salaryMin", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              placeholder="Min"
            />
            <Input
              type="number"
              min={0}
              value={form.salaryMax}
              onChange={e => setField("salaryMax", e.target.value === "" ? "" : parseInt(e.target.value, 10))}
              placeholder="Max"
            />
          </div>
        </div>

        {/* Edit Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={e => setField("description", e.target.value)}
            // Initially set to 3 rows
            rows={3}
            maxLength={MAX_DESCRIPTION_LENGTH}
          />
          <p className="text-xs text-muted-foreground text-right">{form.description.length} / {MAX_DESCRIPTION_LENGTH}</p>
        </div>

        {/* Edit Notes */}
        <div className="space-y-1.5">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={e => setField("notes", e.target.value)}
            rows={3}
            maxLength={MAX_NOTES_LENGTH}
          />
          <p className="text-xs text-muted-foreground text-right">{form.notes.length} / {MAX_NOTES_LENGTH}</p>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-2">
          {/* Cancel just closes the sheet without saving */}
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          {/* Save triggers form submission */}
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
