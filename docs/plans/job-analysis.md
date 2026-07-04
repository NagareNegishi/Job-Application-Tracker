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

---

## Open Decisions

Being resolved across sessions. Once settled, each item is folded into the Design Decisions table / field specs / API sections above and removed from this list.

**Pick up here (as of 2026-07-04):** Settled & folded — D1, D1a, D2, D3, D3b, D4, D5, D6, D7, D8, D9, D10. **Next: D11 (Claude failure / malformed JSON handling).**

Remaining: D11–D13 (analysis inputs/gating, output bounds), D14–D16 (frontend), D17 (testing).

**Analysis — inputs & gating**

### D11. Claude failure / malformed JSON handling — OPEN
Status code and response shape when the API errors or returns unparseable output.

**Analysis — output bounds**

### D12. Count bounds per type — OPEN
How many `skills` / `gaps` / `questions` each endpoint returns. Prompts need explicit min/max.

### D13. Max output tokens — OPEN
Per analysis call.

**Frontend**

### D14. Profile save model vs. the PUT/PATCH split — OPEN
One page-level Save (sends everything) vs. per-section save (partial PATCH). Drives whether the PATCH endpoint's partial semantics are actually used. Tied to D2.

### D15. Analysis result lifetime — OPEN
Results aren't saved server-side. Persist in component state across tab switches, or vanish on navigate-away?

### D16. Nav link + demo user — OPEN
Where the Profile link sits, and whether it shows for the demo user (403'd from analysis, but could still edit a profile?).

**Testing**

### D17. Coverage expectations — OPEN
Controller-test scope for the new profile + analysis controllers, mirroring existing conventions.

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

**Skills**
```json
{ "skills": ["TypeScript", "React", "REST APIs", "CI/CD"] }
```

**Gaps**
```json
{
  "gaps": [
    { "gap": "No Go experience", "advice": "Mention transferable systems knowledge from C#." },
    { "gap": "Limited cloud experience", "advice": "Highlight any AWS/Azure work, even personal projects." }
  ]
}
```

**Questions to ask**
```json
{ "questions": ["What does the on-call rotation look like?", "How is success measured in the first 90 days?"] }
```

**Likely interview questions**
```json
{ "questions": ["Tell me about a time you dealt with a difficult stakeholder.", "How do you approach performance optimisation?"] }
```

---

## Steps

### Profile

| # | Item | Status |
|---|---|---|
| 1 | Add `UserProfile` entity + migration | — |
| 2 | Add `ProfileDTO` (request) + `ProfileResponseDto` (response) | — |
| 3 | Add `GET /api/account/profile` + `PUT /api/account/profile` to `AccountController` | — |
| 4 | Add `/profile` page to frontend — tags input for `TargetRoles` and `Skills`; repeating entry forms for `WorkHistory` and `Education` (add/remove entries) | — |
| 5 | Add Profile nav link | — |

### Analysis

| # | Item | Status |
|---|---|---|
| 6 | Add `IAnalysisService` + `ClaudeAnalysisService` in `Services/` | — |
| 7 | Add `AnalysisController` at `/api/analyse` with 5 content-scoped endpoints (body: `description` + optional `role`/`company`); `[Authorize(Policy = "AiEnabled")]` + demo-block | — |
| 8 | Register `ClaudeAnalysisService` in `Program.cs` | — |
| 9 | Add analysis UI to Job Detail page — 5 independent buttons; pre-fill `description` from the job (prompt if empty); each shows its own result inline | — |
| 10 | Add ad-hoc triage entry point — paste a description, Alignment only | — |

---

## Notes

- `Anthropic:ApiKey` is shared with the auto-fill parsing feature — no duplicate config key needed once that feature is added.
- Tests: mock `IAnalysisService` in controller tests; no live Claude calls in CI.
- Profile page vs Settings: `/profile` is a dedicated page — profile is substantial enough to warrant its own route rather than a section in Settings.
- Country picker (frontend): stores the ISO 3166-1 alpha-2 code, displays full country names via `Intl.DisplayNames` (`new Intl.DisplayNames(['en'], { type: 'region' }).of('NZ')` → "New Zealand") — zero-dependency, reusable across projects.
- WorkingRights entry (frontend): reuse the country picker; default country from the browser locale/region; default status to "don't have it" (`RequiresSponsorship`) so users consciously set their actual right rather than accepting an assumed one.
- WorkHistory/Education entry (frontend): per-entry "I currently work/study here" checkbox — ticking it disables and clears the end-date field and sends `to: null`. Multiple entries may be current. Start date always required. Cap date inputs at the current month/year (no future dates).
- Profile quality: **now** a lightweight frontend advisory — a simple heuristic that flags "meets the minimum but thin; richer profiles give better analysis" when the 400 gate passes but content is sparse. A **full profile-quality score** (weighted 0–100 / meter + per-field improvement hints) is deferred to a **separate plan** — client-side only, like the dashboard. Add it to `docs/progress.md` upcoming work when this plan lands.
