// JobDetailPage
// ├── JobHeader          # company, role, back button, edit/delete actions
// ├── JobInfoCard        # status, priority, appliedAt, closedAt, notes/description
// ├── ContactList        # list of contacts (JSON column)
// │   └── ContactCard    # individual contact — name, email, phone, role
// ├── CorrespondenceList # timeline of correspondence entries (JSON column)
// │   └── CorrespondenceEntry
// └── DocumentList       # uploaded files
//     └── DocumentCard   # filename, type, upload date, download/delete
import { JobHeader } from "@/components/JobHeader";
import { JobInfoCard } from "@/components/JobInfoCard";
import { useJob } from "@/hooks/jobQuery";
import { useParams } from "react-router";

function JobDetailPage() {

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
      <JobHeader job={job} />
      <JobInfoCard job={job} />

    </div>
  )
}

export default JobDetailPage