// Tests for the per-section profile save-validators and the sectionInvalid dispatcher.
// dateValidation.ts's own boundary cases are covered in dateValidation.test.ts —
// here we only check that workHistoryInvalid/educationInvalid wire into it correctly.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  salaryExpectationsInvalid,
  workHistoryInvalid,
  educationInvalid,
  preferredLocationsInvalid,
  workingRightsInvalid,
  languagesInvalid,
  additionalConditionsInvalid,
  sectionInvalid,
} from "./profileValidation"
import type {
  UserProfile, SalaryExpectation, WorkHistoryEntry, EducationEntry,
  PreferredLocationEntry, WorkingRightEntry, LanguageEntry,
} from "@/types/profile"

const emptyProfile: UserProfile = {
  targetRoles: [], skills: [], certifications: [], languages: [],
  workingRights: [], workHistory: [], education: [],
  workModes: [], contractTypes: [], salaryExpectations: [],
  preferredLocations: [], additionalConditions: "",
}

afterEach(() => {
  vi.useRealTimers()
})

describe("salaryExpectationsInvalid", () => {
  it("allows an empty list", () => {
    expect(salaryExpectationsInvalid([])).toBe(false)
  })

  it("allows a valid entry", () => {
    const entries: SalaryExpectation[] = [{ minAmount: 100000, currency: "NZD", period: "Annual" }]
    expect(salaryExpectationsInvalid(entries)).toBe(false)
  })

  it("rejects a non-positive amount", () => {
    const entries: SalaryExpectation[] = [{ minAmount: 0, currency: "NZD", period: "Annual" }]
    expect(salaryExpectationsInvalid(entries)).toBe(true)
  })

  it("rejects a currency that isn't 3 uppercase letters", () => {
    const entries: SalaryExpectation[] = [{ minAmount: 1, currency: "nzd", period: "Annual" }]
    expect(salaryExpectationsInvalid(entries)).toBe(true)
  })

  it("rejects duplicate currencies across entries", () => {
    const entries: SalaryExpectation[] = [
      { minAmount: 1, currency: "NZD", period: "Annual" },
      { minAmount: 2, currency: "NZD", period: "Monthly" },
    ]
    expect(salaryExpectationsInvalid(entries)).toBe(true)
  })

  it("allows distinct currencies across entries", () => {
    const entries: SalaryExpectation[] = [
      { minAmount: 1, currency: "NZD", period: "Annual" },
      { minAmount: 2, currency: "USD", period: "Annual" },
    ]
    expect(salaryExpectationsInvalid(entries)).toBe(false)
  })
})

function workEntry(overrides: Partial<WorkHistoryEntry> = {}): WorkHistoryEntry {
  return {
    title: "Dev", company: "Acme",
    fromYear: 2020, fromMonth: null, toYear: 2021, toMonth: null,
    description: "", ...overrides,
  }
}

describe("workHistoryInvalid", () => {
  // Pins "now" so the not-future check doesn't depend on when the suite runs.
  beforeEach(() => {
    vi.setSystemTime(new Date(2024, 5, 15))
  })

  it("allows an empty list", () => {
    expect(workHistoryInvalid([])).toBe(false)
  })

  it("allows a complete, valid entry", () => {
    expect(workHistoryInvalid([workEntry()])).toBe(false)
  })

  it("rejects a missing title or company", () => {
    expect(workHistoryInvalid([workEntry({ title: "" })])).toBe(true)
    expect(workHistoryInvalid([workEntry({ title: "  " })])).toBe(true)
    expect(workHistoryInvalid([workEntry({ company: "" })])).toBe(true)
  })

  it("rejects fromYear === 0 (not yet selected)", () => {
    expect(workHistoryInvalid([workEntry({ fromYear: 0 })])).toBe(true)
  })

  it("rejects toYear === 0 (current-role box unchecked but no end year)", () => {
    expect(workHistoryInvalid([workEntry({ toYear: 0 })])).toBe(true)
  })

  it("allows toYear === null (currently working)", () => {
    expect(workHistoryInvalid([workEntry({ toYear: null })])).toBe(false)
  })

  it("rejects a future fromYear", () => {
    expect(workHistoryInvalid([workEntry({ fromYear: 2099 })])).toBe(true)
  })

  it("rejects an end date before the start date", () => {
    expect(workHistoryInvalid([workEntry({ fromYear: 2021, toYear: 2020 })])).toBe(true)
  })

  it("flags invalid if any entry in the list is invalid", () => {
    expect(workHistoryInvalid([workEntry(), workEntry({ title: "" })])).toBe(true)
  })
})

function eduEntry(overrides: Partial<EducationEntry> = {}): EducationEntry {
  return { institution: "UoA", degree: "BSc", from: 2018, to: 2021, ...overrides }
}

describe("educationInvalid", () => {
  it("allows an empty list", () => {
    expect(educationInvalid([])).toBe(false)
  })

  it("allows a complete, valid entry", () => {
    expect(educationInvalid([eduEntry()])).toBe(false)
  })

  it("rejects a missing institution or degree", () => {
    expect(educationInvalid([eduEntry({ institution: "" })])).toBe(true)
    expect(educationInvalid([eduEntry({ degree: "  " })])).toBe(true)
  })

  it("rejects from === 0 or to === 0", () => {
    expect(educationInvalid([eduEntry({ from: 0 })])).toBe(true)
    expect(educationInvalid([eduEntry({ to: 0 })])).toBe(true)
  })

  it("allows to === null (ongoing)", () => {
    expect(educationInvalid([eduEntry({ to: null })])).toBe(false)
  })

  it("rejects an end year before the start year", () => {
    expect(educationInvalid([eduEntry({ from: 2021, to: 2020 })])).toBe(true)
  })

  it("does not apply a not-future check (unlike work history)", () => {
    expect(educationInvalid([eduEntry({ from: 2099, to: null })])).toBe(false)
  })
})

describe("preferredLocationsInvalid", () => {
  it("allows an empty list", () => {
    expect(preferredLocationsInvalid([])).toBe(false)
  })

  it("rejects an entry with no country", () => {
    const entries: PreferredLocationEntry[] = [{ country: "", areas: [] }]
    expect(preferredLocationsInvalid(entries)).toBe(true)
  })

  it("rejects duplicate countries (case-insensitive, trimmed)", () => {
    const entries: PreferredLocationEntry[] = [
      { country: "NZ", areas: [] },
      { country: " nz ", areas: ["Auckland"] },
    ]
    expect(preferredLocationsInvalid(entries)).toBe(true)
  })

  it("allows distinct countries, areas optional", () => {
    const entries: PreferredLocationEntry[] = [{ country: "NZ", areas: [] }, { country: "AU", areas: [] }]
    expect(preferredLocationsInvalid(entries)).toBe(false)
  })
})

describe("workingRightsInvalid", () => {
  it("rejects an entry with no country", () => {
    const entries: WorkingRightEntry[] = [{ country: "", status: "Citizen" }]
    expect(workingRightsInvalid(entries)).toBe(true)
  })

  it("rejects duplicate countries", () => {
    const entries: WorkingRightEntry[] = [
      { country: "NZ", status: "Citizen" },
      { country: "NZ", status: "WorkVisa" },
    ]
    expect(workingRightsInvalid(entries)).toBe(true)
  })

  it("allows distinct countries", () => {
    const entries: WorkingRightEntry[] = [{ country: "NZ", status: "Citizen" }, { country: "AU", status: "Citizen" }]
    expect(workingRightsInvalid(entries)).toBe(false)
  })
})

describe("languagesInvalid", () => {
  it("rejects an entry with no language name", () => {
    const entries: LanguageEntry[] = [{ language: "", fluency: "NativeOrBilingual" }]
    expect(languagesInvalid(entries)).toBe(true)
  })

  it("rejects duplicate languages", () => {
    const entries: LanguageEntry[] = [
      { language: "English", fluency: "NativeOrBilingual" },
      { language: "english", fluency: "Elementary" },
    ]
    expect(languagesInvalid(entries)).toBe(true)
  })

  it("allows distinct languages", () => {
    const entries: LanguageEntry[] = [
      { language: "English", fluency: "NativeOrBilingual" },
      { language: "French", fluency: "Elementary" },
    ]
    expect(languagesInvalid(entries)).toBe(false)
  })
})

describe("additionalConditionsInvalid", () => {
  it("allows plain text", () => {
    expect(additionalConditionsInvalid("Open to relocation")).toBe(false)
  })

  it("rejects text containing an HTML tag", () => {
    expect(additionalConditionsInvalid("<script>alert(1)</script>")).toBe(true)
  })
})

describe("sectionInvalid", () => {
  it("dispatches to the matching validator for each known key", () => {
    const invalidProfile: UserProfile = {
      ...emptyProfile,
      salaryExpectations: [{ minAmount: 0, currency: "NZD", period: "Annual" }],
    }
    expect(sectionInvalid("salaryExpectations", invalidProfile)).toBe(true)
    expect(sectionInvalid("salaryExpectations", emptyProfile)).toBe(false)
  })

  it("returns false for fields without a validation rule", () => {
    expect(sectionInvalid("targetRoles", emptyProfile)).toBe(false)
    expect(sectionInvalid("skills", emptyProfile)).toBe(false)
  })
})

