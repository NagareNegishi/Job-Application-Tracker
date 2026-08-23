import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/custom/DatePicker"
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
  SheetFooter,
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
import { JobStatus, Priority, WorkMode, formatEnumLabel } from "@/types/enums"
import type { Job, JobPatchOperation } from "@/types/job"
import { useState } from "react"
import { ConfirmDialog } from "@/components/custom/ConfirmDialog"

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
  const [errors, setErrors] = useState<{ jobUrl?: string; salary?: string }>({})
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingOps, setPendingOps] = useState<JobPatchOperation[]>([])


  // Helper function to update form state for a specific field
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }


  // Handles form submission by comparing current form state with original job data
  function handleSubmit() {
    // Validate before building patch operations
    const newErrors: { jobUrl?: string; salary?: string } = {}
    if (form.jobUrl && !/^https?:\/\//i.test(form.jobUrl))
      newErrors.jobUrl = "URL must start with http:// or https://"
    if (form.salaryMin !== "" && form.salaryMax !== "" && form.salaryMin > form.salaryMax)
      newErrors.salary = "Min salary must be less than or equal to max"
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }
    setErrors({})

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

    if (form.jobUrl !== (job.jobUrl ?? ""))
      operations.push({ op: "replace", path: "/jobUrl", value: form.jobUrl || null })

    if (form.source !== (job.source ?? ""))
      operations.push({ op: "replace", path: "/source", value: form.source || null })

    if (form.location !== (job.location ?? ""))
      operations.push({ op: "replace", path: "/location", value: form.location || null })

    if (form.workMode !== (job.workMode ?? ""))
      operations.push({ op: "replace", path: "/workMode", value: form.workMode || null })

    if (form.salaryMin !== (job.salaryMin ?? ""))
      operations.push({ op: "replace", path: "/salaryMin", value: form.salaryMin !== "" ? form.salaryMin : null })

    if (form.salaryMax !== (job.salaryMax ?? ""))
      operations.push({ op: "replace", path: "/salaryMax", value: form.salaryMax !== "" ? form.salaryMax : null })

    // Date fields need to be compared as ISO strings to avoid timezone issues
    const interviewAtISO = form.interviewAt?.toISOString() ?? null
    const existingInterviewAt = job.interviewAt ? new Date(job.interviewAt).toISOString() : null
    if (interviewAtISO !== existingInterviewAt)
      operations.push({ op: "replace", path: "/interviewAt", value: interviewAtISO })

    // Nothing changed
    if (operations.length === 0) {
      onOpenChange(false)
      return
    }

    // Ask before resetting appliedAt when status changes to Applied and date is already set
    const statusChangingToApplied = form.status === JobStatus.Applied && job.status !== JobStatus.Applied
    const appliedAtUnchanged = !operations.some(op => op.path === "/appliedAt")
    if (statusChangingToApplied && job.appliedAt != null && appliedAtUnchanged) {
      setPendingOps(operations)
      setConfirmOpen(true)
      return
    }

    // Trigger the patch
    patchJob(
      { id: job.id, operations },
      { onSuccess: () => onOpenChange(false) }
    )
  }

  function handleResetAppliedAt() {
    const ops: JobPatchOperation[] = [...pendingOps, { op: "replace" as const, path: "/appliedAt" as const, value: new Date().toISOString() }]
    patchJob({ id: job.id, operations: ops }, { onSuccess: () => onOpenChange(false) })
  }

  function handleKeepAppliedAt() {
    patchJob({ id: job.id, operations: pendingOps }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Edit Job</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 space-y-4">

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
                <SelectItem key={s} value={s}>{formatEnumLabel(s)}</SelectItem>
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
          {errors.jobUrl && <p className="text-sm text-destructive">{errors.jobUrl}</p>}
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
                <SelectItem key={m} value={m}>{formatEnumLabel(m)}</SelectItem>
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
          {errors.salary && <p className="text-sm text-destructive">{errors.salary}</p>}
        </div>

        {/* Interview Date */}
        <div className="space-y-1.5">
          <Label>Interview Date</Label>
          <DatePicker
            value={form.interviewAt}
            onChange={d => setField("interviewAt", d)}
            placeholder="Select date"
          />
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

        </div>

        {/* Action buttons */}
        <SheetFooter className="flex-row justify-between">
          {/* Cancel just closes the sheet without saving */}
          <Button
            variant="outline"
            className="hover:bg-gray-200 dark:hover:bg-gray-700"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          {/* Save triggers form submission */}
          <Button
            className="w-1/2 bg-blue-500 hover:bg-blue-600 text-white"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save"}
          </Button>
        </SheetFooter>
        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Update Applied Date?"
          description={<>{`You applied on ${new Date(job.appliedAt!).toLocaleDateString()}.`}<br />Reset to today?</>}
          confirmLabel="Reset to today"
          cancelLabel="No, keep it"
          onConfirm={handleResetAppliedAt}
          onCancel={handleKeepAppliedAt}
        />
      </SheetContent>
    </Sheet>
  )
}
