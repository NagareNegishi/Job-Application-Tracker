import { Button } from "@/components/ui/button";
import { useDeleteJob } from "@/hooks/jobQuery";
import type { Job } from "@/types/job";
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useNavigate } from "react-router";

/**
 * Props for JobHeader component, which displays the company and role of a job application,
 */
interface JobHeaderProps {
  job: Job
  onEdit: () => void
}


/**
 * JobHeader component displays the company and role of a job application,
 * along with action buttons for editing, adding documents, and deleting the job.
 */
export function JobHeader({ job, onEdit }: JobHeaderProps) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteJob()


  return (
    <div className="mb-6">
      {/* Row 1: Back button */}
      <Button
        variant="ghost"
        size="icon"
        className="rounded-full -ml-2 -mt-2 mb-0"
        onClick={() => navigate("/jobs")}
        aria-label="Back to jobs"
      >
        <ChevronLeft className="h-7 w-7 stroke-[3]" />
      </Button>

      {/* Row 2: Avatar + company identity on left, actions on right */}
      <div className="flex items-start justify-between">
        <div className="pl-10 -mt-1">
          {/* Avatar centered with company name only */}
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {job.company.charAt(0).toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{job.company}</h1>
          </div>
          {/* Accent bar and role sit below, indented past avatar (w-12=3rem + gap-4=1rem = pl-16=4rem) */}
          <div className="pl-16">
            <div className="h-1 w-10 rounded-full bg-primary mt-1" />
            <p className="text-sm text-muted-foreground mt-1.5">{job.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="secondary"
            className="hover:bg-border active:scale-95"
            onClick={onEdit}
          >
            <Pencil className="h-4 w-4" />
            Edit
          </Button>

          <Button
            variant="outline"
            className="border-destructive/50 text-destructive/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive active:scale-95"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this job? This action cannot be undone.")) {
                deleteJob(job.id, {
                  onSuccess: () => {
                    queryClient.invalidateQueries({ queryKey: ["jobs", job.id] })
                    navigate("/jobs")
                  }
                })
              }
            }}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </div>
    </div>
  )
}