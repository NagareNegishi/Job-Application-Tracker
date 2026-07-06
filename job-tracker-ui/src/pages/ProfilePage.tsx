// Career profile page — lets users maintain the background data used as context for AI job analysis.
import NavBar from "@/components/NavBar"
import { useProfile, useCreateProfile, usePatchProfile } from "@/hooks/profileQuery"
import type { ProfilePatch, WorkingRightEntry, WorkHistoryEntry, EducationEntry } from "@/types/profile"
import { useEffect, useRef, useState } from "react"
import TagSection from "@/components/profile/TagSection"
import {
  TARGET_ROLE_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  CERTIFICATION_SUGGESTIONS,
  LANGUAGE_SUGGESTIONS,
} from "@/components/profile/tagSuggestions"

export default function ProfilePage() {
  const { data, isLoading } = useProfile()
  const { mutateAsync: createProfile } = useCreateProfile()
  const { mutateAsync: patchProfile } = usePatchProfile()

  // Ref not state — flipping this flag must not trigger a re-render
  const profileExists = useRef(false)

  const [targetRoles, setTargetRoles] = useState<string[]>([])
  const [skills, setSkills] = useState<string[]>([])
  const [certifications, setCertifications] = useState<string[]>([])
  const [languages, setLanguages] = useState<string[]>([])
  const [workingRights, setWorkingRights] = useState<WorkingRightEntry[]>([])
  const [workHistory, setWorkHistory] = useState<WorkHistoryEntry[]>([])
  const [education, setEducation] = useState<EducationEntry[]>([])

  const [savingSection, setSavingSection] = useState<string | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})

  // Populate local state once the query settles; re-syncs after a save invalidates and refetches
  useEffect(() => {
    if (data === undefined) return
    if (data === null) { profileExists.current = false; return }
    profileExists.current = true
    setTargetRoles(data.targetRoles)
    setSkills(data.skills)
    setCertifications(data.certifications)
    setLanguages(data.languages)
    setWorkingRights(data.workingRights)
    setWorkHistory(data.workHistory)
    setEducation(data.education)
  }, [data])

  /**
   * Saves a single section. PUT on first save (no profile row yet), PATCH on all subsequent saves.
   * sectionKey is used only to track per-section loading and error state.
   */
  async function saveSection(sectionKey: string, patch: ProfilePatch) {
    setSavingSection(sectionKey)
    setSectionErrors(prev => ({ ...prev, [sectionKey]: "" }))
    try {
      if (!profileExists.current) {
        // First save — PUT the full form so the row is created with all current values
        await createProfile({ targetRoles, skills, certifications, languages, workingRights, workHistory, education })
        profileExists.current = true
      } else {
        await patchProfile(patch)
      }
    } catch {
      setSectionErrors(prev => ({ ...prev, [sectionKey]: "Failed to save. Please try again." }))
    } finally {
      setSavingSection(null)
    }
  }

  if (isLoading) return (
    <div className="min-h-screen bg-muted">
      <NavBar />
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-muted">
      <NavBar />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold">Profile</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your career profile is used as context for AI job analysis.
          </p>
        </div>
        <TagSection
          title="Target Roles"
          value={targetRoles}
          onChange={setTargetRoles}
          savedValue={data?.targetRoles ?? []}
          saving={savingSection === "targetRoles"}
          onSave={() => saveSection("targetRoles", { targetRoles })}
          error={sectionErrors.targetRoles}
          placeholder="Type a role and press Enter"
          maxItems={10}
          layout="stack"
          suggestions={TARGET_ROLE_SUGGESTIONS}
        />

        <TagSection
          title="Skills"
          value={skills}
          onChange={setSkills}
          savedValue={data?.skills ?? []}
          saving={savingSection === "skills"}
          onSave={() => saveSection("skills", { skills })}
          error={sectionErrors.skills}
          placeholder="Type a skill and press Enter"
          maxItems={50}
          suggestions={SKILL_SUGGESTIONS}
        />

        <TagSection
          title="Certifications"
          value={certifications}
          onChange={setCertifications}
          savedValue={data?.certifications ?? []}
          saving={savingSection === "certifications"}
          onSave={() => saveSection("certifications", { certifications })}
          error={sectionErrors.certifications}
          placeholder="Type a certification and press Enter"
          maxItems={20}
          layout="stack"
          suggestions={CERTIFICATION_SUGGESTIONS}
        />

        <TagSection
          title="Languages"
          value={languages}
          onChange={setLanguages}
          savedValue={data?.languages ?? []}
          saving={savingSection === "languages"}
          onSave={() => saveSection("languages", { languages })}
          error={sectionErrors.languages}
          placeholder="Type a language and press Enter"
          maxItems={15}
          suggestions={LANGUAGE_SUGGESTIONS}
        />
        {/* Working Rights — Sub-step F */}
        {/* Work History — Sub-step G */}
        {/* Education — Sub-step H */}
      </div>
    </div>
  )
}
