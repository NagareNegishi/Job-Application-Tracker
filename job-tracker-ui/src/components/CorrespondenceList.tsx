import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePatchJob } from "@/hooks/jobQuery";
import type { Correspondence } from "@/types/contact";
import type { JobPatchOperation } from "@/types/job";
import { Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";


// Props for CorrespondenceDialog component
interface CorrespondenceEntryProps {
  entry: Correspondence
  onEdit: (entry: Correspondence) => void
  onDelete: (entry: Correspondence) => void
  isPending: boolean
}


// CorrespondenceEntry component represents a single correspondence entry with date and note.
export function CorrespondenceEntry({ entry, onEdit, onDelete, isPending }: CorrespondenceEntryProps) {
  return (
    <div className="border rounded-lg p-3 space-y-1 w-full">
      {/* Top row: name + actions */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground w-24 shrink-0">
          {new Date(entry.date).toLocaleDateString()}
        </span>
        <div className="flex gap-1">
          {/* Edit action */ }
          <Button variant="ghost" size="icon"
            onClick={() => onEdit(entry)}
            disabled={isPending}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          {/* Delete action */}
          <Button variant="ghost" size="icon"
            onClick={() => onDelete(entry)}
            disabled={isPending}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {/* Optional fields */}
      {entry.note && <p className="text-sm">{entry.note}</p>}
    </div>
  )
}


// Props for CorrespondenceList component
interface CorrespondenceListProps {
  entries: Correspondence[]
  jobId: number
}


// CorrespondenceList component renders a list of correspondence entries for a job.
export function CorrespondenceList({ entries, jobId }: CorrespondenceListProps) {

  const [open, setOpen] = useState(false)
  const [selectedCorrespondence, setSelectedCorrespondence] = useState<Correspondence | undefined>(undefined)
  const { mutate: patchJob, isPending } = usePatchJob()

  // Handlers for add, open dialog with empty form
  function handleAdd() {
    setSelectedCorrespondence(undefined)
    setOpen(true)
  }

  // Handlers for edit, open dialog with selected contact data
  function handleEdit(entry: Correspondence) {
    setSelectedCorrespondence(entry)
    setOpen(true)
  }

  // Called by dialog on save
  function handleEditSubmit(updated: Correspondence) {
    const index = entries.indexOf(selectedCorrespondence!)
    const operations: JobPatchOperation[] = [
      { op: "replace", path: `/correspondences/${index}`, value: updated }
    ]

    patchJob(
      { id: jobId, operations },
      { onSuccess: () => setOpen(false) }
    )
  }

  // Called by dialog on save
  function handleAddSubmit(entry: Correspondence) {
    const operations: JobPatchOperation[] = [
      { op: "add", path: "/correspondences/-", value: entry }
    ]

    patchJob(
      { id: jobId, operations },
      { onSuccess: () => setOpen(false) }
    )
  }

  // Handlers for delete
  function handleDelete(entry: Correspondence) {
    const index = entries.indexOf(entry)
    const operations: JobPatchOperation[] = [
      { op: "remove", path: `/correspondences/${index}` }
    ]

    patchJob(
      { id: jobId, operations },
    )
  }

  return (
    <div className="space-y-3">

      {/* Dialog for adding/editing correspondences */ }
      <CorrespondenceDialog
        open={open}
        onOpenChange={setOpen}
        entry={selectedCorrespondence}
        onSubmit={selectedCorrespondence ? handleEditSubmit : handleAddSubmit}
        isPending={isPending}
      />

      {/* Header with Add button */ }
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Correspondence</span>
        <Button size="sm" onClick={handleAdd}>Add Correspondence</Button>
      </div>

      { entries.length === 0
        ? <p className="text-sm text-muted-foreground">No correspondence.</p>
        // TODO: flex-col? or grid-cols-2
        : <div className="grid grid-cols-4 gap-3">
          {/* List of correspondences */}
          {entries.map((c, i) =>
            <CorrespondenceEntry
              key={i}
              entry={c}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isPending={isPending}
            />
          )}
        </div>
      }
    </div>
  )
}


// FormState represents the internal state of the correspondence editing form.
interface CorrespondenceFormState {
  date: string
  note: string
}

// Converts a Correspondence object to the CorrespondenceFormState shape
function toCorrespondenceFormState(entry: Correspondence): CorrespondenceFormState {
  return {
    date: entry.date,
    note: entry.note ?? ""
  }
}

// CorrespondenceFormErrors represents validation errors for the correspondence form fields.
interface CorrespondenceFormErrors {
  date?: string
}

// CorrespondenceDialogProps defines the props for the CorrespondenceDialog component
interface CorrespondenceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entry?: Correspondence  // undefined = add mode, defined = edit mode
  onSubmit: (entry: Correspondence) => void
  isPending: boolean
}


/**
 * CorrespondenceDialog component provides a form for adding/editing a correspondence.
 */
export function CorrespondenceDialog({
  open,
  onOpenChange,
  entry,
  onSubmit,
  isPending
}: CorrespondenceDialogProps) {
  
  const emptyCorrespondence: CorrespondenceFormState = { date: "", note: "" }
  const [form, setForm] = useState<CorrespondenceFormState>(emptyCorrespondence)
  const [errors, setErrors] = useState<CorrespondenceFormErrors>({})

  // Reset form when dialog opens with fresh correspondence data
  useEffect(() => {
    if (open) {
      setForm(entry ? toCorrespondenceFormState(entry) : emptyCorrespondence)
      setErrors({})
    }
  }, [entry, open])

  // Helper function to update form state for a specific field
  function setField<K extends keyof CorrespondenceFormState>(key: K, value: CorrespondenceFormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // Handle form submission for both add and edit
  function handleSubmit() {
    if (!validate()) return
    onSubmit({
      date: form.date,
      note: form.note
    })
    onOpenChange(false)
  }

  // Simple validation logic for required fields and basic formats
  function validate(): boolean {
    const newErrors: CorrespondenceFormErrors = {}
    // String must match ISO date string
    if (!form.date.trim()) {
      newErrors.date = "Date is required"
    } else if (isNaN(Date.parse(form.date))) {
      newErrors.date = "Invalid date format"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }


  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >

      <DialogContent className="sm:max-w-sm">
        {/* Header for add vs edit mode */}
        <DialogHeader>
          <DialogTitle>{entry ? "Edit Correspondence" : "Add Correspondence"}</DialogTitle>
          <DialogDescription>
            {entry ? "Update correspondence details." : "Add a new correspondence to this job."}
          </DialogDescription>
        </DialogHeader>

          <Label htmlFor="name">Date</Label>
          <Input
            id="date"
            name="date"
            // type="date"
            value={form.date}
            onChange={e => setField("date", e.target.value)}
          />
          {errors.date && <p className="text-sm text-destructive">{errors.date}</p>}

          <Label htmlFor="role">Note</Label>
          <Input
            id="note"
            name="note"
            value={form.note}
            onChange={e => setField("note", e.target.value)}
          />

        <DialogFooter>
          {/* Cancel just closes the dialog without saving */ }
          <DialogClose asChild>
            <Button
              variant="outline"
            >
              Cancel
            </Button>
          </DialogClose>
          {/* Save triggers form submission */ }
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending ? "Saving..." : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}