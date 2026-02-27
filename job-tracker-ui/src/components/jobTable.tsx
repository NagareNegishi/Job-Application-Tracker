import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Job } from "../types/job";
// import type { Contact, Correspondence } from "../types/contact";
// import { JobStatus, Priority } from "../types/enums";
// import type { JobDocument } from "../types/jobDocument";


interface JobTableProps {
  jobs: Job[];
  // Optional className for styling
  className?: string;
}

// // Job interface, mirrors JobResponseDto from the backend
// export interface Job {
//   id: number;
//   company: string;
//   role: string;
//   status: JobStatus;
//   priority?: Priority;
//   appliedAt?: string; // ISO date string
//   closedAt?: string; // ISO date string
//   documents?: JobDocument[]; // Don't expose internal Document
//   description?: string;
//   notes?: string;
//   contacts?: Contact[];
//   correspondences?: Correspondence[];
// }


export function JobTable({ jobs, className }: JobTableProps) {
  return (
    <div className={cn(className)}>
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
    </div>
  )
}
