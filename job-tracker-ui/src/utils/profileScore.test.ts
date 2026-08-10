// Tests for computeProfileScore — verifies each grading strategy, tier boundaries,
// the Work History description cutoff, weight normalization, and rounding.
// Total weight is 108 (100 background/experience + 4 preference fields at 2 each), so
// normalized values are earned-points / 108 * 100, rounded.
import { describe, it, expect } from "vitest"
import { computeProfileScore, getProfileHint } from "./profileScore"
import { LanguageFluency, ContractType, type UserProfile, type WorkHistoryEntry } from "@/types/profile"
import { WorkMode } from "@/types/enums"

const emptyProfile: UserProfile = {
  targetRoles: [], skills: [], certifications: [], languages: [],
  workingRights: [], workHistory: [], education: [],
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
      languages: [{ language: "English", fluency: LanguageFluency.NativeOrBilingual }],
      workingRights: [{ country: "NZ", status: "Citizen" }],
      workHistory: history(DESC_COMPLETE, DESC_COMPLETE),
      education: [{ institution: "UoA", degree: "BSc", from: 2018, to: 2021 }],
      // Preference fields must be filled too — they carry weight now, so 100 needs all scored sections.
      workModes: [WorkMode.Remote],
      contractTypes: [ContractType.FullTimePermanent],
      salaryExpectations: [{ minAmount: 100000, currency: "NZD", period: "Annual" }],
      preferredLocations: [{ country: "NZ", areas: [] }],
      additionalConditions: "",
    }
    expect(computeProfileScore(full).score).toBe(100)
  })
})

describe("presence sections", () => {
  // Each presence section earns its full weight from a single entry; values are normalized over 108.
  it("awards full weight for one target role (15 → 14)", () => {
    expect(scoreOf({ targetRoles: ["Engineer"] })).toBe(14)  // 15/108 → 13.9
  })
  it("awards full weight for one education entry (10 → 9)", () => {
    expect(scoreOf({ education: [{ institution: "UoA", degree: "BSc", from: 2018, to: 2021 }] })).toBe(9)
  })
  it("awards full weight for one working-rights entry (10 → 9)", () => {
    expect(scoreOf({ workingRights: [{ country: "NZ", status: "Citizen" }] })).toBe(9)
  })
  it("awards full weight for one language (10 → 9)", () => {
    expect(scoreOf({ languages: [{ language: "English", fluency: LanguageFluency.NativeOrBilingual }] })).toBe(9)
  })
  it("awards the lenient certifications weight (5 → 5)", () => {
    expect(scoreOf({ certifications: ["AWS"] })).toBe(5)  // 5/108 → 4.6 → 5
  })
})

describe("preference sections — minimal weight (2 each), normalized over 108", () => {
  it("awards the minimal weight for one work mode", () => {
    expect(scoreOf({ workModes: [WorkMode.Remote] })).toBe(2)  // 2/108 → 1.9 → 2
  })
  it("awards the minimal weight for one contract type", () => {
    expect(scoreOf({ contractTypes: [ContractType.FullTimePermanent] })).toBe(2)
  })
  it("awards the minimal weight for one salary expectation", () => {
    expect(scoreOf({ salaryExpectations: [{ minAmount: 100000, currency: "NZD", period: "Annual" }] })).toBe(2)
  })
  it("awards the minimal weight for one preferred location", () => {
    expect(scoreOf({ preferredLocations: [{ country: "NZ", areas: [] }] })).toBe(2)
  })
  it("does not score additionalConditions — free text never moves the score", () => {
    expect(scoreOf({ additionalConditions: "Open to relocation for the right role" })).toBe(0)
  })
})

describe("skills — three tiers over weight 25", () => {
  it("earns nothing with no skills", () => {
    expect(scoreOf({ skills: skills(0) })).toBe(0)
  })
  it("earns one third (8) for 1–2 skills", () => {
    expect(scoreOf({ skills: skills(1) })).toBe(8)  // 25/3 = 8.33 → /108 → 7.7 → 8
    expect(scoreOf({ skills: skills(2) })).toBe(8)
  })
  it("earns two thirds (15) for 3–4 skills", () => {
    expect(scoreOf({ skills: skills(3) })).toBe(15)  // 25*2/3 = 16.67 → /108 → 15.4 → 15
    expect(scoreOf({ skills: skills(4) })).toBe(15)
  })
  it("earns full weight (23) for 5+ skills", () => {
    expect(scoreOf({ skills: skills(5) })).toBe(23)  // 25/108 → 23.1 → 23
    expect(scoreOf({ skills: skills(12) })).toBe(23)
  })
})

describe("work history — quality and count over weight 25", () => {
  it("earns the present floor (9) for an entry with a thin description", () => {
    expect(scoreOf({ workHistory: history(DESC_SHORT) })).toBe(9)   // 0.4*25=10 → /108 → 9.3 → 9
    expect(scoreOf({ workHistory: history("") })).toBe(9)
  })
  it("treats a whitespace-only description as thin", () => {
    expect(scoreOf({ workHistory: history("   ") })).toBe(9)
  })
  it("earns 0.8 (19) for one complete entry", () => {
    expect(scoreOf({ workHistory: history(DESC_COMPLETE) })).toBe(19)  // 0.8*25=20 → /108 → 18.5 → 19
  })
  it("counts a description exactly at the 40-char cutoff as complete", () => {
    // DESC_SHORT (39) → floor; DESC_COMPLETE (40) → complete, confirming the boundary is inclusive.
    expect(scoreOf({ workHistory: history(DESC_SHORT) })).toBe(9)
    expect(scoreOf({ workHistory: history(DESC_COMPLETE) })).toBe(19)
  })
  it("earns full weight (23) for two complete entries", () => {
    expect(scoreOf({ workHistory: history(DESC_COMPLETE, DESC_COMPLETE) })).toBe(23)  // 25/108 → 23
  })
  it("earns 0.8 (19) when only one of several entries is complete", () => {
    expect(scoreOf({ workHistory: history(DESC_COMPLETE, "") })).toBe(19)
  })
})

describe("normalization and breakdown", () => {
  it("normalizes to the total weight (108), not a hard-coded 100", () => {
    // Skills full (25) with everything else empty → 25 / 108 total → 23.
    expect(scoreOf({ skills: skills(5) })).toBe(23)
  })
  it("returns a per-section breakdown whose points feed the normalized score", () => {
    const result = computeProfileScore({ ...emptyProfile, skills: skills(5), languages: [{ language: "English", fluency: LanguageFluency.NativeOrBilingual }] })
    expect(result.score).toBe(32)  // (25 + 10) / 108 → 32.4 → 32
    const skillsRow = result.breakdown.find(b => b.section === "skills")
    expect(skillsRow).toMatchObject({ weight: 25, fraction: 1, points: 25 })  // points is pre-normalization
  })
})

describe("getProfileHint", () => {
  it("names all three core sections for an empty profile", () => {
    const hint = getProfileHint(computeProfileScore(emptyProfile))
    expect(hint).toBe("Add more detail to Work History (volunteer work or projects count too), Skills, and Desired Roles to strengthen your profile.")
  })

  it("returns undefined once the score clears the threshold", () => {
    const full: UserProfile = {
      ...emptyProfile,
      targetRoles: ["Engineer"], skills: skills(5), workHistory: history(DESC_COMPLETE, DESC_COMPLETE),
      certifications: ["AWS"], languages: [{ language: "English", fluency: LanguageFluency.NativeOrBilingual }],
      workingRights: [{ country: "NZ", status: "Citizen" }],
      education: [{ institution: "UoA", degree: "BSc", from: 2018, to: 2021 }],
    }
    expect(getProfileHint(computeProfileScore(full))).toBeUndefined()
  })

  it("stays undefined below the threshold if only low-weight fields are missing", () => {
    // Core sections (workHistory/skills/targetRoles) full; only the 2-weight preference fields are empty.
    const result = computeProfileScore({
      ...emptyProfile,
      targetRoles: ["Engineer"], skills: skills(5), workHistory: history(DESC_COMPLETE, DESC_COMPLETE),
    })
    expect(result.score).toBeLessThan(80)
    expect(getProfileHint(result)).toBeUndefined()
  })

  it("names only the weak core section when the others are complete", () => {
    const result = computeProfileScore({
      ...emptyProfile,
      targetRoles: ["Engineer"], workHistory: history(DESC_COMPLETE, DESC_COMPLETE),
      skills: skills(1),  // weak — only 1/3 credit
    })
    expect(getProfileHint(result)).toBe("Add more detail to Skills to strengthen your profile.")
  })
})
