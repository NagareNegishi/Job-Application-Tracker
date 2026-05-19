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
| Return 400 if profile not set | Analysis has no input without a profile; clear error, not a silent empty response |
| Block demo user (403) | Prevents API cost from demo accounts; same pattern as `DocumentsController` |
| `claude-haiku-4-5` model | Fast and cheap; each call is a single focused extraction, not reasoning |

---

## Profile

### Fields

| Field | Type | Purpose |
|---|---|---|
| `TargetRoles` | `string[]` | Roles the user is targeting — stored as JSON array |
| `Skills` | `string[]` | Skills as a tag list — stored as JSON array |
| `WorkHistory` | `WorkHistoryEntry[]` | Structured work experience entries — stored as JSON array |
| `Education` | `EducationEntry[]` | Structured education entries — stored as JSON array |

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
GET  /api/account/profile
PUT  /api/account/profile
Authorization: Bearer <token>
Content-Type: application/json
```

GET returns empty object `{}` if no profile saved yet (not 404).

PUT body:
```json
{
  "targetRoles": ["Senior Full-Stack Engineer", "Engineering Lead"],
  "skills": ["TypeScript", "React", "C#", "PostgreSQL"],
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
| 4 | Add `/profile` page to frontend with form for all four fields | — |
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
