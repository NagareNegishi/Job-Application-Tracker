// Career profile page — lets users maintain the background data used as context for AI job analysis.
import NavBar from "@/components/NavBar"
import { useProfile, useCreateProfile, usePatchProfile } from "@/hooks/profileQuery"
import type { UserProfile, ProfilePatch } from "@/types/profile"
import { ContractType } from "@/types/profile"
import { WorkMode } from "@/types/enums"
import { useEffect, useRef, useState } from "react"
import TagSection from "@/components/profile/TagSection"
import MultiSelectSection from "@/components/profile/MultiSelectSection"
import SalaryExpectationSection from "@/components/profile/SalaryExpectationSection"
import WorkingRightsSection from "@/components/profile/WorkingRightsSection"
import WorkHistorySection from "@/components/profile/WorkHistorySection"
import EducationSection from "@/components/profile/EducationSection"
import { type MatchStrategy } from "@/utils/matchSuggestion"
import { computeProfileScore } from "@/utils/profileScore"
import { ScoreRing } from "@/components/ui/ScoreRing"
import {
  MAX_TARGET_ROLE_ITEM_LENGTH,
  MAX_SKILL_ITEM_LENGTH,
  MAX_CERTIFICATION_ITEM_LENGTH,
  MAX_LANGUAGE_ITEM_LENGTH,
  MAX_TARGET_ROLES_COUNT,
  MAX_SKILLS_COUNT,
  MAX_CERTIFICATIONS_COUNT,
  MAX_LANGUAGES_COUNT,
} from "@/lib/validationConstants"
import {
  TARGET_ROLE_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  CERTIFICATION_SUGGESTIONS,
  LANGUAGE_SUGGESTIONS,
} from "@/components/profile/tagSuggestions"

// Empty form used before the query settles and for the "no profile yet" case.
const EMPTY_PROFILE: UserProfile = {
  targetRoles: [], workModes: [], contractTypes: [], salaryExpectation: null,
  preferredLocations: [], additionalConditions: "",
  skills: [], certifications: [], languages: [],
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
  { key: "targetRoles", title: "Desired Roles", placeholder: "Type a role and press Enter",
    maxItems: MAX_TARGET_ROLES_COUNT, maxItemLength: MAX_TARGET_ROLE_ITEM_LENGTH, layout: "stack", suggestions: TARGET_ROLE_SUGGESTIONS },
  { key: "skills", title: "Skills", placeholder: "Type a skill and press Enter",
    maxItems: MAX_SKILLS_COUNT, maxItemLength: MAX_SKILL_ITEM_LENGTH, suggestions: SKILL_SUGGESTIONS },
  { key: "certifications", title: "Certifications", placeholder: "Type a certification and press Enter",
    maxItems: MAX_CERTIFICATIONS_COUNT, maxItemLength: MAX_CERTIFICATION_ITEM_LENGTH, layout: "stack", suggestions: CERTIFICATION_SUGGESTIONS },
  { key: "languages", title: "Languages", placeholder: "Type a language and press Enter",
    maxItems: MAX_LANGUAGES_COUNT, maxItemLength: MAX_LANGUAGE_ITEM_LENGTH, suggestions: LANGUAGE_SUGGESTIONS, matchStrategy: "prefix" },
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

  // Update exactly one field; every other field is carried over unchanged, so other sections stay non-dirty
  function updateField<K extends keyof UserProfile>(key: K, val: UserProfile[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  /**
   * Saves a single section. PUT on first save (no profile row yet), PATCH on all subsequent saves.
   * The PATCH carries only this section's field; merge-patch leaves untouched sections alone.
   */
  async function saveSection(key: keyof UserProfile) {
    setSavingSection(key)
    setSectionErrors(prev => ({ ...prev, [key]: "" }))
    try {
      if (!profileExists.current) {
        // First save — PUT the full form so the row is created with all current values
        await createProfile(form)
        profileExists.current = true
      } else {
        await patchProfile({ [key]: form[key] } as ProfilePatch)
      }
    } catch {
      setSectionErrors(prev => ({ ...prev, [key]: "Failed to save. Please try again." }))
    } finally {
      setSavingSection(null)
    }
  }

  // Renders one tag section by key. Wiring is identical across all four; only the per-section
  // config differs, so we look it up rather than duplicate the prop block at each call site.
  function renderTagSection(key: TagFieldKey) {
    const s = TAG_SECTIONS.find(c => c.key === key)!
    return (
      <TagSection
        key={s.key}
        title={s.title}
        value={form[s.key]}
        onChange={val => updateField(s.key, val)}
        savedValue={data?.[s.key] ?? []}
        saving={savingSection === s.key}
        onSave={() => saveSection(s.key)}
        error={sectionErrors[s.key]}
        placeholder={s.placeholder}
        maxItems={s.maxItems}
        maxItemLength={s.maxItemLength}
        layout={s.layout}
        suggestions={s.suggestions}
        matchStrategy={s.matchStrategy}
      />
    )
  }

  // Live completeness score of the current form.
  const profileScore = computeProfileScore(form).score

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
          <ScoreRing score={profileScore} />
        </div>

        {/* What I'm looking for: conditions/preferences, read only by Alignment analysis */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold px-1">What I'm looking for</h2>
          {renderTagSection("targetRoles")}
          <MultiSelectSection
            title="Work Modes"
            options={Object.values(WorkMode)}
            value={form.workModes}
            onChange={val => updateField("workModes", val)}
            savedValue={data?.workModes ?? []}
            saving={savingSection === "workModes"}
            onSave={() => saveSection("workModes")}
            error={sectionErrors["workModes"]}
          />
          <MultiSelectSection
            title="Contract Types"
            options={Object.values(ContractType)}
            value={form.contractTypes}
            onChange={val => updateField("contractTypes", val)}
            savedValue={data?.contractTypes ?? []}
            saving={savingSection === "contractTypes"}
            onSave={() => saveSection("contractTypes")}
            error={sectionErrors["contractTypes"]}
            showSelectAll
          />
          <SalaryExpectationSection
            value={form.salaryExpectation}
            onChange={val => updateField("salaryExpectation", val)}
            savedValue={data?.salaryExpectation ?? null}
            saving={savingSection === "salaryExpectation"}
            onSave={() => saveSection("salaryExpectation")}
            error={sectionErrors["salaryExpectation"]}
          />
          {/* PreferredLocationsSection + AdditionalConditionsSection land in C7.6/C7.7 */}
        </div>

        {/* Background: experience → education → supporting → logistics */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold px-1">Background</h2>
          <WorkHistorySection
            value={form.workHistory}
            onChange={val => updateField("workHistory", val)}
            savedValue={data?.workHistory ?? []}
            saving={savingSection === "workHistory"}
            onSave={() => saveSection("workHistory")}
            error={sectionErrors["workHistory"]}
          />
          <EducationSection
            value={form.education}
            onChange={val => updateField("education", val)}
            savedValue={data?.education ?? []}
            saving={savingSection === "education"}
            onSave={() => saveSection("education")}
            error={sectionErrors["education"]}
          />

          {renderTagSection("skills")}
          {renderTagSection("certifications")}
          {renderTagSection("languages")}

          <WorkingRightsSection
            value={form.workingRights}
            onChange={val => updateField("workingRights", val)}
            savedValue={data?.workingRights ?? []}
            saving={savingSection === "workingRights"}
            onSave={() => saveSection("workingRights")}
            error={sectionErrors["workingRights"]}
          />
        </div>
      </div>
    </div>
  )
}
