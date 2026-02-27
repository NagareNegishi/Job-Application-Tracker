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

export function JobTable() {
  const { data: jobs, isPending, isError } = useJobs()
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
          <TableRow key={job.id}>
            <TableCell className="font-medium">{job.company}</TableCell>
            <TableCell>{job.role}</TableCell>
            <TableCell>{job.status}</TableCell>
            <TableCell>{job.priority ?? "N/A"}</TableCell>
            <TableCell>{job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "N/A"}</TableCell>
            <TableCell>{job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "N/A"}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
