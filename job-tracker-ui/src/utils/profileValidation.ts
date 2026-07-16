// Per-section save validation for the profile page — used by each section's Save
// button (saveBlocked) and by the page-level "Save all" to know if any open section is invalid.
import type {
  UserProfile,
  SalaryExpectation,
  WorkHistoryEntry,
  EducationEntry,
  PreferredLocationEntry,
  WorkingRightEntry,
} from "@/types/profile"
import { checkDateOrder, checkNotFuture } from "@/utils/dateValidation"

// Free text must not contain HTML — mirrors the backend's rejection rule.
export const HTML_PATTERN = /<[a-zA-Z/]/

/** Salary is optional (null), but once present needs a positive amount and a 3-letter currency code. */
export function salaryExpectationInvalid(value: SalaryExpectation | null): boolean {
  return value !== null && (value.minAmount <= 0 || !/^[A-Z]{3}$/.test(value.currency))
}

/**
 * An entry blocks saving when a required field is missing or its dates fail
 * the not-future/ordering checks. fromYear === 0: no start year chosen.
 * toYear === 0: "current role" unchecked but no end year chosen.
 */
export function workHistoryInvalid(entries: WorkHistoryEntry[]): boolean {
  return entries.some(e =>
    !e.title.trim() || !e.company.trim() || e.fromYear === 0 || e.toYear === 0 ||
    (checkNotFuture(e.fromYear, e.fromMonth)
      ?? checkNotFuture(e.toYear, e.toMonth)
      ?? checkDateOrder(e.fromYear, e.toYear, e.fromMonth, e.toMonth)) !== null
  )
}

/** Same shape as work history but year-only dates and no future check (backend rule matches). */
export function educationInvalid(entries: EducationEntry[]): boolean {
  return entries.some(e =>
    !e.institution.trim() || !e.degree.trim() || e.from === 0 || e.to === 0 ||
    checkDateOrder(e.from, e.to) !== null
  )
}

/** Every location entry needs a country; areas are optional (empty = anywhere in country). */
export function preferredLocationsInvalid(entries: PreferredLocationEntry[]): boolean {
  return entries.some(e => !e.country)
}

/** Every working-right entry needs a country. */
export function workingRightsInvalid(entries: WorkingRightEntry[]): boolean {
  return entries.some(e => !e.country)
}

export function additionalConditionsInvalid(text: string): boolean {
  return HTML_PATTERN.test(text)
}

/** Dispatcher for page-level checks ("Save all"); fields without validation rules are always valid. */
export function sectionInvalid(key: keyof UserProfile, form: UserProfile): boolean {
  switch (key) {
    case "salaryExpectation": return salaryExpectationInvalid(form.salaryExpectation)
    case "workHistory": return workHistoryInvalid(form.workHistory)
    case "education": return educationInvalid(form.education)
    case "preferredLocations": return preferredLocationsInvalid(form.preferredLocations)
    case "workingRights": return workingRightsInvalid(form.workingRights)
    case "additionalConditions": return additionalConditionsInvalid(form.additionalConditions)
    default: return false
  }
}
