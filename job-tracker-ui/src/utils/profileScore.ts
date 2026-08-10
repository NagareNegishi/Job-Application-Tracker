// Profile completeness score (0–100) — a pure, client-side gauge of how much useful context
// a profile gives the AI analysis. Config-driven: every weight and threshold lives in
// PROFILE_SCORE_CONFIG below, so tuning the score never touches the grading logic.
import type { UserProfile, WorkHistoryEntry } from "@/types/profile"

// A single credit step for count-based grading: reaching `min` items earns `credit` (0–1) of the weight.
type Tier = { min: number; credit: number }

// One tier is satisfied when the count meets its `min`; tiers are checked high→low so the top match wins.
function gradeTiers(count: number, tiers: Tier[]): number {
  for (const t of tiers) if (count >= t.min) return t.credit
  return 0
}

// Grading strategies. Each section names one; the shape carries only the thresholds that strategy needs.
type PresenceRule = { weight: number; strategy: "presence" }
type CountRule = { weight: number; strategy: "count"; tiers: Tier[] }
type WorkHistoryRule = {
  weight: number
  strategy: "workHistory"
  descriptionMinChars: number   // a description this long or longer marks an entry "complete"
  presentCredit: number         // floor credit when entries exist but none is complete
  completeTiers: Tier[]         // credit by number of complete entries
}
type SectionRule = PresenceRule | CountRule | WorkHistoryRule

// Weights need NOT sum to 100 — the score normalizes by their total, so any weight can be retuned alone.
const PROFILE_SCORE_CONFIG = {
  workHistory: {
    weight: 25,
    strategy: "workHistory",
    descriptionMinChars: 40,
    presentCredit: 0.4,
    completeTiers: [{ min: 2, credit: 1 }, { min: 1, credit: 0.8 }],
  },
  // Skills are easy to fill, so a heftier weight gets three tiers to avoid a big all-or-nothing jump.
  skills: {
    weight: 25,
    strategy: "count",
    tiers: [{ min: 5, credit: 1 }, { min: 3, credit: 2 / 3 }, { min: 1, credit: 1 / 3 }],
  },
  targetRoles: { weight: 15, strategy: "presence" },
  education: { weight: 10, strategy: "presence" },
  workingRights: { weight: 10, strategy: "presence" },
  languages: { weight: 10, strategy: "presence" },
  // Certifications are genuinely optional in tech, so a low weight keeps an empty list from over-penalizing.
  certifications: { weight: 5, strategy: "presence" },
  // Preference fields: minimal weight — useful AI context, but weak signals of profile maturity.
  workModes: { weight: 2, strategy: "presence" },
  contractTypes: { weight: 2, strategy: "presence" },
  salaryExpectations: { weight: 2, strategy: "presence" },
  preferredLocations: { weight: 2, strategy: "presence" },
  // `additionalConditions` deliberately unscored (optional free-text) — hence `Partial`, not exhaustive.
} satisfies Partial<Record<keyof UserProfile, SectionRule>>

type SectionKey = keyof typeof PROFILE_SCORE_CONFIG

// Credit fraction (0–1) for the Work History section: floor for any entries, more for complete ones.
function gradeWorkHistory(entries: WorkHistoryEntry[], rule: WorkHistoryRule): number {
  if (entries.length === 0) return 0
  const complete = entries.filter(
    e => (e.description ?? "").trim().length >= rule.descriptionMinChars,
  ).length
  return Math.max(rule.presentCredit, gradeTiers(complete, rule.completeTiers))
}

// Per-section detail — exposed so a meter can show the breakdown and future hints can target weak sections.
export type ProfileScoreBreakdown = {
  section: SectionKey
  weight: number
  fraction: number   // credit earned, 0–1
  points: number     // weight × fraction
}

export type ProfileScoreResult = {
  score: number      // 0–100, rounded
  breakdown: ProfileScoreBreakdown[]
}

// Highest-weight sections — the only ones worth naming in a low-score hint. Labels match each
// section's on-page title. Low-weight "conditions" fields are deliberately excluded.
const HINT_LABELS: Partial<Record<SectionKey, string>> = {
  workHistory: "Work History (volunteer work or projects count too)",
  skills: "Skills",
  targetRoles: "Desired Roles",
}

const HINT_SCORE_THRESHOLD = 80

/** User-facing nudge for a low-scoring profile — names only the highest-weight sections still incomplete. */
export function getProfileHint({ score, breakdown }: ProfileScoreResult): string | undefined {
  if (score >= HINT_SCORE_THRESHOLD) return undefined

  const weak = breakdown
    .filter(b => b.fraction < 1 && b.section in HINT_LABELS)
    .map(b => HINT_LABELS[b.section]!)

  if (weak.length === 0) return undefined

  const list = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(weak)
  return `Add more detail to ${list} to strengthen your profile.`
}

/** Computes a 0–100 completeness score for a profile, plus a per-section breakdown. Pure — no side effects. */
export function computeProfileScore(profile: UserProfile): ProfileScoreResult {
  const breakdown = (Object.keys(PROFILE_SCORE_CONFIG) as SectionKey[]).map<ProfileScoreBreakdown>(section => {
    const rule = PROFILE_SCORE_CONFIG[section]
    const value = profile[section] ?? []

    let fraction: number
    switch (rule.strategy) {
      case "presence":
        fraction = value.length >= 1 ? 1 : 0
        break
      case "count":
        fraction = gradeTiers(value.length, rule.tiers)
        break
      case "workHistory":
        fraction = gradeWorkHistory(value as WorkHistoryEntry[], rule)
        break
    }

    return { section, weight: rule.weight, fraction, points: rule.weight * fraction }
  })

  const totalWeight = breakdown.reduce((sum, b) => sum + b.weight, 0)
  const earned = breakdown.reduce((sum, b) => sum + b.points, 0)
  const score = totalWeight === 0 ? 0 : Math.round((earned / totalWeight) * 100)

  return { score, breakdown }
}
