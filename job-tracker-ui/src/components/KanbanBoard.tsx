// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable

import { useState } from 'react'
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, DragStartEvent, Modifier } from '@dnd-kit/core'
import { useNavigate } from 'react-router'
import { useJobs, usePatchJob } from '@/hooks/jobQuery'
import { MaintenanceError } from '@/lib/api'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/job'
import { PriorityDot } from '@/components/ui/PriorityDot'
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
      <div className="mt-2">
        <PriorityDot priority={job.priority} dotSize="w-2 h-2" />
      </div>
    </>
  )
}

function KanbanCard({ job, isBeingDragged }: { job: Job; isBeingDragged: boolean }) {
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
      )}
    >
      <KanbanCardPreview job={job} />
    </div>
  )
}

function KanbanColumn({ status, jobs, draggingId }: { status: JobStatus; jobs: Job[]; draggingId: number | null }) {
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
          <KanbanCard key={job.id} job={job} isBeingDragged={job.id === draggingId} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { data: jobs, isPending, isError, error } = useJobs()
  const { mutate: patchJob } = usePatchJob()
  const sensors = useSensors(useSensor(PointerSensor))
  const [activeJob, setActiveJob] = useState<Job | null>(null)
  const [draggingId, setDraggingId] = useState<number | null>(null)

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
    patchJob(
      { id: Number(active.id), operations: [{ op: 'replace', path: '/status', value: over.id as JobStatus }] },
      { onSettled: () => setDraggingId(null) }
    )
  }

  if (isPending) return <p>Loading...</p>
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : 'Something went wrong.'}</p>

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
            />
          ))}
          {/* Withdrawn and NoResponse are outside the normal application flow */}
          <div className="w-px self-stretch bg-border mx-1" />
          <KanbanColumn
            status={JobStatus.Withdrawn}
            jobs={jobs.filter((j) => j.status === JobStatus.Withdrawn)}
            draggingId={draggingId}
          />
          <KanbanColumn
            status={JobStatus.NoResponse}
            jobs={jobs.filter((j) => j.status === JobStatus.NoResponse)}
            draggingId={draggingId}
          />
        </div>
      </div>
      <DragOverlay dropAnimation={null}>
        {activeJob ? (
          <div className={cn(
            "bg-card border border-border rounded-md p-3",
            "cursor-grabbing shadow-lg",
          )}>
            <KanbanCardPreview job={activeJob} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
