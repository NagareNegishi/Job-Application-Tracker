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
    <div className="flex items-start justify-between">
      <div>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={() => navigate("/jobs")}
          aria-label="Back to jobs"
        >
          <ChevronLeft className="h-6 w-6 stroke-[2.5]" />
        </Button>
        <h1>{job.company}</h1>
        <p>{job.role}</p>
      </div>
      <div className="flex items-center gap-2 mr-1">
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
  )
}