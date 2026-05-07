import type { Job } from "@/types/job";
import { PriorityDot } from "./ui/PriorityDot";
import { StatusBadge } from "./ui/StatusBadge";

export function JobInfoCard({ job }: { job: Job }) {
  return (
    <div className="border rounded-lg p-6 space-y-4">
      <div className="flex flex-wrap items-center gap-8 border-b border-border pb-4">
        <StatusBadge status={job.status} className="text-sm px-3 py-0.5" />
        {job.priority && <PriorityDot priority={job.priority} dotSize="w-3 h-3" className="text-sm" />}
        {job.appliedAt && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Applied</span>
            <span className="text-sm font-medium">{new Date(job.appliedAt).toLocaleDateString()}</span>
          </span>
        )}
        {job.closedAt && (
          <span className="flex items-baseline gap-1.5">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Closed</span>
            <span className="text-sm font-medium">{new Date(job.closedAt).toLocaleDateString()}</span>
          </span>
        )}
      </div>

      {(job.location || job.workMode) && (
        <div className="flex flex-wrap items-center gap-6">
          {job.location && (
            <span className="flex items-baseline gap-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Location</span>
              <span className="text-sm font-medium">{job.location}</span>
            </span>
          )}
          {job.workMode && (
            <span className="flex items-baseline gap-1.5">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">Work mode</span>
              <span className="text-sm font-medium">{job.workMode === "OnSite" ? "On-site" : job.workMode}</span>
            </span>
          )}
        </div>
      )}

      {(job.salaryMin != null || job.salaryMax != null) && (
        <div className="flex items-baseline gap-1.5">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Salary</span>
          <span className="text-sm font-medium">
            {/* range when both set and differ; single value otherwise */}
            {job.salaryMin != null && job.salaryMax != null && job.salaryMin !== job.salaryMax
              ? `${job.salaryMin.toLocaleString()} – ${job.salaryMax.toLocaleString()}`
              : (job.salaryMin ?? job.salaryMax)!.toLocaleString()}
          </span>
        </div>
      )}

      {job.description && (
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground">Description</p>
          <p className="text-sm text-foreground/80">{job.description}</p>
        </div>
      )}

      {job.notes && (
        <div className="space-y-1">
          <p className="text-sm uppercase tracking-wider font-semibold text-muted-foreground">Notes</p>
          <p className="text-sm text-foreground/80">{job.notes}</p>
        </div>
      )}
    </div>
  )
}