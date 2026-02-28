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
import { useNavigate } from "react-router";
import { PriorityDot } from "./ui/PriorityDot";
import { StatusBadge } from "./ui/StatusBadge";

export function JobTable() {
  const { data: jobs, isPending, isError } = useJobs()
  const navigate = useNavigate()
  if (isPending) return <p>Loading...</p>
  if (isError) return <p>Something went wrong.</p>
  return (
    <Table>
      <TableCaption>Some Caption</TableCaption>
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
            <TableCell>{job.priority ? <PriorityDot priority={job.priority} /> : "N/A"}</TableCell>
            <TableCell>{job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "N/A"}</TableCell>
            <TableCell>{job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "N/A"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
