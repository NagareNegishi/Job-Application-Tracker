import { useMemo, useState } from "react";
import { Priority, JobStatus, WorkMode } from "@/types/enums";
import type { Job } from "@/types/job";

export type SortField =
  | "company"
  | "status"
  | "priority"
  | "appliedAt"
  | "closedAt"
  | "interviewAt";

export type SortDir = "asc" | "desc";

export interface JobFilters {
  role: string;
  status: JobStatus | "";
  priority: Priority | "";
  location: string;
  workMode: WorkMode | "";
}

// Logical sort order for status and priority (not alphabetical)
const STATUS_ORDER: Record<string, number> = {
  Wishlist: 0,
  Applied: 1,
  Screening: 2,
  Interview: 3,
  Offered: 4,
  Rejected: 5,
};

const PRIORITY_ORDER: Record<string, number> = {
  Low: 0,
  Medium: 1,
  High: 2,
  Urgent: 3,
};

const DEFAULT_FILTERS: JobFilters = { role: "", status: "", priority: "", location: "", workMode: "" };

export function useJobFilters(jobs: Job[]) {
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS);

  // Toggle direction if same field clicked, otherwise switch to new field asc
  function setSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  // Unique roles derived from current data for the role filter dropdown
  const availableRoles = useMemo(
    () => [...new Set(jobs.map((j) => j.role).filter(Boolean))].sort(),
    [jobs]
  );

  const availableLocations = useMemo(
    () => [...new Set(jobs.map((j) => j.location).filter(Boolean))].sort(),
    [jobs]
  );

  // Apply filters then sort — recomputes only when inputs change
  const filteredJobs = useMemo(() => {
    let result = jobs;

    if (filters.role) result = result.filter((j) => j.role === filters.role);
    if (filters.status) result = result.filter((j) => j.status === filters.status);
    if (filters.priority) result = result.filter((j) => j.priority === filters.priority);
    if (filters.location) result = result.filter((j) => j.location === filters.location);
    if (filters.workMode) result = result.filter((j) => j.workMode === filters.workMode);

    if (!sortField) return result;

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "company":
          cmp = a.company.localeCompare(b.company);
          break;
        case "status":
          cmp = (STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0);
          break;
        case "priority":
          cmp = (PRIORITY_ORDER[a.priority] ?? 0) - (PRIORITY_ORDER[b.priority] ?? 0);
          break;
        case "appliedAt":
          cmp = (a.appliedAt ?? "").localeCompare(b.appliedAt ?? "");
          break;
        case "closedAt":
          cmp = (a.closedAt ?? "").localeCompare(b.closedAt ?? "");
          break;
        case "interviewAt":
          cmp = (a.interviewAt ?? "").localeCompare(b.interviewAt ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [jobs, filters, sortField, sortDir]);

  const isFiltered =
    filters.role !== "" || filters.status !== "" || filters.priority !== "" ||
    filters.location !== "" || filters.workMode !== "";

  return {
    filteredJobs,
    sortField,
    sortDir,
    setSort,
    filters,
    setFilters,
    clearFilters,
    availableRoles,
    availableLocations,
    isFiltered,
  };
}
