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
| WorkHistory dates: separate `fromYear`/`fromMonth`/`toYear`/`toMonth` int fields; month optional | Year-only entries are common on CVs. Separate fields eliminate partial-state bugs in the frontend (no combining/splitting logic needed). `[Range]` on each field; `IValidatableObject` enforces not-future and ordering. Month ordering only checked when both months present. Education keeps plain `from`/`to` year ints (already matched this pattern). |
| Save is permissive; the analysis gate is strict | Profiles are built incrementally — PUT/PATCH accept sparse or empty input; required-content is enforced only at analysis time (the 400 gate), not at save |
| Return 400 if profile not set | Analysis has no input without a profile; clear error, not a silent empty response |
| One shared `"analyse"` rate-limit policy, 5/min | Real use is slow (~5s latency + ~10s reading ≈ 4/min natural ceiling), so 5/min maps to "run the full 5-type suite once per minute" — never blocks first-pass use, caps abuse an order of magnitude tighter. Matches existing `auth`/`parse` policies (global bucket, not per-IP — see `progress.md` backlog note); shared (not per-endpoint) because users burst across types, not repeat one |
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
| Job Detail analysis section gated by `hasRole("AiUser")` only, no separate demo check (D18) | Demo account is seeded without the `AiUser` role (`Program.cs`), so hiding the section for non-AI users already hides it for demo too — same pattern `JobTable`/`SettingsPage` use elsewhere. The server-side 403 demo block (D11) remains as defense in depth, just never hit in normal use |
| Client mirrors the server's profile-minimum boolean via a new shared predicate, not `profileScore.ts` (D19) | `profileScore.ts` is a weighted 0–100 completeness gauge for `ProfilePage`'s progress ring — a different purpose with different criteria. The analysis gate is a strict boolean (`TargetRoles>0 && Skills>0 && WorkingRights>0 && (Certifications>0 \|\| WorkHistory>0 \|\| Education>0)`) that must match `AnalysisController.GetGatedProfileAsync` exactly, so it gets its own small predicate rather than reusing the score util |
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
| `fromYear` | `int` | Start year (1900–2099); required (`[Range]` rejects default 0); not future |
| `fromMonth` | `int?` | Start month (1–12); optional |
| `toYear` | `int?` | End year; `null` = current role (checkbox); `≥ fromYear`; not future |
| `toMonth` | `int?` | End month (1–12); optional; `≥ fromMonth` when same year and both present |
| `description` | `string?` | Responsibilities and achievements; optional |

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
- **String lengths:** TargetRoles item 100, Skills item 50, Certifications item 100, Languages item 30; WorkHistoryEntry `title` 100 / `company` 100 / `description` 2000 (optional); EducationEntry `institution` 100 / `degree` 100; WorkingRightEntry `country` 2 (regex `^[A-Z]{2}$`).
- **Dates:**
  - *Format (attribute):* WorkHistory — `fromYear`/`toYear` use `[Range(1900, 2099)]`; `fromMonth`/`toMonth` use `[Range(1, 12)]`. Education `from`/`to` — `[Range(1900, 2099)]`. No regex attributes on WorkHistory (model changed from YYYY-MM string to separate int fields).
  - *Runtime (`IValidatableObject` on the entry DTOs):* year fields not future; `toYear ≥ fromYear` when present; `toMonth ≥ fromMonth` when same year and both present. Month-only ordering enforced only when both months are provided (month is optional).

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
- Rate-limited by a single shared `"analyse"` policy — **5/min** across all 5 types (enough to run the full suite once a minute; an abuse backstop, not a UX limit)
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
{ "score": 3, "reasoning": "Strong frontend match; limited backend exposure.", "concern": null }
```
Score is 1–5. `reasoning` is one sentence. `concern` is `null` for a genuine listing, else a short not-a-job note (soft, non-refusing) — see the Profile Conditions expansion below.

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
| 4 | Add `/profile` page to frontend — tag sections, working rights, work history, education, suggestion lists | Done |
| 5 | Add Profile nav link | Done (folded into Step 4) |

### Analysis

| # | Item | Status |
|---|---|---|
| 6 | Add `IAnalysisService` + `ClaudeAnalysisService` in `Services/` | Done |
| 6a | Shared `ClaudeResponseHelper` (`ExtractJson`/`LogContractIssues`/`GetKnownKeys<T>`) — used by both `ClaudeParsingService` and `ClaudeAnalysisService`; `ClaudeResponseHelperTests` (11 tests) | Done |
| 7 | Add `AnalysisController` at `/api/analyse` with 5 content-scoped endpoints (body: `description` + optional `role`/`company`); `[Authorize(Policy = "AiEnabled")]` + demo-block + shared `"analyse"` 5/min policy | Done |
| 8 | Register `ClaudeAnalysisService` in `Program.cs` | Done |
| 8a | `AnalysisControllerTests` — mocks `IAnalysisService`; 400 gates, 403 demo, 502 on `AnalysisFormatException`, 200 happy path | Done |
| 8b | Prompt-quality polish — wording/structure pass (SELECTION/RANKING/OUTPUT FORMAT, examples) for all 5 prompts in `ClaudeAnalysisConfig.cs`; wording verified through the UI once Steps 9–10 land | Done |
| 9 | Add analysis UI to Job Detail page — `AnalysisSection`, 5 buttons + shared error/result area (see breakdown below) | — |
| 10 | Add ad-hoc triage entry point — paste a description, Alignment only | — |

---

### Step 9 Breakdown (Job Detail Analysis UI)

New `AnalysisSection` component, mounted in `JobDetailPage`'s existing section stack as a peer of `ContactList`/`CorrespondenceList`/`DocumentList` — self-contained, no popup/sheet, moves as one unit like the others.

- Renders nothing if `!hasRole("AiUser")` (D18 — also covers the demo user, which has no `AiUser` role).
- Section title (`h2`, same convention as `DocumentList`'s "Documents" heading).
- 5 buttons, each labeled with the analysis type plus a one-line explainer of what it returns:
  - Alignment — how well your profile matches this job
  - Top Skills — skills to highlight for this role
  - Gaps — where your profile falls short, and how to address it
  - Questions to Ask — good questions for the interviewer
  - Interview Questions — questions you're likely to be asked
- All 5 buttons share one disabled state, computed from two client-side gates mirroring the server (in order):
  1. `job.description` present and ≥ `MinAnalysisDescription` (30 chars) — no upper-bound check needed, job descriptions are already capped at save time.
  2. Profile meets the analysis minimum — new shared predicate (D19), read via the existing `useProfile()` (`hooks/profileQuery.ts`), no new fetch needed.
- One shared error/status line below the buttons: shows the specific unmet-gate reason when disabled ("Add a description to this job to run analysis." / "Complete your profile to run analysis."); reused as the reactive error slot for POST failures (429/502/network) after a click, same generic-message pattern as `ParseListingDialog`.
- One shared result "screen" below that: renders whichever type is currently active. Each of the 5 types keeps its own result in page state per D15 (switching buttons swaps the displayed result, doesn't refetch) — starts as plain text rendering of the JSON response; per-type formatting (score display, list, gap pairs) is a later pass once the shape is wired end to end.

---

## Profile Conditions (Expansion — added 2026-07-12)

Adds a "What I'm looking for" dimension to the profile — the user's **conditions/preferences**, distinct from **background**. Alignment analysis reads them so it answers "do you *want* this job?" not just "*can* you do it?". Modelled on the reference screener's "My Conditions". **Not started**; spans backend + frontend + the alignment prompt. Reopens Profile (previously "done" for background only).

### Decisions

| Decision | Reasoning |
|---|---|
| Profile = Background + Conditions (global, not per-role) | Conditions apply across all target roles, not per-role; `TargetRoles` stays `string[]` and heads a new "What I'm looking for" section. Per-role conditions rejected — rare need, large model/UI/prompt cost |
| New condition fields: `WorkModes`, `ContractTypes`, `SalaryExpectations`, `PreferredLocations`, `AdditionalConditions` | Structure the filterable conditions (mode/contract/salary/location) for consistent hard signals; one free-text field absorbs nuance that resists structure |
| Experience level → free text, not a structured field | Seniority is fuzzy and often role-dependent; an enum would fight reality. Reference treated junior-only as a hard filter — a soft free-text note fits this project better |
| `WorkModes` reuses existing `WorkMode` enum (`OnSite`/`Remote`/`Hybrid`), multi-select | Remote is a work-mode, not a location — keeps geography and remote orthogonal (no "Remote country" hack) |
| `ContractTypes` = unordered *acceptable set* (new enum) | Set answers "is this type acceptable?" — enough for alignment. Ranked preference deferred (nicer signal, more UI, low payoff now). Enum: `FullTimePermanent`, `FullTimeContract`, `PartTime`, `Casual`, `Internship`, `Temporary` |
| `SalaryExpectations` = list of min floors, one per currency | Expectation is a floor; "any paid" = empty list. Min+max range deferred. `List<SalaryExpectation>` (`{ MinAmount int?, Currency, Period }`), max 3, distinct currencies (multi-market seekers); empty `[]` clears (was a nullable object — `null` couldn't be cleared via PATCH). Currency ISO 4217 alpha-3 (`^[A-Z]{3}$`); `SalaryPeriod` enum `Annual`/`Monthly`/`Hourly` |
| `PreferredLocations` = `[{ Country, Areas[] }]`; empty `Areas` = anywhere in country | Country ISO-2 (reuse `^[A-Z]{2}$`) is a short autocomplete list — fixes "list too long"; `Areas` optional loose text (the infinite list stays unstructured). Multiple areas per country allowed. Cross-country regions ("Europe") go in free text, not a continent grouping |
| `AdditionalConditions` = free text (`text`, max 500), HTML-rejected | Catch-all: experience level, "unpaid only if exceptional", region nuance. 500 fits a few preference notes, not an essay. Reject markup via the same inline `<[a-zA-Z/]` regex `ParseListingRequest` uses (no reusable attribute exists — it's an `IValidatableObject` check in `ProfileDTO.Validate()`) |
| Conditions are optional — analysis gate unchanged | Requiring conditions would block a quick alignment run; they enrich output when present. The D9 profile-minimum stays background-only |
| Only Alignment (of the 5) reads conditions | The other four are background-only (skills/gaps/interview prep); conditions are about fit/desire, which is Alignment's job |
| Alignment gains soft `concern: string?` (not-a-job detection) | Surfaces "looks like a CV service / scam / unclear listing" without refusing — score + reasoning still return, the user decides. Non-strict by choice (some users want unclear listings). Threshold/wording tuned in Step 8b |

### New fields (on `UserProfile`, `ProfileDTO`, `ProfileResponseDto`)

| Field | Type | Storage (mirrors) |
|---|---|---|
| `WorkModes` | `List<WorkMode>` | JSONB list |
| `ContractTypes` | `List<ContractType>` | JSONB list |
| `SalaryExpectations` | `List<SalaryExpectation>` (owned) | JSONB (like `WorkingRights`) |
| `PreferredLocations` | `List<PreferredLocationEntry>` | JSONB owned (like `WorkingRightEntry`) |
| `AdditionalConditions` | `string?` | `text` column |

**New enums** (`Models/Enums/`): `ContractType` (`FullTimePermanent`, `FullTimeContract`, `PartTime`, `Casual`, `Internship`, `Temporary`); `SalaryPeriod` (`Annual`, `Monthly`, `Hourly`).

**New entry classes** (`Models/`, DataAnnotations style like `WorkingRightEntry.cs`):
- `SalaryExpectation` — `MinAmount int?` (`[Range(0, MaxSalaryAmount)]`), `Currency string` (`^[A-Z]{3}$`), `Period SalaryPeriod`. Profile holds a `List<SalaryExpectation>` (one per currency; distinct-currency rule in `ProfileDTO.Validate`).
- `PreferredLocationEntry` — `Country string` (required, `^[A-Z]{2}$`), `Areas List<string>` (optional; each item ≤ `MaxProfileLocationAreaItemLength`).

### Validation constants (new)

- Counts: `MaxProfileWorkModesCount` 3, `MaxProfileContractTypesCount` 6, `MaxProfileLocationsCount` 10, `MaxProfileLocationAreasCount` 10, `MaxProfileSalaryExpectationsCount` 3.
- Lengths: `MaxProfileLocationAreaItemLength` 100, `MaxProfileAdditionalConditionsLength` 500.
- Salary: `MaxSalaryAmount` (e.g. 100_000_000); currency regex `^[A-Z]{3}$` inline on the entry.

### Steps (not started)

| # | Item | Status |
|---|---|---|
| C1 | `ValidationConstants` + `ContractType`/`SalaryPeriod` enums + `PreferredLocationEntry`/`SalaryExpectation` classes | Done |
| C2 | `UserProfile` entity — add the 5 fields | Done |
| C3 | Migration (new `text` + JSONB columns) | Done |
| C4 | `ProfileDTO` + `ProfileResponseDto` — validation + `ToProfile`/`ApplyTo`/`ToResponseDto` wiring | Done |
| C5 | `ProfileDTOTests` — new-field validation (currency/country regex, count caps, salary range, `AdditionalConditions` HTML-reject) + `WorkingRightEntry` omitted-`Status` now fails (nullable+`[Required]` fix in C1) | Done |
| C6 | `FormatUserMessage` + `AlignmentPrompt` + Alignment model `concern` (the analysis payoff) | Done |
| C7 | Frontend profile form — conditions section + country/currency suggestion lists | Done |
| C8 | Frontend alignment display — show `concern` when present | — |

Wording/structure polish for the reworked `AlignmentPrompt` is done (three-branch example set covering skill-gap/condition-cap/concern, plain-language REASONING guard so scoring-mechanism terms never reach the user). The `concern` threshold still needs tuning against real listings — verify once C8 (frontend display) and Steps 9–10 (analysis UI) are usable end to end.

### C7 Breakdown (Frontend Conditions UI) — Done

All of C7.1–C7.8b landed: types/constants/suggestions (`types/profile.ts`, `lib/validationConstants.ts`, `tagSuggestions.ts`), `CheckboxGroup`/`MultiSelectSection` (WorkModes, ContractTypes), `SalaryExpectationSection`, `PreferredLocationsSection` (per-entry `CountryCombobox` + nested `Areas` tag list), `AdditionalConditionsSection` (`Textarea` + client-side HTML-reject mirroring `ProfileDTO.Validate()`) — all mounted in `ProfilePage.tsx` under "What I'm looking for" / "Background". Component-level polish (layout, spacing) still pending — not blocking, tracked as follow-up below.

---

## Notes

### For the Analysis build (Steps 6–10)
- `Anthropic:ApiKey` is shared with the auto-fill parsing feature — no duplicate config key needed.
- Tests: mock `IAnalysisService` in controller tests; no live Claude calls in CI.

### Deferred / follow-up work
- **C7 component polish:** `PreferredLocationsSection` and `AdditionalConditionsSection` (and possibly the earlier C7.4/C7.5 components) need a visual/layout pass — built to match existing patterns functionally but not yet polished. Follow `.claude/skills/frontend-design/SKILL.md` when picking this up.
- **Demo profile reset (pairs with D16):** the demo user can edit their seeded profile, so the periodic demo-data reset + login re-seed (Demo/Auth step 2) must be extended to cover `UserProfile` — add the sample profile to `DemoSeed` and include it in the reset path.
- **Save analysis to job (separate scope):** *Questions to ask* and *Likely interview questions* get an optional "Save to job" action persisting them onto new optional `Job` fields (e.g. `QuestionsToAsk`, `InterviewQuestions`). Partially overrides "on-demand, not saved" for those two types only; the three assessment types stay ephemeral (D15). Adds `Job` fields + migration + save UI.
- **Profile quality score:** scoring util done — `utils/profileScore.ts`, config-driven, returns `{ score, breakdown }`; tests in `profileScore.test.ts`. Grading: WorkHistory 25, Skills 25, TargetRoles 15, Education/WorkingRights/Languages 10, Certs 5. `ScoreRing` component done (`components/ui/ScoreRing.tsx`) — SVG ring, OKLCH colour via shared `utils/scoreColor.ts` (also used by `ResponseRateCard`), animated fill on mount and score change; props: `size`, `strokeWidth`, `bgColor`; mounted in `ProfilePage` header. **Remaining:** per-section improvement hints from `breakdown`.
- **Form re-hydration (known issue):** `ProfilePage`'s effect re-runs `setForm(data)` on every refetch, so saving one section wipes unsaved edits in another mid-edit section. Left as-is (rare). Fix: hydrate once via a `hydrated` ref guard — per-section `savedValue` already comes from `data`.
- **Profile page: indicate analysis-required fields (after Steps 9–10):** once the analysis feature is fully wired, `ProfilePage` should visually flag which fields gate analysis — `TargetRoles`, `Skills`, `WorkingRights`, and at least one of `Certifications`/`WorkHistory`/`Education` (the `isProfileReady` predicate, D19) — distinct from the general completeness score ring, since a profile can score decently on the ring while still missing a gating field.

### Reference (profile page, done)
- Suggestion pools live in `components/profile/tagSuggestions.ts`. Sources: Languages → `iso-639-1`; Institutions → Hipolabs `world_universities_and_domains.json` (MIT); Roles / Skills / Certifications / Degrees → curated static lists. Custom free-text input is always allowed — lists only suggest.
