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

Fields never parsed: `status` (always `Wishlist`), `priority` (always `Low`), `appliedAt` (not applied yet), `notes` (always empty at parse time).

### Response — full extraction
```json
{
  "company": "Acme Corp",
  "role": "Senior Engineer",
  "jobUrl": "https://boards.greenhouse.io/acme/jobs/123",
  "location": "Auckland",
  "workMode": "Hybrid",
  "salaryMin": 120000,
  "salaryMax": 150000,
  "closedAt": "2026-06-30",
  "source": "LinkedIn",
  "description": "We are looking for a Senior Engineer to join..."
}
```

### Response — partial extraction (fields not found are omitted)
```json
{
  "company": "Acme Corp",
  "role": "Senior Engineer",
  "description": "We are looking for a Senior Engineer to join..."
}
```

Fields not found are omitted (not null) — frontend skips them in the merge step. `description` is always present (the sanitized pasted text).

---

## Prompt Design

System prompt instructs Claude to extract these fields from raw listing text: `company`, `role`, `jobUrl`, `location`, `workMode` (`Remote` / `Hybrid` / `OnSite`), `salaryMin`, `salaryMax` (integers, NZD assumed), `closedAt` (ISO date if closing date mentioned), `source` (infer from URL pattern or text style — e.g. LinkedIn, Seek, Indeed). Return valid JSON only, no prose. Omit fields not found.

`description` is not extracted by Claude — the backend passes through the sanitized input text directly.

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

## Logging

`ClaudeParsingService` logs warnings via `ILogger` for contract violations — not surfaced to the user, used to tune the prompt over time.

| Condition | Log level | Detail |
|---|---|---|
| Response contains text outside JSON (before or after) | Warning | log the raw response so the wrapper text is visible |
| Response includes a key not in the expected schema | Warning | log the unexpected key name |
| A parsed field is `null` (Claude returned the key but with null value) | Warning | log the field name |
| Claude returns an empty object `{}` | Warning | log so low-extraction rate is visible |

Strip surrounding text and attempt JSON parse regardless — log the anomaly but still return whatever was extractable.

---

## Dependencies

### Anthropic.SDK
Official C# NuGet package for the Claude API.

---

## Notes

- `description` is the pasted text passed through directly (not Claude-extracted), but must be sanitized on the backend before storing — raw HTML/script tags in pasted text would become stored XSS if the frontend ever renders description as HTML. Strip or encode tags on ingest.
- Tests: mock `IParsingService` in controller tests; no live Claude calls in CI.
