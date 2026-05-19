# Auto-Fill Job Details (AI Parsing)

## Overview

A "Parse" button in the Add Job sheet. User pastes raw listing text → backend sends it to Claude API → returns a partial `JobDTO` → form fields pre-filled. User reviews and saves. Phase 1 only (copy-paste). Phase 2 (URL fetch) deferred.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| `IParsingService` / `ClaudeParsingService` in `Services/` | Follows existing service abstraction pattern (`IStorageService`, `IEmailService`); mockable in tests |
| `claude-haiku-4-5` model | Fastest and cheapest; extraction task doesn't need reasoning depth; latency matters in a form UX |
| Structured JSON prompt (system prompt defines schema) | More reliable field extraction than free-text; Claude returns valid JSON consistently with a tight schema |
| `POST /api/jobs/parse-listing` returns partial `JobDTO` shape | Frontend already knows the `JobDTO` shape; no new types needed |
| Merge strategy: only fill empty fields | Prevents overwriting data the user typed manually before hitting Parse |
| Collapsible textarea in Add Job sheet | Keeps the form clean for users who don't need parsing; expands on demand |
| Fail-fast on missing `Anthropic:ApiKey` | Matches existing JWT config validation pattern in `Program.cs` |
| Block demo user (403) | Prevents API cost from demo accounts; same pattern as `DocumentsController` |

---

## API Shape

### Request
```
POST /api/jobs/parse-listing
Authorization: Bearer <token>
Content-Type: application/json

{ "text": "<raw job listing text>" }
```

### Response — full extraction
```json
{
  "company": "Acme Corp",
  "role": "Senior Engineer",
  "jobUrl": "https://boards.greenhouse.io/acme/jobs/123",
  "location": "Auckland",
  "workMode": "Hybrid",
  "salaryMin": 120000,
  "salaryMax": 150000
}
```

### Response — partial extraction (fields not found are omitted)
```json
{
  "company": "Acme Corp",
  "role": "Senior Engineer"
}
```

Fields not found are omitted (not null) — frontend skips them in the merge step.

---

## Prompt Design

System prompt instructs Claude to extract these fields from raw listing text: `company`, `role`, `jobUrl`, `location`, `workMode` (`Remote` / `Hybrid` / `OnSite`), `salaryMin`, `salaryMax` (integers, NZD assumed). Return valid JSON only, no prose. Omit fields not found.

---

## Steps

| # | Item | Status |
|---|---|---|
| 1 | Add `Anthropic:ApiKey` to config + fail-fast validation in `Program.cs` | — |
| 2 | Add `IParsingService` + `ClaudeParsingService` in `Services/` | — |
| 3 | Add `ParseListingRequest` DTO + `POST /api/jobs/parse-listing` in `JobsController` | — |
| 4 | Register `ClaudeParsingService` in `Program.cs` | — |
| 5 | Add collapsible textarea + "Parse" button to Add Job sheet | — |
| 6 | Call endpoint on Parse click; show loading and error state | — |
| 7 | Merge response into form state (empty fields only) | — |

---

## Dependencies

### Anthropic.SDK
Official C# NuGet package for the Claude API.

---

## Notes

- `Source` field is intentionally excluded from parsing — it describes where the user found the listing, not data within the listing itself.
- Tests: mock `IParsingService` in controller tests; no live Claude calls in CI.
