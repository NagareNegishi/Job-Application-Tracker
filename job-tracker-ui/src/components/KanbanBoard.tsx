// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable

import { useState } from 'react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, Modifier } from '@dnd-kit/core'
import { useNavigate } from 'react-router'
import { useJobs, usePatchJob } from '@/hooks/jobQuery'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/job'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { StaleIndicator } from '@/components/ui/StaleIndicator'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from "@/lib/utils"

const COLUMNS: JobStatus[] = [
  JobStatus.Wishlist,
  JobStatus.Applied,
  JobStatus.Screening,
  JobStatus.Assessment,
  JobStatus.Interview,
  JobStatus.Offered,
  JobStatus.Rejected,
  JobStatus.Withdrawn,
  JobStatus.NoResponse,
]

const COLUMN_BG: Record<JobStatus, string> = {
  Wishlist:   ["bg-slate-50/70",  "dark:bg-slate-800/40"].join(" "),
  Applied:    ["bg-blue-50/70",   "dark:bg-blue-900/20"].join(" "),
  Screening:  ["bg-yellow-50/70", "dark:bg-yellow-900/20"].join(" "),
  Assessment: ["bg-indigo-50/70", "dark:bg-indigo-900/20"].join(" "),
  Interview:  ["bg-purple-50/70", "dark:bg-purple-900/20"].join(" "),
  Offered:    ["bg-green-50/70",  "dark:bg-green-900/20"].join(" "),
  Rejected:   ["bg-red-50/70",    "dark:bg-red-900/20"].join(" "),
  NoResponse: ["bg-orange-50/70", "dark:bg-orange-900/20"].join(" "),
  Withdrawn:  ["bg-gray-50/70",   "dark:bg-gray-800/40"].join(" "),
}

// Mirrors @dnd-kit/modifiers restrictToWindowEdges, inlined to avoid adding the package.
// DragOverlay portal is unconstrained; this clamps x/y so the overlay stays within the viewport.
// Source: https://github.com/clauderic/dnd-kit/blob/master/packages/modifiers/src/restrictToWindowEdges.ts
const restrictToWindowEdges: Modifier = ({ draggingNodeRect, transform, windowRect }) => {
  if (!draggingNodeRect || !windowRect) return transform

  const value = { ...transform }

  if (draggingNodeRect.top + transform.y <= windowRect.top)
    value.y = windowRect.top - draggingNodeRect.top
  else if (draggingNodeRect.bottom + transform.y >= windowRect.top + windowRect.height)
    value.y = windowRect.top + windowRect.height - draggingNodeRect.bottom

  if (draggingNodeRect.left + transform.x <= windowRect.left)
    value.x = windowRect.left - draggingNodeRect.left
  else if (draggingNodeRect.right + transform.x >= windowRect.left + windowRect.width)
    value.x = windowRect.left + windowRect.width - draggingNodeRect.right

  return value
}

// Renders card visuals only, used by DragOverlay as the dragging clone.
function KanbanCardPreview({ job }: { job: Job }) {
  return (
    <>
      <p className="font-medium text-sm truncate">{job.company}</p>
      <p className="text-xs text-muted-foreground truncate">{job.role}</p>
      <div className="mt-2 flex items-center gap-2">
        <PriorityDot priority={job.priority} dotSize="w-2 h-2" />
        <StaleIndicator job={job} />
      </div>
    </>
  )
}

function KanbanCard({ job, isBeingDragged, isPendingConfirm }: { job: Job; isBeingDragged: boolean; isPendingConfirm: boolean }) {
  const navigate = useNavigate()
  const { setNodeRef, listeners, attributes, isDragging } = useDraggable({
    id: job.id,
    data: { status: job.status },
  })

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/jobs/${job.id}`)}
      className={cn(
        "bg-card border border-border rounded-md p-3 cursor-grab",
        "hover:shadow-sm dark:hover:border-white/20",
        "transition-shadow transition-colors",
        isDragging && "opacity-50",
        !isDragging && isBeingDragged && "opacity-0",
        (isDragging || isPendingConfirm) && "ring-2 ring-primary/60 bg-primary/5",
      )}
    >
      <KanbanCardPreview job={job} />
    </div>
  )
}

function KanbanColumn({ status, jobs, draggingId, confirmJobId }: { status: JobStatus; jobs: Job[]; draggingId: number | null; confirmJobId: number | null }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col gap-2 w-40">
      <div className="flex justify-center px-1">
        <StatusBadge status={status} className="text-sm px-6 py-1" />
      </div>
      <div
        ref={setNodeRef}
        className={`${COLUMN_BG[status]} rounded-md p-2 flex flex-col gap-2 min-h-[120px] flex-1 ${isOver ? 'ring-2 ring-inset ring-primary/40' : ''}`}
      >
        {jobs.map((job) => (
          <KanbanCard key={job.id} job={job} isBeingDragged={job.id === draggingId} isPendingConfirm={job.id === confirmJobId} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { data: jobs, isPending, isError } = useJobs()
  const { mutate: patchJob } = usePatchJob()
  const sensors = useSensors(useSensor(PointerSensor))
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const [confirmJob, setConfirmJob] = useState<Job | null>(null)

  function handleDragStart(event: DragStartEvent) {
    // DragOverlay renders a full card clone, so we need the Job object.
    const job = jobs?.find((j) => j.id === Number(event.active.id))
    if (job) setActiveJob(job)
    setDraggingId(Number(event.active.id))
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveJob(null)
    const { active, over } = event
    // Skip if dropped outside a column or back onto its own column.
    if (!over || active.data.current?.status === over.id) {
      setDraggingId(null)
      return
    }
    const draggedJob = jobs?.find(j => j.id === Number(active.id))
    // Ask before resetting appliedAt when dragged to Applied and date is already set
    if (over.id === JobStatus.Applied && draggedJob?.appliedAt != null) {
      setDraggingId(null)
      setConfirmJob(draggedJob)
      return
    }
    patchJob(
      { id: Number(active.id), operations: [{ op: 'replace', path: '/status', value: over.id as JobStatus }] },
      { onSettled: () => setDraggingId(null) }
    )
  }

  function handleDragResetAppliedAt() {
    if (!confirmJob) return
    patchJob({ id: confirmJob.id, operations: [
      { op: 'replace', path: '/status', value: JobStatus.Applied },
      { op: 'replace', path: '/appliedAt', value: new Date().toISOString() },
    ]})
    setConfirmJob(null)
  }

  function handleDragKeepAppliedAt() {
    if (!confirmJob) return
    patchJob({ id: confirmJob.id, operations: [
      { op: 'replace', path: '/status', value: JobStatus.Applied },
    ]})
    setConfirmJob(null)
  }

  if (isPending) return <p>Loading...</p>
  if (isError) return <p>Something went wrong.</p>

  return (
    <DndContext sensors={sensors} modifiers={[restrictToWindowEdges]} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div className="flex gap-3 min-w-max pb-4">
          {COLUMNS.filter((s) => s !== JobStatus.Withdrawn && s !== JobStatus.NoResponse).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              jobs={jobs.filter((j) => j.status === status)}
              draggingId={draggingId}
              confirmJobId={confirmJob?.id ?? null}
            />
          ))}
          {/* Withdrawn and NoResponse are outside the normal application flow */}
          <div className="w-px self-stretch bg-border mx-1" />
          <KanbanColumn
            status={JobStatus.Withdrawn}
            jobs={jobs.filter((j) => j.status === JobStatus.Withdrawn)}
            draggingId={draggingId}
            confirmJobId={confirmJob?.id ?? null}
          />
          <KanbanColumn
            status={JobStatus.NoResponse}
            jobs={jobs.filter((j) => j.status === JobStatus.NoResponse)}
            draggingId={draggingId}
            confirmJobId={confirmJob?.id ?? null}
          />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeJob ? (
          <div className={cn(
            "bg-card border border-border rounded-md p-3",
            "cursor-grabbing shadow-2xl",
            "scale-105 rotate-1",
          )}>
            <KanbanCardPreview job={activeJob} />
          </div>
        ) : null}
      </DragOverlay>
      <ConfirmDialog
        open={confirmJob != null}
        onOpenChange={open => { if (!open) setConfirmJob(null) }}
        title="Update Applied Date?"
        description={<><span className="block [overflow-wrap:anywhere]">{confirmJob?.company}</span>{`You applied on ${new Date(confirmJob?.appliedAt ?? new Date()).toLocaleDateString()}.`}<br />Reset to today?</>}
        confirmLabel="Reset to today"
        cancelLabel="No, keep it"
        onConfirm={handleDragResetAppliedAt}
        onCancel={handleDragKeepAppliedAt}
      />
    </DndContext>
  )
}
