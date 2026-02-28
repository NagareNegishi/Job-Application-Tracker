import { Button } from "@/components/ui/button";
import { useCreateDocument } from "@/hooks/documentQuery";
import type { DocumentType } from "@/types/enums";
import type { Job } from "@/types/job";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";

export function JobHeader({ job }: { job: Job }) {
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { mutate: addDocument, isPending } = useCreateDocument()
  const [selectedType, setSelectedType] = useState<DocumentType>("Other")

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


        <select
          value={selectedType}
          onChange={e => setSelectedType(e.target.value as DocumentType)}
        >
          <option value="CV">CV</option>
          <option value="CoverLetter">Cover Letter</option>
          <option value="Other">Other</option>
        </select>



        <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isPending}>
          {isPending ? "Uploading..." : "Add Document"}
        </Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </div>
  )
}