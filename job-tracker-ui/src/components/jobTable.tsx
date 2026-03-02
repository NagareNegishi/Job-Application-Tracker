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
import { useState } from "react";
import { useNavigate } from "react-router";
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
    <div className="flex items-start justify-between">

      {/* Add Job button would go here, opening a JobEditSheet in "create" mode */}
      <Button
        variant="outline"
        // onClick={onAdd}
      >
        Add
      </Button>


      <Table>
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
    </div>
  )
}
