import { Badge } from "@/components/ui/badge"
import type { Job } from "@/types/job"
import { StatusBadge } from "./ui/StatusBadge"

export function JobInfoCard({ job }: { job: Job }) {
  return (
    <div className="border rounded-lg p-4 space-y-4">
      <div className="flex gap-4">
        <StatusBadge status={job.status} />
        {job.priority && <Badge variant="outline">{job.priority}</Badge>}
        {job.appliedAt && <span>Applied: {new Date(job.appliedAt).toLocaleDateString()}</span>}
        {job.closedAt && <span>Closed: {new Date(job.closedAt).toLocaleDateString()}</span>}
      </div>

      {job.description && (
        <div>
          <p className="text-sm font-medium">Description</p>
          <p className="text-sm text-muted-foreground">{job.description}</p>
        </div>
      )}

      {job.notes && (
        <div>
          <p className="text-sm font-medium">Notes</p>
          <p className="text-sm text-muted-foreground">{job.notes}</p>
        </div>
      )}
    </div>
  )
}