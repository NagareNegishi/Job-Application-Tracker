import { Button } from "@/components/ui/button";
import type { Job } from "@/types/job";
import { useNavigate } from "react-router";

export function JobHeader({ job }: { job: Job }) {
  const navigate = useNavigate()

  return (
    <div className="flex items-start justify-between">
      <div>
        <button onClick={() => navigate("/jobs")}>← Back</button>
        <h1>{job.company}</h1>
        <p>{job.role}</p>
      </div>
      <div className="flex items-center gap-2">
        {/* <StatusBadge status={job.status} /> */}
        <Button>Edit</Button>
        <Button variant="outline">Add Document</Button>
        <Button variant="destructive">Delete</Button>
      </div>
    </div>
  )
}