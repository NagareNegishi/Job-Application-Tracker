// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent, Modifier } from '@dnd-kit/core'
import { useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useJobs, usePatchJob } from '@/hooks/jobQuery'
import { MaintenanceError } from '@/lib/api'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/job'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { cn } from "@/lib/utils"

const COLUMNS = Object.values(JobStatus)

const COLUMN_BG: Record<JobStatus, string> = {
  Wishlist:  ["bg-slate-50/70",  "dark:bg-slate-800/40"].join(" "),
  Applied:   ["bg-blue-50/70",   "dark:bg-blue-900/20"].join(" "),
  Screening: ["bg-yellow-50/70", "dark:bg-yellow-900/20"].join(" "),
  Interview: ["bg-purple-50/70", "dark:bg-purple-900/20"].join(" "),
  Offered:   ["bg-green-50/70",  "dark:bg-green-900/20"].join(" "),
  Rejected:   ["bg-red-50/70",    "dark:bg-red-900/20"].join(" "),
  NoResponse: ["bg-orange-50/70", "dark:bg-orange-900/20"].join(" "),
}

function KanbanCard({ job }: { job: Job }) {
  const navigate = useNavigate()
  const { setNodeRef, listeners, attributes, transform, isDragging } = useDraggable({
    id: job.id,
    data: { status: job.status },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => navigate(`/jobs/${job.id}`)}
      className={cn(
        "bg-card border border-border rounded-md p-3 cursor-grab",
        "hover:shadow-sm dark:hover:border-white/20",
        "transition-shadow transition-colors",
        isDragging && "opacity-50"
      )}
    >
      <p className="font-medium text-sm truncate">{job.company}</p>
      <p className="text-xs text-muted-foreground truncate">{job.role}</p>
      <div className="mt-2">
        <PriorityDot priority={job.priority} dotSize="w-2 h-2" />
      </div>
    </div>
  )
}

function KanbanColumn({ status, jobs }: { status: JobStatus; jobs: Job[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <div className="flex flex-col gap-2 w-44">
      <div className="flex justify-center px-1">
        <StatusBadge status={status} className="text-sm px-6 py-1" />
      </div>
      <div
        ref={setNodeRef}
        className={`${COLUMN_BG[status]} rounded-md p-2 flex flex-col gap-2 min-h-[120px] flex-1 ${isOver ? 'ring-2 ring-inset ring-primary/40' : ''}`}
      >
        {jobs.map((job) => (
          <KanbanCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { data: jobs, isPending, isError, error } = useJobs()
  const { mutate: patchJob } = usePatchJob()
  const sensors = useSensors(useSensor(PointerSensor))
  const scrollRef = useRef<HTMLDivElement>(null)

  // Reads live rect + scroll from the ref on every pointer move — avoids the
  // viewport-clipping issue of scrollableAncestorRects[0].getBoundingClientRect().
  const restrictToContainer = useCallback<Modifier>(({ draggingNodeRect, transform }) => {
    const el = scrollRef.current
    if (!draggingNodeRect || !el) return transform

    const rect = el.getBoundingClientRect()
    const value = { ...transform }

    const contentLeft  = rect.left - el.scrollLeft
    const contentRight = rect.left + el.scrollWidth - el.scrollLeft

    if (draggingNodeRect.left + transform.x <= contentLeft)
      value.x = contentLeft - draggingNodeRect.left
    else if (draggingNodeRect.right + transform.x >= contentRight)
      value.x = contentRight - draggingNodeRect.right

    if (draggingNodeRect.top + transform.y <= rect.top)
      value.y = rect.top - draggingNodeRect.top
    else if (draggingNodeRect.bottom + transform.y >= rect.top + rect.height)
      value.y = rect.top + rect.height - draggingNodeRect.bottom

    return value
  }, [])

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    // Skip if dropped outside a column or back onto its own column.
    if (!over || active.data.current?.status === over.id) return
    patchJob({ id: Number(active.id), operations: [{ op: 'replace', path: '/status', value: over.id as JobStatus }] })
  }

  if (isPending) return <p>Loading...</p>
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : 'Something went wrong.'}</p>

  return (
    <DndContext sensors={sensors} modifiers={[restrictToContainer]} onDragEnd={handleDragEnd}>
      <div ref={scrollRef} className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {COLUMNS.filter((s) => s !== JobStatus.NoResponse).map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              jobs={jobs.filter((j) => j.status === status)}
            />
          ))}
          {/* NoResponse is outside the normal application flow */}
          <div className="w-px self-stretch bg-border mx-1" />
          <KanbanColumn
            status={JobStatus.NoResponse}
            jobs={jobs.filter((j) => j.status === JobStatus.NoResponse)}
          />
        </div>
      </div>
    </DndContext>
  )
}
