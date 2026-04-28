import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { MaintenanceError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { JobStatus, Priority } from "@/types/enums";
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { JobCreateSheet } from "./JobCreateSheet";
import { PriorityDot } from "./ui/PriorityDot";
import { StatusBadge } from "./ui/StatusBadge";

const COL_RESIZE_MIN = 80;
const COL_RESIZE_MAX = 550;
const COL_WIDTH_COMPANY = 200;
const COL_WIDTH_ROLE = 200;
const COL_WIDTH_FIXED = 110;

// Manages column widths and resizing logic for the job table.
function useColWidths(initial: number[]) {
  const [widths, setWidths] = useState(initial);

  function startResize(colIndex: number) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = widths[colIndex];
      const onMove = (ev: MouseEvent) => {
        setWidths((prev) => {
          const next = [...prev];
          next[colIndex] = Math.min(COL_RESIZE_MAX, Math.max(COL_RESIZE_MIN, startW + ev.clientX - startX));
          return next;
        });
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }

  const totalWidth = widths.reduce((a, b) => a + b, 0);
  return { widths, startResize, totalWidth };
}

// Filter popover for a single column.
// - `label`: when provided (filter-only columns), renders label + icon as one
//   unified trigger so clicking the text also opens the popover.
// - Without label (sort+filter columns), renders only the icon; parent wraps
//   sort + icon in a CSS `group` so both react to hover together.
// Icon (and label) are highlighted when a filter value is active.
function FilterPopover({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  // When an option is selected, update filter and close popover.
  function select(v: string) {
    onChange(v);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1 rounded p-0.5 transition-colors",
            "hover:text-foreground group-hover:text-foreground",
            value !== ""
              ? "text-primary bg-primary/10"
              : "text-muted-foreground"
          )}
        >
          {label && <span>{label}</span>}
          <ListFilter className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-36 p-1">
        {["", ...options].map((opt) => (
          <button
            key={opt || "__all__"}
            onClick={() => select(opt)}
            className={cn(
              "w-full rounded px-2 py-1.5 text-left text-sm",
              "hover:bg-accent hover:text-accent-foreground",
              value === opt && "font-medium"
            )}
          >
            {opt || "All"}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

// Sortable column header with optional filter slot for columns that
// support both sorting and filtering.
function SortableHead({
  field,
  label,
  activeField,
  dir,
  onSort,
  className,
  filter,
}: {
  field: SortField;
  label: string;
  activeField: SortField | null;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
  className?: string;
  filter?: React.ReactNode;
}) {
  const isActive = activeField === field;
  const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <TableHead className={className}>
      {/* group: hovering filter icon also highlights sort text, and vice versa */}
      <div className="flex items-center gap-1 group">
        <button
          onClick={() => onSort(field)}
          className={cn(
            "flex items-center gap-1 rounded px-1 transition-colors",
            "hover:text-foreground group-hover:text-foreground",
            isActive
              ? "text-foreground bg-muted"
              : "text-muted-foreground"
          )}
        >
          {label}
          <Icon className="size-3.5" />
        </button>
        {filter}
      </div>
    </TableHead>
  );
}

const STATUS_OPTIONS = Object.values(JobStatus);
const PRIORITY_OPTIONS = Object.values(Priority);

const TAB_STYLES = {
  "active":       { tab: "!bg-blue-50 !text-blue-800 border-blue-300",    table: "bg-blue-50" },
  "closing-soon": { tab: "!bg-amber-50 !text-amber-800 border-amber-300", table: "bg-amber-50" },
  "all":          { tab: "!bg-slate-50 !text-slate-700 border-slate-300", table: "bg-slate-50" },
  "rejected":     { tab: "!bg-rose-50 !text-rose-800 border-rose-300",    table: "bg-rose-50" },
} as const;

export function JobTable() {
  const { data: jobs, isPending, isError, error } = useJobs();
  const [addOpen, setAddOpen] = useState(false);
  const navigate = useNavigate();
  const { widths, startResize, totalWidth } = useColWidths([
    COL_WIDTH_COMPANY, COL_WIDTH_ROLE,
    COL_WIDTH_FIXED, COL_WIDTH_FIXED, COL_WIDTH_FIXED, COL_WIDTH_FIXED,
  ]);

  const [activeTab, setActiveTab] = useState<"active" | "closing-soon" | "all" | "rejected">("active");

  // Pre-filter by tab before column filters are applied
  const tabFilteredJobs = useMemo(() => {
    const all = jobs ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    switch (activeTab) {
      case "active":
        return all.filter((j) => j.status !== JobStatus.Rejected);
      case "closing-soon":
        return all.filter((j) => {
          if (j.status !== JobStatus.Wishlist || !j.closedAt) return false;
          const d = new Date(j.closedAt);
          return d >= today && d <= in7Days;
        });
      case "rejected":
        return all.filter((j) => j.status === JobStatus.Rejected);
      default:
        return all;
    }
  }, [jobs, activeTab]);

  const {
    filteredJobs,
    sortField,
    sortDir,
    setSort,
    filters,
    setFilters,
    availableRoles,
    isFiltered,
  } = useJobFilters(tabFilteredJobs);

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : "Something went wrong."}</p>;

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

      {/* Tab nav */}
      <div className={cn("flex flex-col", TAB_STYLES[activeTab].table)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-background p-0 h-auto rounded-none border-b border-border w-full justify-start items-end gap-1">
          {(
            [
              { value: "active", label: "Active" },
              { value: "closing-soon", label: "Closing Soon" },
              { value: "all", label: "All" },
              { value: "rejected", label: "Rejected" },
            ] as const
          ).map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                "rounded-t-md rounded-b-none border border-border bg-muted text-muted-foreground px-4 py-1.5 h-auto flex-none -mb-px transition-colors duration-200 data-[state=active]:font-medium data-[state=active]:underline data-[state=active]:underline-offset-4 data-[state=active]:border-2 data-[state=active]:border-b-0 data-[state=active]:!shadow-none",
                TAB_STYLES[value].tab
              )}
            >
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Job table */}
      {jobs.length === 0 ? (
        <p className="text-muted-foreground text-md">
          No jobs registered yet. Click "Add New Job" to create your first job application.
        </p>
      ) : (
        <Table style={{ width: totalWidth, tableLayout: "fixed" }}>
          <colgroup>
            {widths.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>
          <TableCaption>
            Showing {filteredJobs.length}
            {isFiltered && ` of ${jobs.length}`} application
            {filteredJobs.length !== 1 ? "s" : ""}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className="relative overflow-visible">
                <div className="flex items-center gap-1 group">
                  <button
                    onClick={() => sortProps.onSort("company")}
                    className={cn(
                      "flex items-center gap-1 rounded px-1 transition-colors",
                      "hover:text-foreground group-hover:text-foreground",
                      sortProps.activeField === "company"
                        ? "text-foreground bg-muted"
                        : "text-muted-foreground"
                    )}
                  >
                    Company
                    {sortProps.activeField === "company"
                      ? sortProps.dir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />
                      : <ArrowUpDown className="size-3.5" />}
                  </button>
                </div>
                <div
                  onMouseDown={startResize(0)}
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-border select-none"
                />
              </TableHead>
              <TableHead className="relative overflow-visible">
                <FilterPopover
                  label="Role"
                  options={availableRoles}
                  value={filters.role}
                  onChange={(v) => setFilters((f) => ({ ...f, role: v }))}
                />
                <div
                  onMouseDown={startResize(1)}
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-border select-none"
                />
              </TableHead>
              <SortableHead
                field="status"
                label="Status"
                className="text-center"
                {...sortProps}
                filter={
                  <FilterPopover
                    options={STATUS_OPTIONS}
                    value={filters.status}
                    onChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        status: v as typeof filters.status,
                      }))
                    }
                  />
                }
              />
              <SortableHead
                field="priority"
                label="Priority"
                className="text-center"
                {...sortProps}
                filter={
                  <FilterPopover
                    options={PRIORITY_OPTIONS}
                    value={filters.priority}
                    onChange={(v) =>
                      setFilters((f) => ({
                        ...f,
                        priority: v as typeof filters.priority,
                      }))
                    }
                  />
                }
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
                <TableCell className="font-medium overflow-hidden text-ellipsis">{job.company}</TableCell>
                <TableCell className="overflow-hidden text-ellipsis">{job.role}</TableCell>
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
      </div>

      <JobCreateSheet open={addOpen} onOpenChange={setAddOpen} />
    </div>
  );
}
