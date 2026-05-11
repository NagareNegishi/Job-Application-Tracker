// Shape every column entry must satisfy.
// key is string here — entries keep their literal types via `as const` on the array.
export type ColumnDef = {
  key: string;
  label: string;
  defaultWidth: number;
  defaultVisible: boolean;
  fixed: boolean;
};
