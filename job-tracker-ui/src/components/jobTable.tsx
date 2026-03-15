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
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold">Job Applications</h1>
        <Button
          variant="outline"
          className="shadow-xs hover:bg-secondary"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Job
        </Button>
      </div>
      <hr className="border-t border-border" />

      {/* Job table */}
      {jobs.length === 0
        ? <p className="text-muted-foreground text-md">
            No jobs registered yet. Click "Add New Job" to create your first job application.
          </p>
        : <Table className="min-w-[640px]">
            <TableCaption>Showing {jobs.length} application{jobs.length !== 1 ? "s" : ""}</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-center">Priority</TableHead>
                <TableHead>Applied At</TableHead>
                <TableHead>Closed At</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {jobs.map((job) => (
                <TableRow
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{job.company}</TableCell>
                  <TableCell>{job.role}</TableCell>
                  <TableCell className="text-center"><StatusBadge status={job.status} /></TableCell>
                  <TableCell className="text-center"><div className="flex justify-center"><PriorityDot priority={job.priority} /></div></TableCell>
                  <TableCell>{job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "—"}</TableCell>
                  <TableCell>{job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
      }

      <JobCreateSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
