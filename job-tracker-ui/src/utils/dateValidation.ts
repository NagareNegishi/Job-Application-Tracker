// Validates that a from→to date range is chronologically possible.
// Granularity is determined by the overload used; month ordering is only checked
// when both months are provided, and day ordering only when both days are provided.
// toYear === null or 0 (no end date) always returns null — no range to check.
// The caller is responsible for ensuring consistent granularity between from and to.

export function checkDateOrder(fromYear: number, toYear: number | null): string | null
export function checkDateOrder(fromYear: number, toYear: number | null, fromMonth: number | null, toMonth: number | null): string | null
export function checkDateOrder(fromYear: number, toYear: number | null, fromMonth: number | null, toMonth: number | null, fromDay: number | null, toDay: number | null): string | null
export function checkDateOrder(
  fromYear: number,
  toYear: number | null,
  fromMonth?: number | null,
  toMonth?: number | null,
  fromDay?: number | null,
  toDay?: number | null,
): string | null {
  if (!toYear) return null
  if (toYear < fromYear) return "End year must be after start year."
  if (toYear === fromYear && fromMonth != null && toMonth != null) {
    if (toMonth < fromMonth) return "End month must be after start month."
    if (toMonth === fromMonth && fromDay != null && toDay != null) {
      if (toDay < fromDay) return "End day must be after start day."
    }
  }
  return null
}
