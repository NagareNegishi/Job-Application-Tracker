// Shape every column entry must satisfy.
// key is string, entries keep their literal types via `as const` on the array.
export type ColumnDef = {
  key: string;
  label: string;
  defaultWidth: number;
  defaultVisible: boolean;
  fixed: boolean;
};

// Single source of truth for all table columns.
// `as const` keeps key/label/etc as narrow literals instead of widening to string/boolean.
// `satisfies readonly ColumnDef[]` validates each entry against ColumnDef without losing those literals.
export const COLUMNS = [
  { key: "company",       label: "Company",        defaultWidth: 200, defaultVisible: true,  fixed: true  },
  { key: "role",          label: "Role",           defaultWidth: 200, defaultVisible: true,  fixed: true  },
  { key: "status",        label: "Status",         defaultWidth: 110, defaultVisible: true,  fixed: false },
  { key: "priority",      label: "Priority",       defaultWidth: 110, defaultVisible: true,  fixed: false },
  { key: "appliedAt",     label: "Applied At",     defaultWidth: 110, defaultVisible: true,  fixed: false },
  { key: "closedAt",      label: "Closed At",      defaultWidth: 110, defaultVisible: true,  fixed: false },
  { key: "location",      label: "Location",       defaultWidth: 110, defaultVisible: false, fixed: false },
  { key: "workMode",      label: "Work Mode",      defaultWidth: 110, defaultVisible: false, fixed: false },
  { key: "salary",        label: "Salary",         defaultWidth: 130, defaultVisible: false, fixed: false },
  { key: "interviewAt",   label: "Interview Date", defaultWidth: 120, defaultVisible: false, fixed: false },
  { key: "jobUrl",        label: "Job URL",        defaultWidth: 150, defaultVisible: false, fixed: false },
] as const satisfies readonly ColumnDef[];

// Derived union of all valid column keys
export type ColumnKey = typeof COLUMNS[number]["key"];
