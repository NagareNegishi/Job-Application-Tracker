// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable

import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core'
import type { DragEndEvent } from '@dnd-kit/core'
import { useNavigate } from 'react-router'
import { useJobs, usePatchJob } from '@/hooks/jobQuery'
import { MaintenanceError } from '@/lib/api'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/job'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { StatusBadge } from '@/components/ui/StatusBadge'

const COLUMNS = Object.values(JobStatus)

const COLUMN_BG: Record<JobStatus, string> = {
  Wishlist:  ["bg-slate-50/70",  "dark:bg-slate-800/40"].join(" "),
  Applied:   ["bg-blue-50/70",   "dark:bg-blue-900/20"].join(" "),
  Screening: ["bg-yellow-50/70", "dark:bg-yellow-900/20"].join(" "),
  Interview: ["bg-purple-50/70", "dark:bg-purple-900/20"].join(" "),
  Offered:   ["bg-green-50/70",  "dark:bg-green-900/20"].join(" "),
  Rejected:  ["bg-red-50/70",    "dark:bg-red-900/20"].join(" "),
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
      className={`bg-card border border-border rounded-md p-3 cursor-grab hover:shadow-sm transition-shadow ${isDragging ? 'opacity-50' : ''}`}
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
        className={`${COLUMN_BG[status]} rounded-md p-2 flex flex-col gap-2 min-h-[120px] ${isOver ? 'ring-2 ring-inset ring-primary/40' : ''}`}
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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    // Skip if dropped outside a column or back onto its own column.
    if (!over || active.data.current?.status === over.id) return
    patchJob({ id: Number(active.id), operations: [{ op: 'replace', path: '/status', value: over.id as JobStatus }] })
  }

  if (isPending) return <p>Loading...</p>
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : 'Something went wrong.'}</p>

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="overflow-x-auto">
        <div className="flex gap-4 min-w-max pb-4">
          {COLUMNS.map((status) => (
            <KanbanColumn
              key={status}
              status={status}
              jobs={jobs.filter((j) => j.status === status)}
            />
          ))}
        </div>
      </div>
    </DndContext>
  )
}
