import type { UserProfile } from "@/types/profile"

// Mirrors AnalysisController.GetGatedProfileAsync on the backend — keep both in sync.
export function isProfileReady(profile: UserProfile | null | undefined): boolean {
  if (!profile) return false
  return (
    profile.targetRoles.length > 0 &&
    profile.skills.length > 0 &&
    profile.workingRights.length > 0 &&
    (profile.certifications.length > 0 || profile.workHistory.length > 0 || profile.education.length > 0)
  )
}

// Fields the gate above actually checks — targetRoles/skills/workingRights independently,
// plus one shared "at least one of these three" requirement for the rest.
export type GateField = "targetRoles" | "skills" | "workingRights" | "certifications" | "workHistory" | "education"

const ONE_OF_FIELDS = ["certifications", "workHistory", "education"] as const satisfies readonly GateField[]

const GATE_TOOLTIP_REQUIRED = "Required for AI analysis"
const GATE_TOOLTIP_ONE_OF = "One of Work History, Education, or Certifications is required for AI analysis"

/** Tooltip to show on `field`'s section header while it still blocks the AI-analysis gate; undefined once met. */
export function gateTooltipFor(profile: UserProfile, field: GateField): string | undefined {
  if ((ONE_OF_FIELDS as readonly GateField[]).includes(field)) {
    const met = ONE_OF_FIELDS.some(f => profile[f].length > 0)
    return met ? undefined : GATE_TOOLTIP_ONE_OF
  }
  return profile[field].length > 0 ? undefined : GATE_TOOLTIP_REQUIRED
}
