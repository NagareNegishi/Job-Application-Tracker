// Tests for isProfileReady and gateTooltipFor — mirrors AnalysisController's gate,
// see the "keep both in sync" comment in profileReady.ts.
import { describe, it, expect } from "vitest"
import { isProfileReady, gateTooltipFor } from "./profileReady"
import type { UserProfile } from "@/types/profile"

const emptyProfile: UserProfile = {
  targetRoles: [], skills: [], certifications: [], languages: [],
  workingRights: [], workHistory: [], education: [],
  workModes: [], contractTypes: [], salaryExpectations: [],
  preferredLocations: [], additionalConditions: "",
}

const readyProfile: UserProfile = {
  ...emptyProfile,
  targetRoles: ["Engineer"],
  skills: ["React"],
  workingRights: [{ country: "NZ", status: "Citizen" }],
  workHistory: [{ title: "Dev", company: "Acme", fromYear: 2020, fromMonth: null, toYear: 2021, toMonth: null, description: "" }],
}

describe("isProfileReady", () => {
  it("returns false for null or undefined", () => {
    expect(isProfileReady(null)).toBe(false)
    expect(isProfileReady(undefined)).toBe(false)
  })

  it("returns false for an empty profile", () => {
    expect(isProfileReady(emptyProfile)).toBe(false)
  })

  it("returns false when the one-of-three group (certs/history/education) is entirely empty", () => {
    expect(isProfileReady({ ...readyProfile, workHistory: [] })).toBe(false)
  })

  it("returns true when certifications alone satisfy the one-of-three group", () => {
    expect(isProfileReady({ ...readyProfile, workHistory: [], certifications: ["AWS"] })).toBe(true)
  })

  it("returns true when education alone satisfies the one-of-three group", () => {
    expect(isProfileReady({
      ...readyProfile, workHistory: [],
      education: [{ institution: "UoA", degree: "BSc", from: 2018, to: 2021 }],
    })).toBe(true)
  })

  it("returns true when all independent fields plus one shared field are filled", () => {
    expect(isProfileReady(readyProfile)).toBe(true)
  })

  it("returns false when any independently-required field is missing", () => {
    expect(isProfileReady({ ...readyProfile, targetRoles: [] })).toBe(false)
    expect(isProfileReady({ ...readyProfile, skills: [] })).toBe(false)
    expect(isProfileReady({ ...readyProfile, workingRights: [] })).toBe(false)
  })
})

describe("gateTooltipFor", () => {
  it("returns the required tooltip for an empty independent field", () => {
    expect(gateTooltipFor(emptyProfile, "targetRoles")).toBe("Required for AI analysis")
  })

  it("returns undefined for a filled independent field", () => {
    expect(gateTooltipFor(readyProfile, "targetRoles")).toBeUndefined()
  })

  it("returns the one-of tooltip for a one-of field when the whole group is empty", () => {
    expect(gateTooltipFor(emptyProfile, "workHistory")).toBe(
      "One of Work History, Education, or Certifications is required for AI analysis"
    )
  })

  it("returns undefined for a one-of field when a different field in the group is filled", () => {
    // certifications carries the group, workHistory itself is still empty
    const profile = { ...emptyProfile, certifications: ["AWS"] }
    expect(gateTooltipFor(profile, "workHistory")).toBeUndefined()
    expect(gateTooltipFor(profile, "education")).toBeUndefined()
    expect(gateTooltipFor(profile, "certifications")).toBeUndefined()
  })
})
