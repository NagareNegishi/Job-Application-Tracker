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
import { useJobFilters, type SortField } from "@/hooks/useJobFilters";
import { ArrowDown, ArrowUp, ArrowUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { JobCreateSheet } from "./JobCreateSheet";
import { JobFilterBar } from "./JobFilterBar";
import { PriorityDot } from "./ui/PriorityDot";
import { StatusBadge } from "./ui/StatusBadge";

// Renders a column header that toggles sort on click.
// Shows a directional arrow when active, a neutral icon when inactive.
function SortableHead({
  field,
  label,
  activeField,
  dir,
  onSort,
  className,
}: {
  field: SortField;
  label: string;
  activeField: SortField | null;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
  className?: string;
}) {
  const isActive = activeField === field;
  const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      <button
        onClick={() => onSort(field)}
        className="flex items-center gap-1 hover:text-foreground text-muted-foreground transition-colors"
      >
        {label}
        <Icon className="size-3.5" />
      </button>
    </TableHead>
  );
}

export function JobTable() {
  const { data: jobs, isPending, isError } = useJobs();
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();

  const {
    filteredJobs,
    sortField,
    sortDir,
    setSort,
    filters,
    setFilters,
    clearFilters,
    availableRoles,
    isFiltered,
  } = useJobFilters(jobs ?? []);

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>Something went wrong.</p>;

  const sortProps = { activeField: sortField, dir: sortDir, onSort: setSort };

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

      <JobFilterBar
        filters={filters}
        availableRoles={availableRoles}
        isFiltered={isFiltered}
        onFilterChange={setFilters}
        onClear={clearFilters}
      />

      {/* Job table */}
      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-md">
          No jobs registered yet. Click "Add New Job" to create your first job application.
        </p>
      ) : (
        <Table className="min-w-[640px]">
          <TableCaption>
            Showing {filteredJobs.length}
            {isFiltered && ` of ${jobs.length}`} application
            {filteredJobs.length !== 1 ? "s" : ""}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <SortableHead field="company" label="Company" {...sortProps} />
              <TableHead>Role</TableHead>
              <SortableHead
                field="status"
                label="Status"
                className="text-center"
                {...sortProps}
              />
              <SortableHead
                field="priority"
                label="Priority"
                className="text-center"
                {...sortProps}
              />
              <SortableHead field="appliedAt" label="Applied At" {...sortProps} />
              <SortableHead field="closedAt" label="Closed At" {...sortProps} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium">{job.company}</TableCell>
                <TableCell>{job.role}</TableCell>
                <TableCell className="text-center">
                  <StatusBadge status={job.status} />
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex justify-center">
                    <PriorityDot priority={job.priority} />
                  </div>
                </TableCell>
                <TableCell>
                  {job.appliedAt
                    ? new Date(job.appliedAt).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell>
                  {job.closedAt
                    ? new Date(job.closedAt).toLocaleDateString()
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <JobCreateSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
