# Job Analysis (AI Insights)

## Overview

Two connected features: **Profile** (user's background stored in the app) and **Job Analysis** (on-demand AI insights comparing profile against a specific job). Five separate analysis types, each triggered independently on the job detail page.

CV integration is deferred — analysis uses profile text only.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| Separate endpoint per analysis type | Focused prompt per concern produces higher quality output than one large response |
| On-demand, not saved | Results are always fresh; no stale data when job description changes |
| `UserProfile` as a new table | Profile has multiple structured fields and will be updated independently; JSON column on `ApplicationUser` would be awkward to query and evolve |
| All analysis endpoints use the full profile | Alignment, gaps, and interview questions all benefit from the complete picture — no field is exclusive to one analysis type |
| One profile per user (unique FK to `ApplicationUser`) | Cascade deletes automatic; no orphan cleanup needed |
| `IAnalysisService` / `ClaudeAnalysisService` in `Services/` | Follows existing service abstraction pattern; mockable in tests |
| `AnalysisController` at `/api/analyse` — content-scoped, not job-scoped | Analysis takes the job's text in the request body; no stored-job fetch, so no `{jobId}`, no 404, no ownership check. Serves both a saved-job flow and an ad-hoc "is this worth it?" paste through one endpoint |
| Only `description` is required; `role`/`company` are optional context | `description` is the sole signal that matters; a saved job always has role/company, an ad-hoc paste may not. `description` must be 30 chars (`MinAnalysisDescription`) to the existing `Description` max; below/empty/over → 400. The floor bounds accidental/trivial input, not quality (char count ≠ meaning); thin-but-present clears the gate and the analysis returns "not enough information" instead |
| Ad-hoc entry point exposes Alignment only; saved jobs expose all 5 types | Ad-hoc is a triage check ("worth pursuing?"); the other four analyses only make sense for a job you're actually tracking |
| PUT creates, PATCH updates (separate endpoints) | Avoids re-sending and re-validating the full profile on every edit; only changed fields sent and validated on PATCH |
| PATCH follows JSON Merge Patch (RFC 7396): whole-array replace, `[]` clears, omit = unchanged | Standard and stateless; no element-identity tracking or separate delete op; pairs with per-section save so untouched sections are never sent |
| `WorkingRights` is an array of `(country, status)` pairs, `country` = ISO 3166-1 alpha-2 | One person can hold rights in multiple countries and jobs span countries; a single enum can't express this. ISO codes are standard, unambiguous, no duplication |
| Dates: no future dates; "current" role/study = `null` end date, set via a per-entry checkbox | Standard résumé UX (LinkedIn/Seek); an explicit "currently here" checkbox is more discoverable than an inferred blank field; multiple concurrent current entries allowed; start date always required |
| Date format enforced by attribute; "not future" + `from ≤ to` enforced by `IValidatableObject` | A static attribute can't bound against "today", so runtime cross-field validation handles not-future and ordering. YYYY-MM is zero-padded, so lexicographic string compare equals chronological — no date parsing needed. Dropping future dates also lets Education use a plain `[Range(1900, 2099)]` (compile-time constant) instead of a custom attribute |
| Save is permissive; the analysis gate is strict | Profiles are built incrementally — PUT/PATCH accept sparse or empty input; required-content is enforced only at analysis time (the 400 gate), not at save |
| Return 400 if profile not set | Analysis has no input without a profile; clear error, not a silent empty response |
| One shared `"analyse"` rate-limit policy, 5/min per IP | Real use is slow (~5s latency + ~10s reading ≈ 4/min natural ceiling), so 5/min maps to "run the full 5-type suite once per minute" — never blocks first-pass use, caps abuse an order of magnitude tighter. Per-IP matches existing `auth`/`parse` policies; shared (not per-endpoint) because users burst across types, not repeat one |
| Analysis requires the `AiEnabled` policy | Every Claude-backed feature sits behind AI access (same as auto-fill parsing), so the admin AI-access switch governs the whole paid surface — no ungated hole where a non-AI user burns API budget |
| Block demo user (403) | Prevents API cost from demo accounts; same pattern as `DocumentsController` |
| `claude-haiku-4-5` model | Fast and cheap; each call is a single focused extraction, not reasoning |
| Claude failure → 502 | Both a thrown Anthropic API error and a 200 whose body is unparseable or missing required fields (e.g. no `score`) return **502** with `{ "error": "..." }` — an upstream dependency failed, not a bug in our code (500) and not parse's silent degrade-to-empty. The service throws a typed exception (e.g. `AnalysisFormatException`); the controller catches and maps to 502. Analysis output *is* the product, so a hollow result would mislead where parse's empty-form fallback is harmless. No retry (matches the parse config's deliberate no-retry choice); a single re-prompt is deferred as a later enhancement |
| Count bounds per list type | Each list prompt states an explicit **min–max** so output length is predictable (stable UI card size) and neither padded nor thin: Skills **5–8**, Gaps **2–4**, Questions-to-ask **3–5**, Interview-questions **4–6**. Alignment is exempt (single score + one sentence) |
| Analysis tunables centralized in `ClaudeAnalysisConfig` | One `internal static class` (mirrors `ClaudeParsingConfig`) holds model, max tokens, the count bounds above, and the 5 system prompts. Count bounds are named consts **interpolated into the prompts** via `$$"""` raw strings (interpolation delimiter `{{ }}`, so literal JSON braces in the prompt examples need no escaping) — a range changes in exactly one place, never drifting from the prompt text. Prompts are therefore `static readonly` (interpolated at load), not `const`. `MinAnalysisDescription` stays in `ValidationConstants` (request-validation gate, not a Claude tunable) |
| Max output tokens = 512 (single shared) | One `MaxTokens` in `ClaudeAnalysisConfig` across all 5 types (same value as the parser). `MaxTokens` is a ceiling, not a cost (billed on actual output), and the D12 count bounds already constrain length — so a shared cap with ~2.5× headroom over the heaviest type (gaps ≈ 200 tokens) prevents mid-JSON truncation (→ 502) without per-type tuning |
| Profile page: per-section Save (D14) | Each section (Skills, Work History, Education, …) has its own Save that PATCHes only that section's field(s). Fits how profiles are actually edited — small partial updates over time — and avoids a single bottom Save that forces scrolling past everything to change one tag. Merge-patch (D3b) makes it natural: each PATCH carries one field, untouched sections are never sent (no accidental-`[]` wipe). **First save** of an as-yet-unsaved profile (GET returned empty) uses PUT with the whole current form (mostly-empty arrays, save is permissive); every save after uses PATCH |
| Analysis result lifetime: page-durable (D15) | All 5 results live only in Job Detail page state — kept while on the page (switching among the types preserves prior results), reset on refresh or navigate-away; re-running a type replaces its result with a fresh call. No client cache or persistence — simplest, and reinforces "on-demand, always fresh". Persisting a result long-term is out of scope here (see the *Save analysis to job* follow-up in Notes) |
| Nav link + demo user (D16) | Profile is a **top-level nav link** (peer of Jobs/Dashboard), not tucked under Settings/account menu — analysis buttons are gated on a filled profile, so discoverability matters (a buried link leaves users stuck on "why are the analysis buttons disabled?"). The **demo user sees Profile and can edit it**, seeded with a sample profile via `DemoSeed` (like demo jobs) so the feature shows fully; analysis endpoints still 403 for demo (D11, API-cost block). Because the demo profile is editable, the periodic demo-reset + login re-seed must also reset/re-seed it — see the *demo profile reset* follow-up in Notes |
| Test coverage scope (D17) | Three test files, mirroring existing conventions (in-memory EF, direct controller instantiation, manual `ClaimsPrincipal`, service mocked at the controller boundary — same as `IParsingService` in `JobsControllerTests`). **(1) `ProfileDTOTests`** (new, mirrors `JobDTOTests`) — array-count caps, per-item string caps, `country` regex `^[A-Z]{2}$`, date attributes (YYYY-MM regex / `[Range(1900,2099)]`), and `IValidatableObject` cross-field rules (`from` not future, `to ≥ from`, `to` null = current). **(2) Profile tests in `AccountControllerTests`** (extend) — GET empty `{}` vs full; PUT creates + 409 if exists; PATCH merge semantics (`[]` clears, omitted untouched) + 404 if none; own-profile-only. **(3) `AnalysisControllerTests`** (new, mocks `IAnalysisService`, no live Claude) — 400 on description too short/empty/over-max, 400 on profile-gate fail, 400 on no profile, 403 demo, 502 when service throws `AnalysisFormatException`, 200 happy path returns mocked result. **Out of scope** (consistent with existing suite): no `ClaudeAnalysisServiceTests` (AI service mocked at controller, never live-tested — same as `ClaudeParsingService`); no tests for `[Authorize]`, the `AiEnabled` policy, or the `"analyse"` rate-limit (pipeline concerns, untested everywhere else) |

---

## Open Decisions

**All decisions D1–D17 settled and folded into the Design Decisions table above (as of 2026-07-04).** No open questions remain — the plan is ready to implement, starting at Step 1 (`UserProfile` entity + migration).

---

## Profile

### Fields

| Field | Type | Purpose |
|---|---|---|
| `TargetRoles` | `string[]` | Roles the user is targeting — stored as JSON array |
| `Skills` | `string[]` | Skills as a tag list — stored as JSON array |
| `Certifications` | `string[]` | e.g. "AWS Certified Developer", "PMP" — stored as JSON array |
| `Languages` | `string[]` | Spoken languages, free text tags — stored as JSON array |
| `WorkingRights` | `WorkingRightEntry[]` | Work authorisation per country — stored as JSON array |
| `WorkHistory` | `WorkHistoryEntry[]` | Structured work experience entries — stored as JSON array |
| `Education` | `EducationEntry[]` | Structured education entries — stored as JSON array |

**WorkingRightEntry:**
| Sub-field | Type | Notes |
|---|---|---|
| `country` | `string` | ISO 3166-1 alpha-2 code (e.g. `NZ`, `AU`), uppercase; required |
| `status` | `WorkingRight` | Authorisation type for that country |

**WorkingRight enum:**
| Value | Meaning |
|---|---|
| `Citizen` | Citizen — unrestricted |
| `PermanentResident` | Permanent resident — unrestricted |
| `WorkVisa` | Current work visa — right exists but time-limited |
| `RequiresSponsorship` | No current right; needs employer sponsorship |
| `Other` | Right through another arrangement |

**WorkHistoryEntry:**
| Sub-field | Type | Notes |
|---|---|---|
| `title` | `string` | Job title |
| `company` | `string` | Employer |
| `from` | `string` | Start date (`"YYYY-MM"`); required; not future |
| `to` | `string?` | End date (`"YYYY-MM"`); `null` = current role (checkbox); `≥ from`; not future |
| `description` | `string` | Responsibilities and achievements |

**EducationEntry:**
| Sub-field | Type | Notes |
|---|---|---|
| `institution` | `string` | University or school |
| `degree` | `string` | Degree and field |
| `from` | `int` | Year started; required; not future |
| `to` | `int?` | Year graduated; `null` = currently enrolled (checkbox); `≥ from`; not future |

### Validation

Added to `ValidationConstants` (`MaxProfile*` etc.). Generous by design — bounds payload/abuse, not real users.

- **Array counts:** TargetRoles 10, Skills 50, Certifications 20, Languages 15, WorkingRights 20, WorkHistory 20, Education 10.
- **String lengths:** TargetRoles item 100, Skills item 50, Certifications item 100, Languages item 30; WorkHistoryEntry `title` 100 / `company` 100 / `description` 2000; EducationEntry `institution` 100 / `degree` 100; WorkingRightEntry `country` 2 (regex `^[A-Z]{2}$`).
- **Dates:**
  - *Format (attribute):* WorkHistory `from`/`to` — `[RegularExpression]` `^(19|20)\d{2}-(0[1-9]|1[0-2])$` (YYYY-MM, 1900–2099). Education `from`/`to` — `[Range(1900, 2099)]`.
  - *Runtime (`IValidatableObject` on the entry DTOs):* `from` required and not in the future (≤ current month/year); `to` optional (`null` = current), and when present `≥ from` and not in the future. Month comparison is lexicographic on the zero-padded YYYY-MM string.

### API Shape

```
GET    /api/account/profile
PUT    /api/account/profile
PATCH  /api/account/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**GET** — returns the saved profile, or empty object `{}` if nothing has been saved yet (not 404). An existing profile always includes all fields (unfilled arrays serialize as `[]`), so the frontend distinguishes create vs update by whether the response is empty: empty → `PUT`, has data → `PATCH`. No timestamp field.

**PUT** — creates the profile on first save. Returns 409 if a profile already exists. Frontend uses this only once (when GET returned empty).

**PATCH** — partial update on an existing profile, following **JSON Merge Patch (RFC 7396)** semantics: only fields included in the body are updated, omitted fields are left unchanged; arrays are replaced wholesale (send the full array), and `[]` clears a field. The client must send **only changed fields** — an accidental `[]` on an untouched field wipes it (see per-section save, D14). Returns 404 if no profile exists yet. Use for all edits after initial creation.

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
    {
      "institution": "University of Auckland",
      "degree": "BSc Computer Science",
      "from": 2019,
      "to": 2022
    },
    {
      "institution": "MIT",
      "degree": "MSc Machine Learning",
      "from": 2024,
      "to": null
    }
  ]
}
```

PATCH body (partial — only changed fields):
```json
{ "skills": ["TypeScript", "React", "C#", "PostgreSQL", "Docker"] }
```

---

## Analysis

### Endpoints

**Content-scoped, not job-scoped.** Analysis takes the job's text in the request body — it does not fetch a stored job by id. So there is no `{jobId}` in the route, no job lookup, and no 404/ownership check: a pasted description is not a per-user resource, only the profile is. One code path serves both entry points below.

```
POST /api/analyse/<type>
Authorization: Bearer <token>
Content-Type: application/json
```

Request body (minimal — only `description` is required):
```json
{ "description": "...", "role": "Senior Backend Engineer", "company": "Acme" }
```

All endpoints:
- Require `[Authorize]` **and the `AiEnabled` policy** (same as auto-fill parsing — every Claude-backed feature requires AI access); block demo user (403)
- Rate-limited by a single shared `"analyse"` policy — **5/min per IP** across all 5 types (enough to run the full suite once a minute; an abuse backstop, not a UX limit)
- Return 400 if `description` is null/empty, shorter than `MinAnalysisDescription` (30 chars), or longer than the existing `Description` max (reused so the ad-hoc paste is bounded like a saved job). This length check is the only job-side gate — it bounds accidental/trivial input ("test", "asdf"), not quality; deliberate abuse is handled by rate limiting (D10). Enforced client-side too. `role`/`company` are optional context, never gated. A description that clears the minimum but is still thin is *not* a 400; the analysis itself returns a "not enough information" style answer.
- Return 400 unless the profile meets the analysis minimum — ALL of: `TargetRoles` non-empty, `Skills` non-empty, `WorkingRights` non-empty (≥1 entry, any status incl. `RequiresSponsorship`), and at least one of `Certifications` / `WorkHistory` / `Education` non-empty. `Languages` not required. Same rule enforced client-side (analysis buttons disabled until met); defined once, identical both sides.

**Two entry points, one endpoint:**
1. *From a saved job* (job detail page) — exposes all 5 analysis types. The frontend pre-fills `description` from the stored job (or prompts for one if empty), plus `role`/`company`, then posts the body above.
2. *Ad-hoc triage* ("is this worth considering?") — user pastes just a `description`, no saved job. Exposes **Alignment only**.

| Type | Endpoint | Entry points |
|---|---|---|
| Alignment score | `POST /api/analyse/alignment` | saved job + ad-hoc |
| Top skills for this role | `POST /api/analyse/skills` | saved job |
| Gap analysis | `POST /api/analyse/gaps` | saved job |
| Questions to ask | `POST /api/analyse/questions-to-ask` | saved job |
| Likely interview questions | `POST /api/analyse/interview-questions` | saved job |

### Response Shapes

**Alignment**
```json
{ "score": 3, "reasoning": "Strong frontend match; limited backend exposure." }
```
Score is 1–5. `reasoning` is one sentence.

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
| 1 | Add `UserProfile` entity + migration | Done |
| 2 | Add `ProfileDTO` (request) + `ProfileResponseDto` (response) | Done |
| 3 | Add `GET /api/account/profile` + `PUT /api/account/profile` + `PATCH /api/account/profile` to `AccountController` | Done |
| 3a | `ProfileDTOTests` — validation for `ProfileDTO`, `WorkingRightEntry`, `WorkHistoryEntry`, `EducationEntry` | Done |
| 3b | Profile tests in `AccountControllerTests` — GET empty/full, PUT + 409, PATCH merge + 404 | Done |
| 4 | Add `/profile` page to frontend — tags input for `TargetRoles` and `Skills`; repeating entry forms for `WorkHistory` and `Education` (add/remove entries) | In progress — route + nav done (Step 5 folded in); tag sections (E) done + `TagInput` polished + tag-input autocomplete done (placeholder lists — see Notes); working rights (F) done + polished: `CountryCombobox` fluid (`w-full`, `w-[var(--radix-popover-trigger-width)]`, `shrink-0` on flag), `WorkingRightsSection` responsive row (fields in `flex-col sm:flex-row` inner div; trash pinned right via outer `flex items-center`; `bg-muted/50 border rounded-md p-2` per entry); `TagInput` delete icon → `Trash2`, `gap-2` between tag text and icon; cmdk built-in fuzzy filter (no custom util needed); **next: work history (G), education (H), suggestion lists (I — last, separate session)** |
| 5 | Add Profile nav link | Done (folded into Step 4) |

### Analysis

| # | Item | Status |
|---|---|---|
| 6 | Add `IAnalysisService` + `ClaudeAnalysisService` in `Services/` | — |
| 7 | Add `AnalysisController` at `/api/analyse` with 5 content-scoped endpoints (body: `description` + optional `role`/`company`); `[Authorize(Policy = "AiEnabled")]` + demo-block + shared `"analyse"` 5/min-per-IP policy | — |
| 8 | Register `ClaudeAnalysisService` in `Program.cs` | — |
| 8a | `AnalysisControllerTests` — mocks `IAnalysisService`; 400 gates, 403 demo, 502 on `AnalysisFormatException`, 200 happy path | — |
| 9 | Add analysis UI to Job Detail page — 5 independent buttons; pre-fill `description` from the job (prompt if empty); each shows its own result inline | — |
| 10 | Add ad-hoc triage entry point — paste a description, Alignment only | — |

---

## Notes

- `Anthropic:ApiKey` is shared with the auto-fill parsing feature — no duplicate config key needed once that feature is added.
- Tests: mock `IAnalysisService` in controller tests; no live Claude calls in CI.
- Profile page vs Settings: `/profile` is a dedicated page — profile is substantial enough to warrant its own route rather than a section in Settings.
- Country picker (frontend): button-trigger combobox (not input-as-trigger — closed list, user picks not types); flag rendered via `flag-icons` (`fi fi-{code}`, lowercase); name via `Intl.DisplayNames(['en'], { type: 'region' })` (zero-dep, browser-native); code list is a static `COUNTRY_CODES: string[]` in `src/components/profile/countryCodes.ts` (pre-sorted by display name) + `getCountryName(code)` helper; `Intl.DisplayNames` instance created once at module level. Files: `countryCodes.ts`, `CountryCombobox.tsx`, `WorkingRightsSection.tsx` — all in `src/components/profile/`.
- WorkingRights entry (frontend): reuse the country picker; default country from the browser locale/region; default status to "don't have it" (`RequiresSponsorship`) so users consciously set their actual right rather than accepting an assumed one.
- WorkHistory/Education entry (frontend): per-entry "I currently work/study here" checkbox — ticking it disables and clears the end-date field and sends `to: null`. Multiple entries may be current. Start date always required. Cap date inputs at the current month/year (no future dates).
- **Demo profile reset (deferred — pairs with D16):** the demo user can edit their seeded profile, so the existing periodic demo-data reset + login re-seed (Demo/Auth step 2) must be extended to cover `UserProfile` — add the sample profile to `DemoSeed` and include it in the reset path. Scope alongside the profile backend (Steps 1–3). Add to `docs/progress.md` upcoming work when this plan lands.
- **Save analysis to job (deferred — separate scope):** the two prep-oriented analyses — *Questions to ask* and *Likely interview questions* — get an optional "Save to job" action that persists them onto new optional `Job` fields (e.g. `QuestionsToAsk`, `InterviewQuestions`), so they survive as interview/meetup prep. Partially overrides "on-demand, not saved" for those two types only; the three assessment types (Alignment, Skills, Gaps) stay ephemeral (D15). Adds `Job` entity fields + migration + save UI; scope separately. Add to `docs/progress.md` upcoming work when this plan lands.
- **TagInput polish (done 2026-07-07):** input sits above the tag list in both layouts — no chips-inside-input, no Backspace-delete (remove only via per-tag X). `layout` prop: `wrap` (Skills, Languages) vs `stack` (Target Roles, Certifications); one unified pill (`text-sm`, `font-semibold`, content-width). Unsaved-vs-saved shown as dashed/tinted pill via `savedValue` prop. Per-section dirty detection + Save/Cancel extracted to `components/profile/TagSection.tsx` — controlled component, state stays in `ProfilePage` so first-save can PUT the whole form. Decided against auto-capitalizing tags (breaks case-sensitive terms like `iOS`, `.NET`, `PostgreSQL`).
- **`matchesSuggestion` utility (done 2026-07-07):** three strategies — `"prefix"`, `"word-start"`, `"substring"` — in `src/utils/matchSuggestion.ts`; 10 Vitest tests alongside. `TagInput` gains `matchStrategy?` prop (default `"word-start"`); `TagSection` passes it through. `ProfilePage` sets `matchStrategy="prefix"` on Languages (single-token names); all other sections rely on the default. To switch Skills to substring matching later, one prop change is all it takes.
- **Tag-input autocomplete (done 2026-07-07):** each tag section suggests completions as the user types (scrollable dropdown, keyboard ↑/↓/Enter/Esc + mouse, case-insensitive substring match, excludes already-added tags). `TagInput` gained optional `suggestions?` prop (omit → no dropdown); pools in `components/profile/tagSuggestions.ts` wired via `TagSection`. Suggests only — custom input never restricted. Dep: `iso-639-1` (v3.1.x, MIT, zero-dep).
  - **Sources (decided 2026-07-07):** Languages → `iso-639-1` list + allow custom free-text input (covers langs not in ISO 639-1). Skills / Certifications / degree types → curated static const (AI-generated seed; no attribution obligation, vs ESCO free-reuse-with-credit or O*NET CC BY 4.0). Education institutions (sub-step H) → copy official [Hipolabs `world_universities_and_domains.json`](https://github.com/Hipo/university-domains-list) (verify repo LICENSE first).
  - **`tagSuggestions.ts` — curated lists (Step 4-I, last sub-step, separate session):** Replace the three PLACEHOLDER arrays in `src/components/profile/tagSuggestions.ts` for `TARGET_ROLE_SUGGESTIONS`, `SKILL_SUGGESTIONS`, and `CERTIFICATION_SUGGESTIONS` with proper curated lists. This is a data-generation task — no implementation work required. If a reliable public source exists (e.g. a well-known curated list or standard dataset), copy from it directly; otherwise generate realistic, comprehensive lists from knowledge. Languages is already complete (`iso-639-1`).
- **Nationality (Working Rights sub-step F):** use `i18n-nationality` (`getName(code,"en")` → demonym) — hands back exact nationality strings, API mirrors `i18n-iso-countries`. Alt `world-countries` only if other country data (flags/currencies) is needed elsewhere.
- Profile quality: **now** a lightweight frontend advisory — a simple heuristic that flags "meets the minimum but thin; richer profiles give better analysis" when the 400 gate passes but content is sparse. A **full profile-quality score** (weighted 0–100 / meter + per-field improvement hints) is deferred to a **separate plan** — client-side only, like the dashboard. Add it to `docs/progress.md` upcoming work when this plan lands.
- **Form re-hydration on refetch (deferred enhancement):** `ProfilePage`'s effect re-runs `setForm(data)` on every profile refetch, so saving one section wipes unsaved edits in any other mid-edit section. Left as-is (rare to edit two sections at once). Fix when polishing: hydrate the form once via a `hydrated` ref guard — per-section `savedValue` already comes from `data`, so no re-sync is needed.
- **WorkingRightsSection — deferred polish (separate session):** (1) Prevent duplicate country entries — block `addEntry` or `onSave` if the same country code appears more than once; show an inline validation message. (2) Improve error messages — current generic "Failed to save. Please try again." doesn't tell the user what went wrong; surface API error details where available, otherwise distinguish network vs validation errors.
