// NOTE: Unused — filtering was moved inline into JobTable column headers (FilterPopover).
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JobStatus, Priority } from "@/types/enums";
import type { JobFilters } from "@/hooks/useJobFilters";
import { X } from "lucide-react";

interface JobFilterBarProps {
  filters: JobFilters;
  availableRoles: string[];
  isFiltered: boolean;
  onFilterChange: (filters: JobFilters) => void;
  onClear: () => void;
}

// Sentinel value used in Select to represent "no filter selected"
const ALL = "__all__";

export function JobFilterBar({
  filters,
  availableRoles,
  isFiltered,
  onFilterChange,
  onClear,
}: JobFilterBarProps) {
  function handleChange(key: keyof JobFilters, value: string) {
    onFilterChange({ ...filters, [key]: value === ALL ? "" : value });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">

      <Select
        value={filters.role || ALL}
        onValueChange={(v) => handleChange("role", v)}
      >
        <SelectTrigger size="sm" className="w-40">
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All roles</SelectItem>
          {availableRoles.map((role) => (
            <SelectItem key={role} value={role}>
              {role}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.status || ALL}
        onValueChange={(v) => handleChange("status", v)}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {Object.values(JobStatus).map((s) => (
            <SelectItem key={s} value={s}>
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority || ALL}
        onValueChange={(v) => handleChange("priority", v)}
      >
        <SelectTrigger size="sm" className="w-36">
          <SelectValue placeholder="Priority" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All priorities</SelectItem>
          {Object.values(Priority).map((p) => (
            <SelectItem key={p} value={p}>
              {p}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {isFiltered && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-muted-foreground h-8 px-2"
        >
          <X className="mr-1 size-3.5" />
          Clear
        </Button>
      )}
    </div>
  );
}
