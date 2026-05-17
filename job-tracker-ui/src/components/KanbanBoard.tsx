// [dnd-kit-legacy] migrate to @dnd-kit/react when v1.0 is stable

import { useNavigate } from 'react-router'
import { useJobs } from '@/hooks/jobQuery'
import { MaintenanceError } from '@/lib/api'
import { JobStatus } from '@/types/enums'
import type { Job } from '@/types/job'
import { PriorityDot } from '@/components/ui/PriorityDot'
import { StatusBadge } from '@/components/ui/StatusBadge'

const COLUMNS = Object.values(JobStatus)

export function KanbanBoard() {
  return (
    <div className="p-4 text-muted-foreground">Kanban board — coming soon</div>
  )
}
