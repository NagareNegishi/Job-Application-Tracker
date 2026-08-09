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
