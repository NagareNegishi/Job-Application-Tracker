import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useJobs } from "@/hooks/jobQuery";
import { Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { JobCreateSheet } from "./JobCreateSheet";
import { PriorityDot } from "./ui/PriorityDot";
import { StatusBadge } from "./ui/StatusBadge";

export function JobTable() {
  const { data: jobs, isPending, isError } = useJobs()
  const [addOpen, setAddOpen] = useState(false)
  const navigate = useNavigate()

  // Handle loading and error states
  if (isPending) return <p>Loading...</p>
  if (isError) return <p>Something went wrong.</p>
  return (
    <div className="flex flex-col gap-4">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Job Applications</h1>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Job
        </Button>
      </div>

      {/* Job table */}
      {jobs.length === 0
        ? <p className="text-muted-foreground text-md">
            No jobs registered yet. Click "Add New Job" to create your first job application.
          </p>
        : <Table>
            <TableCaption>Jobs</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Applied At</TableHead>
                <TableHead>Closed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="cursor-pointer hover:bg-gray-100"
                >
                  <TableCell className="font-medium">{job.company}</TableCell>
                  <TableCell>{job.role}</TableCell>
                  <TableCell><StatusBadge status={job.status} /></TableCell>
                  <TableCell><PriorityDot priority={job.priority} /></TableCell>
                  <TableCell>{job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "N/A"}</TableCell>
                  <TableCell>{job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "N/A"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      }

      <JobCreateSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
