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
import { AnalysisSection } from "@/components/AnalysisSection";
import { ContactList } from "@/components/ContactList";
import { CorrespondenceList } from "@/components/CorrespondenceList";
import { DocumentList } from "@/components/DocumentList";
import { JobEditSheet } from "@/components/JobEditSheet";
import { JobHeader } from "@/components/JobHeader";
import { JobInfoCard } from "@/components/JobInfoCard";
import { useJob } from "@/hooks/jobQuery";
import { useState } from "react";
import NavBar from "@/components/NavBar";
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
    <div className="min-h-screen bg-muted">
      <NavBar />
      <div className="max-w-5xl mx-auto px-0 py-8 sm:px-6">
        <div className="bg-card rounded-lg shadow-sm px-2 py-3 sm:p-6">
          <JobHeader job={job} onEdit={() => setEditOpen(true)} />
          <hr className="border-t border-border mb-6" />
          <div className="px-1 sm:px-4 space-y-6">
            <JobInfoCard job={job} />
            <AnalysisSection job={job} />
            <ContactList
              contacts={job.contacts ?? []}
              jobId={jobId}
            />
            <CorrespondenceList
              entries={job.correspondences ?? []}
              jobId={jobId}
            />
            <DocumentList jobId={jobId} />
          </div>

          <JobEditSheet job={job} open={editOpen} onOpenChange={setEditOpen} />
        </div>
      </div>
    </div>
  )
}

export default JobDetailPage