import type { ParsedJobFields } from "@/services/parseService"
import type { FormState } from "@/types/formTypes"

// Parse endpoint returns DateOnly ("YYYY-MM-DD"), which new Date() treats as UTC midnight —
// shifting the date backwards in UTC+ time zones. The 3-arg constructor always uses local time.
// JS Date months are 0-indexed (0 = Jan); DateOnly strings are 1-indexed, hence m - 1.
function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Converts the parse endpoint's response into JobCreateSheet's initial form data.
export function toFormFields(fields: ParsedJobFields): Partial<FormState> {
  return {
    ...fields,
    closedAt: fields.closedAt ? parseDateOnly(fields.closedAt) : undefined,
  }
}
