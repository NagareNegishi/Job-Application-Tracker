import { Button } from "@/components/ui/button";
import { useCreateDocument } from "@/hooks/documentQuery";
import { useDeleteJob } from "@/hooks/jobQuery";
import type { DocumentType } from "@/types/enums";
import type { Job } from "@/types/job";
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

export function JobHeader({ job }: { job: Job }) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  
  const [selectedType, setSelectedType] = useState<DocumentType>("Other")
  
  const { mutate: deleteJob, isPending: isDeleting } = useDeleteJob()
  const { mutate: addDocument, isPending } = useCreateDocument()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] // get the first selected file (if any)
    if (!file) return
    addDocument({ jobId: job.id, data: { file, type: selectedType } })
    e.target.value = "" // reset so same file can be re-uploaded
  }


  return (
    <div className="flex items-start justify-between">
      <div>
        <button onClick={() => navigate("/jobs")}>← Back</button>
        <h1>{job.company}</h1>
        <p>{job.role}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* Hidden file input for document upload, triggered by "Add Document" button */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* <StatusBadge status={job.status} /> */}
        <Button>Edit</Button>

        {/* Document type selector for uploads */}
        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value as DocumentType)}
        >
          <option value="CV">CV</option>
          <option value="CoverLetter">Cover Letter</option>
          <option value="Other">Other</option>
        </select>
        {/* "Add Document" button triggers hidden file input */}
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
          {isPending ? "Uploading..." : "Add Document"}
        </Button>

        {/* Delete button with confirmation */}
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