import { DeleteConfirmDialog } from "@/components/ui/DeleteConfirmDialog";
import { UnderlinedText } from "@/components/UnderlinedText";
import { useDeleteJob } from "@/hooks/jobQuery";
import type { Job } from "@/types/job";
import { useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { ResponsiveButton } from "@/components/ui/ResponsiveButton";
import { ChevronLeft, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
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
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <>
    <div className="mb-4">
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
      <div className="flex items-start justify-between gap-4">
        <div className="pl-3 sm:pl-10 -mt-1 min-w-0">
          {/* Avatar centered with company name only */}
          <div className="flex items-center gap-4 min-w-0">
            <div className="hidden sm:flex h-12 w-12 rounded-full bg-primary/10 items-center justify-center shrink-0">
              <span className="text-lg font-bold text-primary">
                {job.company.charAt(0).toUpperCase()}
              </span>
            </div>
            <UnderlinedText
              className="text-2xl font-bold tracking-tight text-foreground truncate"
              underlineColor="var(--primary)"
              underlineThickness={3}
              underlineOverhang={6}
              underlineGap={5}
            >
              {job.company}
            </UnderlinedText>
          </div>
          {/* Role sits below, indented past avatar (w-12=3rem + gap-4=1rem = pl-16=4rem) */}
          <div className="pl-0 sm:pl-16">
            <p className="text-lg font-semibold text-foreground/70 mt-1.5">{job.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1 shrink-0">
          <ResponsiveButton
            icon={Pencil}
            variant="secondary"
            className="hover:bg-border active:scale-95"
            onClick={onEdit}
          >
            Edit
          </ResponsiveButton>

          <ResponsiveButton
            icon={Trash2}
            variant="outline"
            className="border-destructive/50 text-destructive/70 hover:bg-destructive/10 hover:text-destructive hover:border-destructive active:scale-95"
            onClick={() => setDeleteOpen(true)}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </ResponsiveButton>
        </div>
      </div>
    </div>

    {/* Delete confirmation dialog */}
    <DeleteConfirmDialog
      open={deleteOpen}
      onOpenChange={setDeleteOpen}
      title="Delete Job?"
      description={<>This action cannot be undone.<br />All associated data will be permanently deleted.</>}
      onConfirm={() =>
        deleteJob(job.id, {
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["jobs", job.id] })
            navigate("/jobs")
          }
        })
      }
    />
    </>
  )
}