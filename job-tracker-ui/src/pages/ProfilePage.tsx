// Career profile page — lets users maintain the background data used as context for AI job analysis.
import NavBar from "@/components/NavBar"
import { useProfile, useCreateProfile, usePatchProfile } from "@/hooks/profileQuery"
import type { UserProfile, ProfilePatch } from "@/types/profile"
import { useEffect, useRef, useState } from "react"
import TagSection from "@/components/profile/TagSection"
import { type MatchStrategy } from "@/utils/matchSuggestion"
import {
  MAX_TARGET_ROLE_ITEM_LENGTH,
  MAX_SKILL_ITEM_LENGTH,
  MAX_CERTIFICATION_ITEM_LENGTH,
  MAX_LANGUAGE_ITEM_LENGTH,
} from "@/lib/validationConstants"
import {
  TARGET_ROLE_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  CERTIFICATION_SUGGESTIONS,
  LANGUAGE_SUGGESTIONS,
} from "@/components/profile/tagSuggestions"

// Empty form used before the query settles and for the "no profile yet" case.
const EMPTY_PROFILE: UserProfile = {
  targetRoles: [], skills: [], certifications: [], languages: [],
  workingRights: [], workHistory: [], education: [],
}

// Only the four string[] fields render as tag sections; keyed so state/save wire up generically.
type TagFieldKey = "targetRoles" | "skills" | "certifications" | "languages"

type TagSectionConfig = {
  key: TagFieldKey
  title: string
  placeholder: string
  maxItems: number
  maxItemLength: number
  suggestions: string[]
  layout?: "wrap" | "stack"      // default "wrap" (TagInput's own default)
  matchStrategy?: MatchStrategy  // default "word-start"; Languages overrides to "prefix"
}

// Per-section data only — the wiring (value/onChange/save/dirty) is identical and lives in the map below.
const TAG_SECTIONS: TagSectionConfig[] = [
  { key: "targetRoles", title: "Target Roles", placeholder: "Type a role and press Enter",
    maxItems: 10, maxItemLength: MAX_TARGET_ROLE_ITEM_LENGTH, layout: "stack", suggestions: TARGET_ROLE_SUGGESTIONS },
  { key: "skills", title: "Skills", placeholder: "Type a skill and press Enter",
    maxItems: 50, maxItemLength: MAX_SKILL_ITEM_LENGTH, suggestions: SKILL_SUGGESTIONS },
  { key: "certifications", title: "Certifications", placeholder: "Type a certification and press Enter",
    maxItems: 20, maxItemLength: MAX_CERTIFICATION_ITEM_LENGTH, layout: "stack", suggestions: CERTIFICATION_SUGGESTIONS },
  { key: "languages", title: "Languages", placeholder: "Type a language and press Enter",
    maxItems: 15, maxItemLength: MAX_LANGUAGE_ITEM_LENGTH, suggestions: LANGUAGE_SUGGESTIONS, matchStrategy: "prefix" },
]

export default function ProfilePage() {
  const { data, isLoading } = useProfile()
  const { mutateAsync: createProfile } = useCreateProfile()
  const { mutateAsync: patchProfile } = usePatchProfile()

  // Ref not state — flipping this flag must not trigger a re-render
  const profileExists = useRef(false)

  // Single form object — one key per profile field; replaces seven parallel useState hooks
  const [form, setForm] = useState<UserProfile>(EMPTY_PROFILE)

  const [savingSection, setSavingSection] = useState<keyof UserProfile | null>(null)
  const [sectionErrors, setSectionErrors] = useState<Record<string, string>>({})

  // Populate the form once the query settles; re-syncs after a save invalidates and refetches
  useEffect(() => {
    if (data === undefined) return
    if (data === null) { profileExists.current = false; return }
    profileExists.current = true
    setForm(data)
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
        {/* suggestion matching defaults to "word-start"; see Languages for an override */}
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
          maxItemLength={MAX_TARGET_ROLE_ITEM_LENGTH}
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
          maxItemLength={MAX_SKILL_ITEM_LENGTH}
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
          maxItemLength={MAX_CERTIFICATION_ITEM_LENGTH}
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
          maxItemLength={MAX_LANGUAGE_ITEM_LENGTH}
          suggestions={LANGUAGE_SUGGESTIONS}
          matchStrategy="prefix"
        />
        {/* Working Rights — Sub-step F */}
        {/* Work History — Sub-step G */}
        {/* Education — Sub-step H */}
      </div>
    </div>
  )
}
