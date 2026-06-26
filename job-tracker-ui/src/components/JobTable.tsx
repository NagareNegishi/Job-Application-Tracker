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
import { usePreferences } from "@/hooks/preferencesQuery";
import { MaintenanceError } from "@/lib/api";
import { COLUMNS } from "@/lib/columns";
import type { ColumnKey } from "@/lib/columns";
import { cn } from "@/lib/utils";
import { JobStatus, Priority, WorkMode, formatEnumLabel } from "@/types/enums";
import { ArrowDown, ArrowUp, ArrowUpDown, ListFilter, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hasRole } from "@/lib/auth";
import type { FormState } from "@/types/formTypes";
import { ColumnToggle } from "./ColumnToggle";
import { JobCreateSheet } from "./JobCreateSheet";
import { ParseListingDialog } from "./ParseListingDialog";
import { PriorityDot } from "./ui/PriorityDot";
import { StatusBadge } from "./ui/StatusBadge";

const COL_RESIZE_MIN = 80;
const COL_RESIZE_MAX = 550;

// Fallback visible set used before preferences load.
const DEFAULT_VISIBLE = COLUMNS
  .filter((c) => c.defaultVisible)
  .map((c) => c.key as ColumnKey);

// Manages column widths keyed by column key so widths survive column toggling.
function useColWidths() {
  const [widths, setWidths] = useState<Record<ColumnKey, number>>(
    () => Object.fromEntries(COLUMNS.map((c) => [c.key, c.defaultWidth])) as Record<ColumnKey, number>
  );

  function startResize(key: ColumnKey) {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = widths[key];
      const onMove = (ev: MouseEvent) => {
        setWidths((prev) => ({
          ...prev,
          [key]: Math.min(COL_RESIZE_MAX, Math.max(COL_RESIZE_MIN, startW + ev.clientX - startX)),
        }));
      };
      const onUp = () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    };
  }

  return { widths, startResize };
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
            {opt ? formatEnumLabel(opt) : "All"}
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
  showControls = true,
}: {
  field: SortField;
  label: string;
  activeField: SortField | null;
  dir: "asc" | "desc";
  onSort: (f: SortField) => void;
  className?: string;
  filter?: React.ReactNode;
  showControls?: boolean;
}) {
  const isActive = activeField === field;
  const Icon = isActive ? (dir === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  if (!showControls) {
    return <TableHead className={className}><span className="px-1 text-sm text-muted-foreground">{label}</span></TableHead>;
  }

  return (
    <TableHead className={cn(className, isActive && "border-b-2 border-primary")}>
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
// Derived from enum so it stays in sync if WorkMode values change.
const WORK_MODE_OPTIONS = Object.values(WorkMode).map(formatEnumLabel);

const TAB_STYLES = {
  "active": {
    tab:      ["!bg-blue-50 !text-blue-800 border-blue-300",   "dark:!bg-blue-900/30 dark:!text-blue-400 dark:border-blue-800"].join(" "),
    table:    ["bg-blue-50",                                    "dark:bg-blue-900/20"].join(" "),
    rowHover: ["hover:bg-blue-100",                             "dark:hover:bg-blue-900/30"].join(" "),
  },
  "closing-soon": {
    tab:      ["!bg-amber-50 !text-amber-800 border-amber-300", "dark:!bg-amber-900/30 dark:!text-amber-400 dark:border-amber-800"].join(" "),
    table:    ["bg-amber-50",                                   "dark:bg-amber-900/20"].join(" "),
    rowHover: ["hover:bg-amber-100",                            "dark:hover:bg-amber-900/30"].join(" "),
  },
  "all": {
    tab:      ["!bg-slate-50 !text-slate-700 border-slate-300", "dark:!bg-slate-800/50 dark:!text-slate-400 dark:border-slate-700"].join(" "),
    table:    ["bg-slate-50",                                   "dark:bg-slate-800/40"].join(" "),
    rowHover: ["hover:bg-slate-100",                            "dark:hover:bg-slate-800/60"].join(" "),
  },
  "closed": {
    tab:      ["!bg-rose-50 !text-rose-800 border-rose-300",    "dark:!bg-rose-900/30 dark:!text-rose-400 dark:border-rose-800"].join(" "),
    table:    ["bg-rose-50",                                    "dark:bg-rose-900/20"].join(" "),
    rowHover: ["hover:bg-rose-100",                             "dark:hover:bg-rose-900/30"].join(" "),
  },
} as const;

export function JobTable() {
  const { data: jobs, isPending, isError, error } = useJobs();
  // AI users see ParseListingDialog first, non-AI sers see JobCreateSheet directly
  const [parseOpen, setParseOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [initialData, setInitialData] = useState<Partial<FormState> | undefined>(undefined);
  const navigate = useNavigate();
  // visibleColumns from prefs; fall back to defaults while loading.
  const { data: prefs } = usePreferences();
  const visibleColumns = prefs?.visibleColumns ?? DEFAULT_VISIBLE;

  const { widths, startResize } = useColWidths();

  // Fixed columns always shown; user-toggled columns shown when in visibleColumns.
  const visibleCols = COLUMNS.filter(
    (c) => c.fixed || visibleColumns.includes(c.key as ColumnKey)
  );
  const totalWidth = visibleCols.reduce((sum, c) => sum + widths[c.key as ColumnKey], 0);

  // Helper to check column visibility without repeating the scan at every call site.
  const isVisible = (key: ColumnKey) => visibleCols.some((c) => c.key === key);

  const [activeTab, setActiveTab] = useState<"active" | "closing-soon" | "all" | "closed">("active");

  // Pre-filter by tab before column filters are applied
  const tabFilteredJobs = useMemo(() => {
    const all = jobs ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(today.getDate() + 7);

    switch (activeTab) {
      case "active":
        return all.filter((j) =>
          j.status !== JobStatus.Rejected &&
          j.status !== JobStatus.NoResponse &&
          j.status !== JobStatus.Withdrawn
        );
      case "closing-soon":
        return all.filter((j) => {
          if (j.status !== JobStatus.Wishlist || !j.closedAt) return false;
          const d = new Date(j.closedAt);
          return d >= today && d <= in7Days;
        });
      case "closed":
        return all.filter((j) =>
          j.status === JobStatus.Rejected ||
          j.status === JobStatus.NoResponse ||
          j.status === JobStatus.Withdrawn
        );
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
    availableLocations,
    isFiltered,
  } = useJobFilters(tabFilteredJobs);

  if (isPending) return <p>Loading...</p>;
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : "Something went wrong."}</p>;

  // Opens dialog for AI users with auto-fill on; otherwise opens sheet directly
  function handleAddJob() {
    if (hasRole("AiUser") && (prefs?.autoFillEnabled ?? true)) {
      setParseOpen(true);
    } else {
      setInitialData(undefined);
      setSheetOpen(true);
    }
  }

  function handleFill(data: Partial<FormState>) {
    setInitialData(data);
    setSheetOpen(true);
  }

  function handleFillManually() {
    setInitialData(undefined);
    setSheetOpen(true);
  }

  const sortProps = { activeField: sortField, dir: sortDir, onSort: setSort };
  const showControls = activeTab !== "closed";

  return (
    <div className="flex flex-col gap-4">

      {/* Page header */}
      <div className="flex items-center justify-between px-2">
        <h1 className="text-2xl font-bold">Job Applications</h1>
        <Button
          variant="outline"
          className="shadow-xs hover:bg-secondary"
          onClick={handleAddJob}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Job
        </Button>
      </div>
      <hr className="border-t border-border" />

      {/* Toolbar */}
      <div className="flex items-center px-2">
        <ColumnToggle />
      </div>

      {/* Tab nav */}
      <div className={cn("flex flex-col", TAB_STYLES[activeTab].table)}>
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="bg-background p-0 h-auto rounded-none border-b border-border w-full justify-start items-end gap-1">
          {(
            [
              { value: "active", label: "Active" },
              { value: "closing-soon", label: "Closing Soon" },
              { value: "all", label: "All" },
              { value: "closed", label: "Closed" },
            ] as const
          ).map(({ value, label }) => (
            <TabsTrigger
              key={value}
              value={value}
              className={cn(
                // shape & layout
                "rounded-t-md rounded-b-none border border-border",
                "bg-muted text-muted-foreground",
                "px-4 py-1.5 h-auto flex-none -mb-px transition-colors duration-200",
                // active state
                "data-[state=active]:font-medium data-[state=active]:underline data-[state=active]:underline-offset-4",
                "data-[state=active]:border-2 data-[state=active]:border-b-0 data-[state=active]:!shadow-none",
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
        <div className="overflow-x-auto">
        <Table style={{ width: totalWidth, tableLayout: "fixed" }}>
          <colgroup>
            {visibleCols.map((c) => (
              <col key={c.key} style={{ width: widths[c.key as ColumnKey] }} />
            ))}
          </colgroup>
          <TableCaption>
            Showing {filteredJobs.length}
            {isFiltered && ` of ${jobs.length}`} application
            {filteredJobs.length !== 1 ? "s" : ""}
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead className={cn("relative overflow-visible", sortProps.activeField === "company" && "border-b-2 border-primary")}>
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
                  onMouseDown={startResize("company" as ColumnKey)}
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
                  onMouseDown={startResize("role" as ColumnKey)}
                  className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-border select-none"
                />
              </TableHead>
              {isVisible("status") && (
                <SortableHead
                  field="status"
                  label="Status"
                  className="text-center"
                  showControls={showControls}
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
              )}
              {isVisible("priority") && (
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
              )}
              {isVisible("appliedAt") && (
                <SortableHead field="appliedAt" label="Applied At" {...sortProps} />
              )}
              {isVisible("closedAt") && (
                <SortableHead field="closedAt" label="Closed At" {...sortProps} />
              )}
              {isVisible("location") && (
                <TableHead>
                  <FilterPopover
                    label="Location"
                    options={availableLocations}
                    value={filters.location}
                    onChange={(v) => setFilters((f) => ({ ...f, location: v }))}
                  />
                </TableHead>
              )}
              {isVisible("workMode") && (
                <TableHead>
                  <FilterPopover
                    label="Work Mode"
                    options={WORK_MODE_OPTIONS}
                    value={filters.workMode}
                    onChange={(v) => setFilters((f) => ({ ...f, workMode: v }))}
                  />
                </TableHead>
              )}
              {isVisible("salary") && <TableHead><span className="px-1 text-sm text-muted-foreground">Salary</span></TableHead>}
              {isVisible("interviewAt") && (
                <SortableHead field="interviewAt" label="Interview Date" {...sortProps} />
              )}
              {isVisible("jobUrl") && <TableHead><span className="px-1 text-sm text-muted-foreground">Job URL</span></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredJobs.map((job) => (
              <TableRow
                key={job.id}
                onClick={() => navigate(`/jobs/${job.id}`)}
                className={cn("cursor-pointer", TAB_STYLES[activeTab].rowHover)}
              >
                <TableCell className="font-medium overflow-hidden text-ellipsis">{job.company}</TableCell>
                <TableCell className="overflow-hidden text-ellipsis">{job.role}</TableCell>
                {isVisible("status") && (
                  <TableCell className="text-center">
                    <StatusBadge status={job.status} />
                  </TableCell>
                )}
                {isVisible("priority") && (
                  <TableCell className="text-center">
                    <div className="flex justify-center">
                      <PriorityDot priority={job.priority} />
                    </div>
                  </TableCell>
                )}
                {isVisible("appliedAt") && (
                  <TableCell>
                    {job.appliedAt ? new Date(job.appliedAt).toLocaleDateString() : "—"}
                  </TableCell>
                )}
                {isVisible("closedAt") && (
                  <TableCell>
                    {job.closedAt ? new Date(job.closedAt).toLocaleDateString() : "—"}
                  </TableCell>
                )}
                {isVisible("location") && (
                  <TableCell>{job.location ?? "—"}</TableCell>
                )}
                {isVisible("workMode") && (
                  <TableCell>
                    {job.workMode
                      ? formatEnumLabel(job.workMode)
                      : "—"}
                  </TableCell>
                )}
                {isVisible("salary") && (
                  <TableCell>
                    {job.salaryMin != null || job.salaryMax != null
                      ? job.salaryMin != null && job.salaryMax != null && job.salaryMin !== job.salaryMax
                        ? `$${job.salaryMin.toLocaleString()} – $${job.salaryMax.toLocaleString()}`
                        : `$${(job.salaryMin ?? job.salaryMax)!.toLocaleString()}`
                      : "—"}
                  </TableCell>
                )}
                {isVisible("interviewAt") && (
                  <TableCell>
                    {job.interviewAt ? new Date(job.interviewAt).toLocaleDateString() : "—"}
                  </TableCell>
                )}
                {isVisible("jobUrl") && (
                  <TableCell className="overflow-hidden">
                    {job.jobUrl
                      ? <a
                          href={job.jobUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-primary underline underline-offset-2 hover:text-primary/80 truncate block"
                        >
                          {new URL(job.jobUrl).hostname}
                        </a>
                      : "—"}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      )}
      </div>

      <ParseListingDialog
        open={parseOpen}
        onOpenChange={setParseOpen}
        onFill={handleFill}
        onFillManually={handleFillManually}
      />
      <JobCreateSheet open={sheetOpen} onOpenChange={setSheetOpen} initialData={initialData} />
    </div>
  );
}
