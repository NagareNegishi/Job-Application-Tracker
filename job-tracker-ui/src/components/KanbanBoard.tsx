// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable

import { useNavigate } from 'react-router'
import { useJobs } from '@/hooks/jobQuery'
import { MaintenanceError } from '@/lib/api'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/job'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { StatusBadge } from '@/components/ui/StatusBadge'

const COLUMNS = Object.values(JobStatus)

function KanbanCard({ job }: { job: Job }) {
  const navigate = useNavigate()
  return (
    <div
      onClick={() => navigate(`/jobs/${job.id}`)}
      className="bg-card border border-border rounded-md p-3 cursor-pointer hover:shadow-sm transition-shadow"
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
  return (
    <div className="flex flex-col gap-2 w-44">
      <div className="flex justify-center px-1">
        <StatusBadge status={status} className="text-sm px-3 py-1" />
      </div>
      <div className="bg-muted rounded-md p-2 flex flex-col gap-2 min-h-[120px]">
        {jobs.map((job) => (
          <KanbanCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  )
}

export function KanbanBoard() {
  const { data: jobs, isPending, isError, error } = useJobs()

  if (isPending) return <p>Loading...</p>
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : 'Something went wrong.'}</p>

  return (
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
  )
}
