// JobDetailPage.tsx
// This page displays detailed information about a specific job application, including:
// JobDetailPage
// ├── JobHeader          # company, role, back button, edit/delete actions
// ├── JobInfoCard        # status, priority, appliedAt, closedAt, notes/description
// ├── ContactList        # list of contacts (JSON column)
// │   └── ContactCard    # individual contact — name, email, phone, role
// ├── CorrespondenceList # timeline of correspondence entries (JSON column)
// │   └── CorrespondenceEntry
// └── DocumentList       # uploaded files
//     └── DocumentCard   # filename, type, upload date, download/delete
import { ContactList } from "@/components/ContactList";
import { CorrespondenceList } from "@/components/CorrespondenceList";
import { DocumentList } from "@/components/DocumentList";
import { JobEditSheet } from "@/components/JobEditSheet";
import { JobHeader } from "@/components/JobHeader";
import { JobInfoCard } from "@/components/JobInfoCard";
import { useJob } from "@/hooks/jobQuery";
import { useState } from "react";
import { useParams } from "react-router";


function JobDetailPage() {

  const [editOpen, setEditOpen] = useState(false)

  const { id } = useParams()
  const jobId = id ? parseInt(id) : NaN
  const { data: job, isPending, isError } = useJob(jobId, { enabled: !isNaN(jobId) })
  if (!id || isNaN(jobId)) return <p>Invalid job ID.</p>
  if (isPending) return <p>Loading...</p>
  if (isError) return <p>Something went wrong.</p>
  if (!job) return <p>Job not found.</p>

  return (
    <div className="container mx-auto p-4">
      {/* <p className="text-2xl font-bold mb-4">Job Tracker</p> */}
      <JobHeader job={job} onEdit={() => setEditOpen(true)} />
      <JobInfoCard job={job} />
      <ContactList contacts={job.contacts ?? []} />
      <CorrespondenceList entries={job.correspondences ?? []} />
      {/* DocumentList would go here */}
      <DocumentList jobId={jobId} />

      <JobEditSheet job={job} open={editOpen} onOpenChange={setEditOpen} />

    </div>
  )
}

export default JobDetailPage