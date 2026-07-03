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
| `JobAnalysisController` — separate from `JobsController` | Five endpoints with their own route prefix keep `JobsController` clean |
| PUT creates, PATCH updates (separate endpoints) | Avoids re-sending and re-validating the full profile on every edit; only changed fields sent and validated on PATCH |
| Return 400 if profile not set | Analysis has no input without a profile; clear error, not a silent empty response |
| Block demo user (403) | Prevents API cost from demo accounts; same pattern as `DocumentsController` |
| `claude-haiku-4-5` model | Fast and cheap; each call is a single focused extraction, not reasoning |

---

## Open Decisions

Being resolved this session. Each item is rewritten from OPEN to the decision + reasoning once settled. Settled items get folded into the Design Decisions table / field specs above before implementation.

**Profile — API & data**

### D1. Clearing a field via PATCH — OPEN
Merge-patch by null-check can't distinguish "field omitted" (leave unchanged) from "field set to null" (clear it). Need a rule for clearing `WorkingRight` and for emptying the array fields.

### D2. PATCH array semantics — replace or merge — OPEN
When PATCH includes `skills` / `workHistory` / `education`, does it replace the whole array or append? How is a single entry deleted?

### D3. "Has a profile" definition for the analysis 400 check — OPEN
Is it row-exists, or row-has-meaningful-content? A PUT could create a row with all-empty arrays that passes a row-exists check but gives the AI nothing.

### D4. Required vs. optional fields on PUT — OPEN
Can a profile be created entirely empty, or is at least one field (e.g. `TargetRoles`) required?

### D5. GET empty-response shape — OPEN
GET returns `{}` when not created. Do the fields otherwise come back as empty arrays `[]`? Frontend needs a reliable "no profile yet" signal distinct from "profile exists but empty."

**Profile — validation**

### D6. Field limits — OPEN
Max string length per tag, max item count per array, max `description` length on `WorkHistoryEntry`. Project has a `ValidationConstants` pattern to follow.

### D7. Date validation — OPEN
`"YYYY-MM"` format enforcement on work history; `from`/`to` ordering; plausible year ranges on education.

**Analysis — inputs & gating**

### D8. Which Job fields feed the prompt — OPEN
Job has `Description`, `Notes`, `Role`, `Company`, `Location`, `WorkMode`, salary. Which subset goes to Claude, and what happens when `Description` (nullable) is empty?

### D9. AiUser role / `AiEnabled` policy gating — OPEN
Auto-fill parsing requires the `AiEnabled` policy. Plan currently states only `[Authorize]` + demo-block for analysis. Should analysis also be gated to AI-enabled users?

### D10. Rate limiting — OPEN
Parsing uses a `"parse"` 2/min policy. Five AI endpoints per job are costly. New policy, shared or per-endpoint?

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
| `WorkingRight` | `WorkingRight?` | Work authorisation status — single nullable enum |
| `WorkHistory` | `WorkHistoryEntry[]` | Structured work experience entries — stored as JSON array |
| `Education` | `EducationEntry[]` | Structured education entries — stored as JSON array |

**WorkingRight enum:**
| Value | Meaning |
|---|---|
| `Citizen` | NZ / AU citizen — unrestricted |
| `PermanentResident` | NZ / AU resident visa — unrestricted |
| `WorkVisa` | Current work visa — right exists but time-limited |
| `RequiresSponsorship` | No current right; needs employer sponsorship |
| `Other` | Has working rights through another arrangement |

**WorkHistoryEntry:**
| Sub-field | Type | Notes |
|---|---|---|
| `title` | `string` | Job title |
| `company` | `string` | Employer |
| `from` | `string` | Start date (`"YYYY-MM"`) |
| `to` | `string?` | End date (`"YYYY-MM"`); `null` = current role |
| `description` | `string` | Responsibilities and achievements |

**EducationEntry:**
| Sub-field | Type | Notes |
|---|---|---|
| `institution` | `string` | University or school |
| `degree` | `string` | Degree and field |
| `from` | `int` | Year started |
| `to` | `int?` | Year graduated; `null` = currently enrolled |

### API Shape

```
GET    /api/account/profile
PUT    /api/account/profile
PATCH  /api/account/profile
Authorization: Bearer <token>
Content-Type: application/json
```

**GET** — returns the profile, or empty object `{}` if not yet created (not 404).

**PUT** — creates the profile on first save. Returns 409 if a profile already exists. Frontend uses this only once (when GET returned empty).

**PATCH** — partial update on an existing profile; only fields included in the body are updated, omitted fields are left unchanged (merge patch, not JSON Patch spec). Returns 404 if no profile exists yet. Use for all edits after initial creation.

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

All endpoints:
- `POST /api/jobs/{jobId}/analyse/<type>`
- Require `[Authorize]`; block demo user (403)
- Return 400 if user has no profile saved
- Return 404 if job not found or belongs to another user

| Type | Endpoint |
|---|---|
| Alignment score | `POST /api/jobs/{jobId}/analyse/alignment` |
| Top skills for this role | `POST /api/jobs/{jobId}/analyse/skills` |
| Gap analysis | `POST /api/jobs/{jobId}/analyse/gaps` |
| Questions to ask | `POST /api/jobs/{jobId}/analyse/questions-to-ask` |
| Likely interview questions | `POST /api/jobs/{jobId}/analyse/interview-questions` |

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
| 7 | Add `JobAnalysisController` with 5 endpoints | — |
| 8 | Register `ClaudeAnalysisService` in `Program.cs` | — |
| 9 | Add analysis UI to Job Detail page — 5 independent buttons, each shows its own result inline | — |

---

## Notes

- `Anthropic:ApiKey` is shared with the auto-fill parsing feature — no duplicate config key needed once that feature is added.
- Tests: mock `IAnalysisService` in controller tests; no live Claude calls in CI.
- Profile page vs Settings: `/profile` is a dedicated page — profile is substantial enough to warrant its own route rather than a section in Settings.
