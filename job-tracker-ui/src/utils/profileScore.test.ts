// Tests for computeProfileScore — verifies each grading strategy, tier boundaries,
// the Work History description cutoff, weight normalization, and rounding.
import { describe, it, expect } from "vitest"
import { computeProfileScore } from "./profileScore"
import type { UserProfile, WorkHistoryEntry } from "@/types/profile"

const emptyProfile: UserProfile = {
  targetRoles: [], skills: [], certifications: [], languages: [],
  workingRights: [], workHistory: [], education: [],
  // Not scored yet — present only to satisfy the UserProfile shape
  workModes: [], contractTypes: [], salaryExpectations: [],
  preferredLocations: [], additionalConditions: "",
}

// n placeholder skill strings — only the count matters to the score.
function skills(n: number): string[] {
  return Array.from({ length: n }, (_, i) => `skill-${i}`)
}

// Work History entries carrying the given descriptions; other fields are valid but irrelevant here.
function history(...descriptions: string[]): WorkHistoryEntry[] {
  return descriptions.map(description => ({
    title: "Dev", company: "Acme",
    fromYear: 2020, fromMonth: null, toYear: 2021, toMonth: null,
    description,
  }))
}

const DESC_COMPLETE = "a".repeat(40)  // exactly at the 40-char cutoff → complete
const DESC_SHORT = "a".repeat(39)     // one below the cutoff → thin

function scoreOf(overrides: Partial<UserProfile>): number {
  return computeProfileScore({ ...emptyProfile, ...overrides }).score
}

describe("computeProfileScore", () => {
  it("scores an empty profile as 0", () => {
    const result = computeProfileScore(emptyProfile)
    expect(result.score).toBe(0)
    expect(result.breakdown.every(b => b.fraction === 0)).toBe(true)
  })

  it("scores a fully-filled profile as 100", () => {
    const full: UserProfile = {
      targetRoles: ["Engineer"],
      skills: skills(5),
      certifications: ["AWS"],
      languages: ["English"],
      workingRights: [{ country: "NZ", status: "Citizen" }],
      workHistory: history(DESC_COMPLETE, DESC_COMPLETE),
      education: [{ institution: "UoA", degree: "BSc", from: 2018, to: 2021 }],
      // Not scored yet, so they don't affect the 100 — see PROFILE_SCORE_CONFIG TODO
      workModes: [], contractTypes: [], salaryExpectations: [],
      preferredLocations: [], additionalConditions: "",
    }
    expect(computeProfileScore(full).score).toBe(100)
  })
})

describe("presence sections", () => {
  // Each presence section earns its full weight from a single entry.
  it("awards full weight for one target role (15)", () => {
    expect(scoreOf({ targetRoles: ["Engineer"] })).toBe(15)
  })
  it("awards full weight for one education entry (10)", () => {
    expect(scoreOf({ education: [{ institution: "UoA", degree: "BSc", from: 2018, to: 2021 }] })).toBe(10)
  })
  it("awards full weight for one working-rights entry (10)", () => {
    expect(scoreOf({ workingRights: [{ country: "NZ", status: "Citizen" }] })).toBe(10)
  })
  it("awards full weight for one language (10)", () => {
    expect(scoreOf({ languages: ["English"] })).toBe(10)
  })
  it("awards the lenient certifications weight (5)", () => {
    expect(scoreOf({ certifications: ["AWS"] })).toBe(5)
  })
})

describe("skills — three tiers over weight 25", () => {
  it("earns nothing with no skills", () => {
    expect(scoreOf({ skills: skills(0) })).toBe(0)
  })
  it("earns one third (8) for 1–2 skills", () => {
    expect(scoreOf({ skills: skills(1) })).toBe(8)  // 25/3 = 8.33 → 8
    expect(scoreOf({ skills: skills(2) })).toBe(8)
  })
  it("earns two thirds (17) for 3–4 skills", () => {
    expect(scoreOf({ skills: skills(3) })).toBe(17)  // 25 * 2/3 = 16.67 → 17
    expect(scoreOf({ skills: skills(4) })).toBe(17)
  })
  it("earns full weight (25) for 5+ skills", () => {
    expect(scoreOf({ skills: skills(5) })).toBe(25)
    expect(scoreOf({ skills: skills(12) })).toBe(25)
  })
})

describe("work history — quality and count over weight 25", () => {
  it("earns the present floor (10) for an entry with a thin description", () => {
    expect(scoreOf({ workHistory: history(DESC_SHORT) })).toBe(10)   // 0.4 * 25
    expect(scoreOf({ workHistory: history("") })).toBe(10)
  })
  it("treats a whitespace-only description as thin", () => {
    expect(scoreOf({ workHistory: history("   ") })).toBe(10)
  })
  it("earns 0.8 (20) for one complete entry", () => {
    expect(scoreOf({ workHistory: history(DESC_COMPLETE) })).toBe(20)
  })
  it("counts a description exactly at the 40-char cutoff as complete", () => {
    // DESC_SHORT (39) → floor; DESC_COMPLETE (40) → complete, confirming the boundary is inclusive.
    expect(scoreOf({ workHistory: history(DESC_SHORT) })).toBe(10)
    expect(scoreOf({ workHistory: history(DESC_COMPLETE) })).toBe(20)
  })
  it("earns full weight (25) for two complete entries", () => {
    expect(scoreOf({ workHistory: history(DESC_COMPLETE, DESC_COMPLETE) })).toBe(25)
  })
  it("earns 0.8 (20) when only one of several entries is complete", () => {
    expect(scoreOf({ workHistory: history(DESC_COMPLETE, "") })).toBe(20)
  })
})

describe("normalization and breakdown", () => {
  it("normalizes to the total weight, not a hard-coded 100", () => {
    // Skills full (25) with everything else empty → 25 / 100 total → 25.
    expect(scoreOf({ skills: skills(5) })).toBe(25)
  })
  it("returns a per-section breakdown that sums (rounded) to the score", () => {
    const result = computeProfileScore({ ...emptyProfile, skills: skills(5), languages: ["English"] })
    expect(result.score).toBe(35)  // 25 + 10
    const skillsRow = result.breakdown.find(b => b.section === "skills")
    expect(skillsRow).toMatchObject({ weight: 25, fraction: 1, points: 25 })
  })
})
