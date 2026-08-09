# Job Analysis (AI Insights)

## Overview

Two connected features: **Profile** (user's background stored in the app) and **Job Analysis** (on-demand AI insights comparing profile against a specific job). Five analysis types, each triggered independently on the job detail page.

CV integration is deferred — analysis uses profile text only.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| Separate endpoint per analysis type | Focused prompt per concern beats one large response |
| On-demand, not saved | Always fresh; no stale data when job description changes |
| `UserProfile` as a new table | Multiple structured fields, updated independently; a JSON column on `ApplicationUser` would be awkward to query/evolve |
| All analysis endpoints use the full profile | No field is exclusive to one analysis type |
| One profile per user (unique FK to `ApplicationUser`) | Cascade deletes automatic; no orphan cleanup |
| `IAnalysisService` / `ClaudeAnalysisService` in `Services/` | Matches existing service abstraction pattern; mockable in tests |
| `AnalysisController` at `/api/analyse` — content-scoped, not job-scoped | Takes the job's text in the request body, not a stored job id — no `{jobId}`, no 404, no ownership check. Serves both the saved-job flow and an ad-hoc paste through one endpoint |
| Only `description` required; `role`/`company` optional | `description` is the sole signal that matters; a saved job always has role/company, an ad-hoc paste may not (gate details in Endpoints section) |
| Ad-hoc entry point exposes Alignment only | It's a triage check ("worth pursuing?"); the other four only make sense for a job you're tracking |
| PUT creates, PATCH updates | Avoids re-sending/re-validating the full profile on every edit |
| PATCH follows JSON Merge Patch (RFC 7396) | Standard, stateless; pairs with per-section save so untouched sections are never sent |
| `WorkingRights` = array of `(country, status)`, `country` = ISO 3166-1 alpha-2 | One person can hold rights in multiple countries; a single enum can't express that |
| Dates: no future dates; "current" = `null` end date via checkbox | Standard résumé UX (LinkedIn/Seek); more discoverable than an inferred blank field |
| WorkHistory dates: separate `fromYear`/`fromMonth`/`toYear`/`toMonth` ints, month optional | Year-only entries are common on CVs; separate fields avoid partial-state parsing bugs. Education keeps plain `from`/`to` year ints |
| Save is permissive; the analysis gate is strict | Profiles are built incrementally — PUT/PATCH accept sparse/empty input; required-content is enforced only at analysis time |
| Return 400 if profile not set | Analysis has no input without a profile |
| One shared `"analyse"` rate-limit policy, 5/min | Real use is slow (~5s latency + reading) so 5/min never blocks normal use; shared because users burst across types, not repeat one |
| Analysis requires the `AiEnabled` policy | Every Claude-backed feature sits behind AI access, same as auto-fill parsing |
| Block demo user (403) | Prevents API cost from demo accounts, same as `DocumentsController` |
| `claude-haiku-4-5` model | Fast/cheap; each call is a focused extraction, not reasoning |
| Claude failure → 502 | Upstream dependency failed, not our bug (500) and not parse's silent degrade-to-empty. Typed `AnalysisFormatException` thrown by the service, mapped to 502 by the controller. No retry (matches parse's config) |
| Count bounds per list type | Predictable output length: Skills 5–8, Gaps 2–4, Questions-to-ask 3–5, Interview-questions 4–6. Alignment exempt (single score + sentence) |
| Analysis tunables centralized in `ClaudeAnalysisConfig` | Mirrors `ClaudeParsingConfig`: model, max tokens, count bounds, all 5 system prompts. Bounds are consts interpolated into the prompts (`$$"""` raw strings) so a range changes in one place |
| Max output tokens = 512, shared across all 5 types | `MaxTokens` is a ceiling not a cost; ~2.5x headroom over the heaviest type (gaps ≈ 200 tokens) prevents mid-JSON truncation without per-type tuning |
| Profile page: per-section Save (D14) | Fits how profiles are actually edited — small partial updates over time. Merge-patch makes it natural: each PATCH carries one field. First save (empty profile) uses PUT; every save after uses PATCH |
| Analysis result lifetime: page-durable (D15) | Results live in Job Detail page state only — kept while on the page, reset on refresh/navigate-away. No client cache or persistence, reinforces "on-demand, always fresh" |
| Nav link + demo user (D16) | Profile is a top-level nav link, not tucked under Settings — analysis buttons are gated on a filled profile so discoverability matters. Demo user sees Profile and can edit it (seeded sample data); analysis endpoints still 403 for demo |
| Job Detail analysis gated by `hasRole("AiUser")` only (D18) | Demo account has no `AiUser` role, so this already hides the section for demo too — same pattern as `JobTable`/`SettingsPage`. Server-side 403 (demo block) stays as defense in depth |
| Client mirrors server's profile-minimum via a new shared predicate, not `profileScore.ts` (D19) | `profileScore.ts` is a weighted completeness gauge for a different purpose; the analysis gate is a strict boolean matching `AnalysisController.GetGatedProfileAsync` exactly |
| Job Detail analysis UI: floating trigger + bottom-sliding Sheet (D20) | An on-demand AI action doesn't belong permanently stacked in the page like Contacts/Correspondence; list-shaped results need room. `Popover` rejected as too cramped. Reuses the existing `Sheet` primitive; `side="bottom"` distinguishes an AI action from `JobEditSheet`'s data-editing drawer |
| Test coverage scope (D17) | `ProfileDTOTests` (validation), profile tests in `AccountControllerTests` (GET/PUT/PATCH), `AnalysisControllerTests` (mocked service, no live Claude). Out of scope: no live-Claude service tests, no `[Authorize]`/policy/rate-limit tests (untested everywhere else in the suite) |
| Empty list results are valid, not malformed (D21) | A live Skills call against a profile with zero real overlap made Claude write prose instead of JSON, which the old `Length >= 1` floor then rejected as a 502 — but that floor already contradicted the prompts' own "never fabricate/pad" instruction. Fix: `ClaudeAnalysisService` only rejects a `null` field for Skills/Gaps/QuestionsToAsk/InterviewQuestions; `[]` passes through as a real result. Each prompt's OUTPUT FORMAT section now shows an empty-array example alongside the normal one. Alignment unaffected (always has a score) |

---

## Profile

### Fields

| Field | Type | Purpose |
|---|---|---|
| `TargetRoles` | `string[]` | Roles the user is targeting |
| `Skills` | `string[]` | Skills tag list |
| `Certifications` | `string[]` | e.g. "AWS Certified Developer", "PMP" |
| `Languages` | `string[]` | Spoken languages, free text |
| `WorkingRights` | `WorkingRightEntry[]` | Work authorisation per country |
| `WorkHistory` | `WorkHistoryEntry[]` | Structured work experience |
| `Education` | `EducationEntry[]` | Structured education |

All array fields stored as JSON.

**WorkingRightEntry:** `country` (ISO 3166-1 alpha-2, required), `status` (`WorkingRight` enum).

**WorkingRight enum:** `Citizen`, `PermanentResident`, `WorkVisa`, `RequiresSponsorship`, `Other`.

**WorkHistoryEntry:** `title`, `company`, `fromYear` (required, not future), `fromMonth?`, `toYear?` (`null` = current), `toMonth?`, `description?`.

**EducationEntry:** `institution`, `degree`, `from` (year, required), `to?` (`null` = currently enrolled).

### Validation

Added to `ValidationConstants`. Generous by design — bounds payload/abuse, not real users.

- **Array counts:** TargetRoles 10, Skills 50, Certifications 20, Languages 15, WorkingRights 20, WorkHistory 20, Education 10.
- **String lengths:** TargetRoles item 100, Skills item 50, Certifications item 100, Languages item 30; WorkHistoryEntry `title`/`company` 100, `description` 2000 (optional); EducationEntry `institution`/`degree` 100; WorkingRightEntry `country` 2 (regex `^[A-Z]{2}$`).
- **Dates:** `[Range(1900, 2099)]` on year fields, `[Range(1, 12)]` on month fields. `IValidatableObject` enforces not-future, `to ≥ from`, month ordering only when both months present.

### API Shape

```
GET    /api/account/profile
PUT    /api/account/profile
PATCH  /api/account/profile
Authorization: Bearer <token>
```

**GET** — returns the saved profile, or `{}` if nothing saved yet (not 404). Frontend uses emptiness to decide PUT vs PATCH.

**PUT** — creates on first save. 409 if a profile already exists.

**PATCH** — JSON Merge Patch (RFC 7396): only included fields update, arrays replace wholesale, `[]` clears a field. Client sends only changed fields. 404 if no profile exists.

PUT body (full profile):
```json
{
  "targetRoles": ["Senior Full-Stack Engineer", "Engineering Lead"],
  "skills": ["TypeScript", "React", "C#", "PostgreSQL"],
  "certifications": ["AWS Certified Developer", "PMP"],
  "languages": ["English", "Japanese"],
  "workingRight": "PermanentResident",
  "workHistory": [
    {
      "title": "Frontend Developer",
      "company": "Acme Corp",
      "from": "2023-01",
      "to": null,
      "description": "Built React dashboards, led migration to TypeScript..."
    }
  ],
  "education": [
    { "institution": "University of Auckland", "degree": "BSc Computer Science", "from": 2019, "to": 2022 },
    { "institution": "MIT", "degree": "MSc Machine Learning", "from": 2024, "to": null }
  ]
}
```

PATCH body (partial):
```json
{ "skills": ["TypeScript", "React", "C#", "PostgreSQL", "Docker"] }
```

---

## Analysis

### Endpoints

Content-scoped, not job-scoped — analysis takes the job's text in the request body, not a stored job id. No `{jobId}`, no 404, no ownership check.

```
POST /api/analyse/<type>
Authorization: Bearer <token>
Content-Type: application/json
```

Request body:
```json
{ "description": "...", "role": "Senior Backend Engineer", "company": "Acme" }
```

All endpoints:
- Require `[Authorize]` + `AiEnabled` policy; block demo user (403)
- Rate-limited by shared `"analyse"` policy — 5/min across all 5 types
- 400 if `description` is null/empty/shorter than `MinAnalysisDescription` (30 chars)/longer than the `Description` max. Enforced client-side too. `role`/`company` optional, never gated. Thin-but-present description is not a 400 — the analysis itself returns a "not enough information" answer
- 400 unless the profile meets the analysis minimum: `TargetRoles`, `Skills`, `WorkingRights` all non-empty, plus at least one of `Certifications`/`WorkHistory`/`Education`. `Languages` not required. Same rule enforced client-side (disables the buttons)

**Two entry points, one endpoint:**
1. Saved job (job detail page) — all 5 types, pre-filled from the stored job.
2. Ad-hoc triage — paste just a `description`, no saved job. Alignment only.

| Type | Endpoint | Entry points |
|---|---|---|
| Alignment score | `POST /api/analyse/alignment` | saved job + ad-hoc |
| Top skills for this role | `POST /api/analyse/skills` | saved job |
| Gap analysis | `POST /api/analyse/gaps` | saved job |
| Questions to ask | `POST /api/analyse/questions-to-ask` | saved job |
| Likely interview questions | `POST /api/analyse/interview-questions` | saved job |

### Response Shapes

**Alignment** — score 1–5, `reasoning` one sentence, `concern` is `null` for a genuine listing else a short not-a-job note (soft, non-refusing — see Profile Conditions below).
```json
{ "score": 3, "reasoning": "Strong frontend match; limited backend exposure.", "concern": null }
```

**Skills** — 5–8 items
```json
{ "skills": ["TypeScript", "React", "REST APIs", "CI/CD"] }
```

**Gaps** — 2–4 items
```json
{
  "gaps": [
    { "gap": "No Go experience", "advice": "Mention transferable systems knowledge from C#." },
    { "gap": "Limited cloud experience", "advice": "Highlight any AWS/Azure work, even personal projects." }
  ]
}
```

**Questions to ask** — 3–5 items
```json
{ "questions": ["What does the on-call rotation look like?", "How is success measured in the first 90 days?"] }
```

**Likely interview questions** — 4–6 items
```json
{ "questions": ["Tell me about a time you dealt with a difficult stakeholder.", "How do you approach performance optimisation?"] }
```

---

## Steps

### Profile

| # | Item | Status |
|---|---|---|
| 1 | `UserProfile` entity + migration | Done |
| 2 | `ProfileDTO` (request) + `ProfileResponseDto` (response) | Done |
| 3 | `GET`/`PUT`/`PATCH /api/account/profile` on `AccountController` | Done |
| 3a | `ProfileDTOTests` | Done |
| 3b | Profile tests in `AccountControllerTests` | Done |
| 4 | `/profile` page — tag sections, working rights, work history, education, suggestion lists | Done |
| 5 | Profile nav link | Done (folded into Step 4) |

### Analysis

| # | Item | Status |
|---|---|---|
| 6 | `IAnalysisService` + `ClaudeAnalysisService` in `Services/` | Done |
| 6a | Shared `ClaudeResponseHelper` (`ExtractJson`/`LogContractIssues`/`GetKnownKeys<T>`), used by both `ClaudeParsingService` and `ClaudeAnalysisService`; `ClaudeResponseHelperTests` | Done |
| 7 | `AnalysisController` at `/api/analyse`, 5 endpoints, `AiEnabled` policy + demo-block + `"analyse"` 5/min | Done |
| 8 | Register `ClaudeAnalysisService` in `Program.cs` | Done |
| 8a | `AnalysisControllerTests` — mocks `IAnalysisService`; 400 gates, 403 demo, 502 on `AnalysisFormatException`, 200 happy path | Done |
| 8b | Prompt-quality polish for all 5 prompts in `ClaudeAnalysisConfig.cs` | Done |
| 9 | Analysis UI on Job Detail page — `AnalysisSection`, 5 buttons + shared error/result area | Done — all 5 buttons wired |
| 10 | Ad-hoc triage entry point — paste a description, Alignment only | — |

---

### Step 9 (Job Detail Analysis UI) — reference

`AnalysisSection` (D20): floating bottom-right FAB (`Sparkles`, same icon as `ParseListingDialog`) at the `JobDetailPage` root. Opens a `Sheet` (`side="bottom"`, `max-h-[80vh]`, internal scroll) with buttons, gate message, result area.

- No FAB unless `hasRole("AiUser")` (D18, also covers demo).
- 5 buttons: Alignment, Top Skills, Gaps, Questions to Ask, Interview Questions — each with a one-line explainer.
- Buttons share one disabled state: `job.description` ≥ `MinAnalysisDescription`, and profile meets the minimum (`isProfileReady`, via `useProfile()`).
- One shared error/status line: unmet-gate reason when disabled, or POST failure (429/502/network) after a click.
- One shared result area below: renders whichever type is active. Each type keeps its own result in page state (D15) — switching buttons swaps the display, doesn't refetch.

Shared plumbing (`src/services/analysisService.ts`, `AnalysisSection.tsx`): `AnalysisRequest` type; single `results` state keyed by `AnalysisType` (`Partial<ResultMap>`) instead of one `useState` per type; single `loadingType`/`requestError` pair; `handleSelect<T extends AnalysisType>(type)` dispatches via a typed `ANALYSIS_FETCHERS` lookup instead of an if/else chain. `analysisService.ts`'s 5 endpoint functions are thin wrappers over one `postAnalysis<T>(endpoint, request)`. Result rendering goes through a `renderResult()` switch (one case per type) plus a shared `StringListResult` component for the bullet-list-or-empty-message shape common to Skills/Questions-to-ask/Interview-questions; Gaps keeps its own case (title+advice pairs, not a plain string list). `QuestionsResult` (`{ questions: string[] }`) is shared between Questions-to-ask and Interview-questions, matching the backend's shared DTO. (Deduplication pass, post-Step-9.)

---

## Profile Conditions (Expansion — added 2026-07-12)

Adds a "What I'm looking for" dimension to the profile — user's conditions/preferences, distinct from background. Alignment reads them so it answers "do you *want* this job?" not just "*can* you do it?". Reopened Profile after Steps 1–5 were done.

### Decisions

| Decision | Reasoning |
|---|---|
| Profile = Background + Conditions (global, not per-role) | Conditions apply across all target roles; per-role conditions rejected — rare need, large cost |
| New fields: `WorkModes`, `ContractTypes`, `SalaryExpectations`, `PreferredLocations`, `AdditionalConditions` | Structured fields for filterable hard signals; one free-text field absorbs nuance that resists structure |
| Experience level → free text, not structured | Seniority is fuzzy and role-dependent; an enum would fight reality |
| `WorkModes` reuses `WorkMode` enum, multi-select | Remote is a work-mode, not a location — keeps geography and remote orthogonal |
| `ContractTypes` = unordered acceptable set (new enum) | Answers "is this type acceptable?" — enough for alignment. Ranked preference deferred |
| `SalaryExpectations` = list of min floors, one per currency | Expectation is a floor; "any paid" = empty list. `List<SalaryExpectation>` (`MinAmount int?`, `Currency`, `Period`), max 3, distinct currencies, empty `[]` clears |
| `PreferredLocations` = `[{ Country, Areas[] }]`, empty `Areas` = anywhere in country | Country ISO-2 keeps the picker short; `Areas` stays free text. Cross-country regions go in `AdditionalConditions`, not a continent grouping |
| `AdditionalConditions` = free text, max 500, HTML-rejected | Catch-all for experience level, exceptions, region nuance. Rejects markup via the same regex `ParseListingRequest` uses |
| Conditions optional — analysis gate unchanged | Requiring conditions would block a quick alignment run; the D9 profile-minimum stays background-only |
| Only Alignment reads conditions | The other four are background-only; conditions are about fit/desire, which is Alignment's job |
| Alignment gains soft `concern: string?` | Surfaces "looks like a scam / unclear listing" without refusing — score + reasoning still return. Non-strict by choice |

### New fields (on `UserProfile`, `ProfileDTO`, `ProfileResponseDto`)

| Field | Type |
|---|---|
| `WorkModes` | `List<WorkMode>` |
| `ContractTypes` | `List<ContractType>` |
| `SalaryExpectations` | `List<SalaryExpectation>` (owned) |
| `PreferredLocations` | `List<PreferredLocationEntry>` (owned) |
| `AdditionalConditions` | `string?` |

**New enums** (`Models/Enums/`): `ContractType` (`FullTimePermanent`, `FullTimeContract`, `PartTime`, `Casual`, `Internship`, `Temporary`); `SalaryPeriod` (`Annual`, `Monthly`, `Hourly`).

**New entry classes** (`Models/`): `SalaryExpectation` (`MinAmount int?`, `Currency` regex `^[A-Z]{3}$`, `Period`); `PreferredLocationEntry` (`Country` regex `^[A-Z]{2}$`, required; `Areas List<string>`, optional).

### Validation constants (new)

- Counts: `MaxProfileWorkModesCount` 3, `MaxProfileContractTypesCount` 6, `MaxProfileLocationsCount` 10, `MaxProfileLocationAreasCount` 10, `MaxProfileSalaryExpectationsCount` 3.
- Lengths: `MaxProfileLocationAreaItemLength` 100, `MaxProfileAdditionalConditionsLength` 500.
- Salary: `MaxSalaryAmount` (e.g. 100,000,000).

### Steps

| # | Item | Status |
|---|---|---|
| C1 | `ValidationConstants` + `ContractType`/`SalaryPeriod` enums + entry classes | Done |
| C2 | `UserProfile` entity — add the 5 fields | Done |
| C3 | Migration | Done |
| C4 | `ProfileDTO` + `ProfileResponseDto` wiring | Done |
| C5 | `ProfileDTOTests` — new-field validation | Done |
| C6 | `FormatUserMessage` + `AlignmentPrompt` + `concern` field | Done |
| C7 | Frontend conditions section + suggestion lists | Done |
| C8 | Frontend alignment display — show `concern` when present | — |

Wording/structure polish for the reworked `AlignmentPrompt` is done. The `concern` threshold still needs tuning against real listings — verify once C8 and Steps 9–10 are usable end to end.

---

## Notes

### Deferred / follow-up work
- **C7 component polish:** `PreferredLocationsSection` and `AdditionalConditionsSection` need a visual/layout pass. Follow `.claude/skills/frontend-design/SKILL.md`.
- **Demo profile reset:** demo user can edit their seeded profile, so the periodic demo-reset (Demo/Auth step 2) needs to cover `UserProfile` too.
- **Save analysis to job:** *Questions to ask* and *Interview questions* could get a "Save to job" action onto new `Job` fields, overriding "on-demand, not saved" for those two types only. Adds `Job` fields + migration + save UI.
- **Profile quality score:** done — `utils/profileScore.ts` + `ScoreRing` component, mounted in `ProfilePage` header. Remaining: per-section improvement hints from `breakdown`.
- **Form re-hydration bug:** `ProfilePage` re-runs `setForm(data)` on every refetch, so saving one section can wipe unsaved edits in another mid-edit section. Rare, left as-is. Fix: hydrate once via a `hydrated` ref guard.
- **Profile page: flag analysis-gating fields:** once analysis UI is fully wired, visually flag which fields gate analysis (`TargetRoles`, `Skills`, `WorkingRights`, one of `Certifications`/`WorkHistory`/`Education`) — distinct from the general completeness score ring.

### Reference
- `Anthropic:ApiKey` shared with auto-fill parsing — no duplicate config key.
- Tests mock `IAnalysisService`; no live Claude calls in CI.
- Suggestion pools live in `components/profile/tagSuggestions.ts`. Sources: Languages → `iso-639-1`; Institutions → Hipolabs `world_universities_and_domains.json`; Roles/Skills/Certifications/Degrees → curated static lists. Custom free-text input always allowed.
