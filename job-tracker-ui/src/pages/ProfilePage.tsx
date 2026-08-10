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
import PreferredLocationsSection from "@/components/profile/PreferredLocationsSection"
import AdditionalConditionsSection from "@/components/profile/AdditionalConditionsSection"
import WorkingRightsSection from "@/components/profile/WorkingRightsSection"
import LanguagesSection from "@/components/profile/LanguagesSection"
import WorkHistorySection from "@/components/profile/WorkHistorySection"
import EducationSection from "@/components/profile/EducationSection"
import { type MatchStrategy } from "@/utils/matchSuggestion"
import { computeProfileScore } from "@/utils/profileScore"
import { sectionInvalid } from "@/utils/profileValidation"
import { gateTooltipFor, type GateField } from "@/utils/profileReady"
import { ScoreRing } from "@/components/ui/ScoreRing"
import FormActionBar from "@/components/ui/FormActionBar"
import {
  MAX_TARGET_ROLE_ITEM_LENGTH,
  MAX_SKILL_ITEM_LENGTH,
  MAX_CERTIFICATION_ITEM_LENGTH,
  MAX_TARGET_ROLES_COUNT,
  MAX_SKILLS_COUNT,
  MAX_CERTIFICATIONS_COUNT,
} from "@/lib/validationConstants"
import {
  TARGET_ROLE_SUGGESTIONS,
  SKILL_SUGGESTIONS,
  CERTIFICATION_SUGGESTIONS,
} from "@/components/profile/tagSuggestions"

// Empty form used before the query settles and for the "no profile yet" case.
const EMPTY_PROFILE: UserProfile = {
  targetRoles: [], workModes: [], contractTypes: [], salaryExpectations: [],
  preferredLocations: [], additionalConditions: "",
  skills: [], certifications: [], languages: [],
  workingRights: [], workHistory: [], education: [],
}

// All 12 section keys — drives Save profile and the first-run auto-open
const ALL_SECTION_KEYS = Object.keys(EMPTY_PROFILE) as (keyof UserProfile)[]

const GATE_FIELDS = ["targetRoles", "skills", "workingRights", "certifications", "workHistory", "education"] as const satisfies readonly GateField[]

function isGateField(key: keyof UserProfile): key is GateField {
  return (GATE_FIELDS as readonly string[]).includes(key)
}

// Only the three string[] fields render as tag sections; keyed so state/save wire up generically.
type TagFieldKey = "targetRoles" | "skills" | "certifications"

type TagSectionConfig = {
  title: string
  emptyText: string   // placeholder shown in view mode while the section is empty
  placeholder: string
  maxItems: number
  maxItemLength: number
  suggestions: string[]
  layout?: "wrap" | "stack"      // default "wrap" (TagInput's own default)
  matchStrategy?: MatchStrategy  // default "word-start"; Languages overrides to "prefix"
}

// Per-section data only — the wiring (value/onChange/save/dirty) is identical and lives in the map below.
const TAG_SECTIONS: Record<TagFieldKey, TagSectionConfig> = {
  targetRoles: { title: "Desired Roles", emptyText: "No desired roles added",
    placeholder: "Type a role and press Enter",
    maxItems: MAX_TARGET_ROLES_COUNT, maxItemLength: MAX_TARGET_ROLE_ITEM_LENGTH, layout: "stack", suggestions: TARGET_ROLE_SUGGESTIONS },
  skills: { title: "Skills", emptyText: "No skills added",
    placeholder: "Type a skill and press Enter",
    maxItems: MAX_SKILLS_COUNT, maxItemLength: MAX_SKILL_ITEM_LENGTH, suggestions: SKILL_SUGGESTIONS },
  certifications: { title: "Certifications", emptyText: "No certifications added",
    placeholder: "Type a certification and press Enter",
    maxItems: MAX_CERTIFICATIONS_COUNT, maxItemLength: MAX_CERTIFICATION_ITEM_LENGTH, layout: "stack", suggestions: CERTIFICATION_SUGGESTIONS },
}

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

  // Sections currently in edit mode; everything else renders read-only
  const [editingSections, setEditingSections] = useState<Set<keyof UserProfile>>(new Set())

  // Mirror for the data-sync effect below — reading it there must not re-trigger the effect
  const editingRef = useRef(editingSections)
  editingRef.current = editingSections

  const [savingAll, setSavingAll] = useState(false)
  const [saveAllError, setSaveAllError] = useState("")

  // Last saved state; EMPTY_PROFILE before the first save creates the row
  const saved = data ?? EMPTY_PROFILE

  function openSection(key: keyof UserProfile) {
    setEditingSections(prev => new Set(prev).add(key))
  }

  function closeSection(key: keyof UserProfile) {
    setEditingSections(prev => {
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }

  // Cancel = revert the section's form value to the last saved state, then exit edit mode
  function cancelSection(key: keyof UserProfile) {
    updateField(key, saved[key])
    closeSection(key)
  }

  // Cancel all = revert the whole form to the last saved state and close every section
  function cancelAll() {
    setForm(saved)
    setEditingSections(new Set())
    setSaveAllError("")
  }

  // Populate the form once the query settles; re-syncs after a save invalidates and refetches.
  // Sections still in edit mode keep their in-progress values — a per-section save must not
  // wipe unsaved edits elsewhere on the page.
  useEffect(() => {
    if (data === undefined) return
    if (data === null) {
      profileExists.current = false
      // First run — no profile row yet, so open everything for the initial fill
      setEditingSections(new Set(ALL_SECTION_KEYS))
      return
    }
    profileExists.current = true
    setForm(f => {
      const merged: UserProfile = { ...data }
      for (const key of editingRef.current) {
        (merged as Record<string, unknown>)[key] = f[key]
      }
      return merged
    })
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
      // Successful save returns the section to view mode; failures keep it open with the error
      closeSection(key)
    } catch {
      setSectionErrors(prev => ({ ...prev, [key]: "Failed to save. Please try again." }))
    } finally {
      setSavingSection(null)
    }
  }

  // Fields whose form value differs from the last saved state; the single source of
  // dirty for both the per-section Save buttons (via sectionProps) and Save all
  const dirtyKeys = ALL_SECTION_KEYS.filter(
    k => JSON.stringify(form[k]) !== JSON.stringify(saved[k])
  )
  // Only dirty fields get saved, so validity of the rest never blocks Save all
  const saveAllBlocked = dirtyKeys.some(k => sectionInvalid(k, form))
  const anyEditing = editingSections.size > 0

  /** Saves every dirty field at once — PUT on first save, a single merge-PATCH afterwards. */
  async function saveAll() {
    setSavingAll(true)
    setSaveAllError("")
    try {
      if (!profileExists.current) {
        await createProfile(form)
        profileExists.current = true
      } else {
        await patchProfile(Object.fromEntries(dirtyKeys.map(k => [k, form[k]])) as ProfilePatch)
      }
      setEditingSections(new Set())
    } catch {
      setSaveAllError("Failed to save. Please try again.")
    } finally {
      setSavingAll(false)
    }
  }

  /**
   * State/callback wiring shared by every section — spread into each section component.
   * Keyed by profile field so value, dirty, saving, editing, and the save/edit/cancel
   * handlers all stay in lockstep without repeating the prop block per section.
   */
  function sectionProps<K extends keyof UserProfile>(key: K) {
    return {
      value: form[key],
      onChange: (val: UserProfile[K]) => updateField(key, val),
      dirty: dirtyKeys.includes(key),
      saving: savingSection === key,
      onSave: () => saveSection(key),
      editing: editingSections.has(key),
      onEdit: () => openSection(key),
      onCancel: () => cancelSection(key),
      error: sectionErrors[key],
      gateTooltip: isGateField(key) ? gateTooltipFor(form, key) : undefined,
    }
  }

  // Renders one tag section by key. Wiring is identical across all four; only the per-section
  // config differs, so we look it up rather than duplicate the prop block at each call site.
  function renderTagSection(key: TagFieldKey) {
    const s = TAG_SECTIONS[key]
    return (
      <TagSection
        title={s.title}
        emptyText={s.emptyText}
        savedValue={saved[key]}
        placeholder={s.placeholder}
        maxItems={s.maxItems}
        maxItemLength={s.maxItemLength}
        layout={s.layout}
        suggestions={s.suggestions}
        matchStrategy={s.matchStrategy}
        {...sectionProps(key)}
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
          <fieldset className="rounded-lg bg-card/60 p-4 space-y-3">
          <legend className="px-1 text-base font-semibold">What I'm looking for</legend>
          {renderTagSection("targetRoles")}
          <MultiSelectSection
            title="Work Modes"
            emptyText="No work modes selected"
            options={Object.values(WorkMode)}
            {...sectionProps("workModes")}
          />
          <MultiSelectSection
            title="Contract Types"
            emptyText="No contract types selected"
            options={Object.values(ContractType)}
            showSelectAll
            {...sectionProps("contractTypes")}
          />
          <SalaryExpectationSection {...sectionProps("salaryExpectations")} />
          <PreferredLocationsSection {...sectionProps("preferredLocations")} />
          <AdditionalConditionsSection {...sectionProps("additionalConditions")} />
        </fieldset>

        {/* Background: experience → education → supporting → logistics */}
        <fieldset className="rounded-lg bg-card/60 p-4 space-y-3">
          <legend className="px-1 text-base font-semibold">Background</legend>
          <WorkHistorySection {...sectionProps("workHistory")} />
          <EducationSection {...sectionProps("education")} />

          {renderTagSection("skills")}
          {renderTagSection("certifications")}
          <LanguagesSection {...sectionProps("languages")} />

          <WorkingRightsSection {...sectionProps("workingRights")} />
        </fieldset>

        {/* Page-level actions while any section is open — sticky so they're reachable without scrolling */}
        {anyEditing && (
          <FormActionBar
            sticky
            onCancel={cancelAll}
            onSave={saveAll}
            saving={savingAll}
            saveDisabled={dirtyKeys.length === 0 || saveAllBlocked}
            error={saveAllError}
            saveLabel="Save profile"
          />
        )}
      </div>
    </div>
  )
}
