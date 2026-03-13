import { Button } from "@/components/ui/button";
import { useDeleteJob } from "@/hooks/jobQuery";
import type { Job } from "@/types/job";
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from "lucide-react";
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
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          onClick={onEdit}
        >
          Edit
        </Button>

        <Button
          variant="destructive"
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
          {isDeleting ? "Deleting..." : "Delete"}
        </Button>
      </div>
    </div>
  )
}