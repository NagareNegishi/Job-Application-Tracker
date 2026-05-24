# Auto-Fill Job Details (AI Parsing)

## Overview

AI users get a `ParseListingDialog` before the Add Job sheet. User pastes raw listing text → backend sends it to Claude API → returns a partial `JobDTO` → create sheet opens pre-filled. User reviews and saves. Non-AI users go straight to the create sheet. AI users can opt out via a settings toggle. Phase 1 only (copy-paste). Phase 2 (URL fetch) deferred.

---

## Design Decisions

| Decision | Reasoning |
|---|---|
| `IParsingService` / `ClaudeParsingService` in `Services/` | Follows existing service abstraction pattern (`IStorageService`, `IEmailService`); mockable in tests |
| `claude-haiku-4-5` model | Fastest and cheapest; extraction task doesn't need reasoning depth; latency matters in a form UX |
| Structured JSON prompt (system prompt defines schema) | More reliable field extraction than free-text; Claude returns valid JSON consistently with a tight schema |
| `POST /api/jobs/parse` returns partial `JobDTO` shape | Frontend already knows the `JobDTO` shape; no new types needed |
| `ParseListingDialog` as a separate entry point before `JobCreateSheet` | Enforces auto-fill → adjust flow; avoids mid-form mode switching and the confusion of switching from manual to auto partway through |
| `JobCreateSheet` accepts optional `initialData` prop | Dialog passes parsed fields to the sheet; sheet stays self-contained and reusable for the manual flow |
| No retry in `ParseListingDialog` | Same text → same result (deterministic extraction); wrong text → re-paste. Retry UI implies non-determinism that doesn't exist |
| `autoFillEnabled` stored in existing `Preferences` JSON blob on `ApplicationUser` | No migration needed — existing string column already holds JSON; adding a field to `UserPreferencesDto` with `= true` default covers users who have never saved this preference |
| `autoFillEnabled` defaults to `true` for AI users | Dialog-first is the intended flow; users who prefer manual can opt out in settings |
| Toggle only shown in Settings for AI users | Non-AI users never see the dialog, so the toggle is irrelevant to them |
| Fail-fast on missing `Anthropic:ApiKey` | Matches existing JWT config validation pattern in `Program.cs` |
| Block demo user (403) | Prevents API cost from demo accounts; same pattern as `DocumentsController` |
| `[Authorize(Policy = "AiEnabled")]` on the endpoint | Restricts parsing to users with `"AiUser"` role — policy defined in `ai-access-admin` plan |
| 2 requests per minute per IP via `[EnableRateLimiting("parse")]` | Each call costs money; 2 covers the paste-correction case (wrong paste → fix → retry); reuses existing rate limiter pattern |
| `MaxRetries = 0` on `AnthropicClient` | Auto-retry on traffic failures adds 10–30 s of backoff with no benefit — fail fast and surface the error to the user |
| `Temperature` not set in `MessageCreateParams` | `Temperature` is `[Obsolete]` in SDK v12.x — models after Opus 4.6 reject non-1.0 values with 400. Haiku 4.5 predates Opus 4.6 by version number but the risk isn't worth taking. If the model changes, revisit. Prompt design (explicit rules + examples) enforces deterministic extraction without it. |
| `[JsonPropertyName("company")]` attributes on `ParsedJobFields`; no `PropertyNameCaseInsensitive` | Explicit contract — JSON key mapping is visible in the model. Wrong casing from Claude is treated as a contract violation: logged as unexpected key, value dropped. Keeps the schema strict and predictable. |
| Known keys for logging derived from `[JsonPropertyName]` attributes via reflection (`static readonly HashSet<string>`) | Single source of truth — model is the contract. Adding a field to `ParsedJobFields` automatically includes it in the known keys set. Hardcoded list risks silently going stale. Computed once at class load (`static readonly`) so reflection cost is paid once. |
| `IValidatableObject` for HTML detection in `ParseListingRequest`; not `[RegularExpression]` | `[RegularExpression]` validates that a value matches a pattern — inverting it (must NOT contain HTML) requires a confusing negative lookahead. `IValidatableObject` keeps the rule readable and matches `JobDTO`'s cross-field validation pattern. |
| HTML validation error is `"Invalid request."` — generic, no detail | Only a crafted API request triggers this rule — a real user pasting into a textarea never produces HTML in the body. A descriptive message would tell the attacker exactly what to remove. |
| No `IsDemo()` check on the parse endpoint | `[Authorize(Policy = "AiEnabled")]` already blocks the demo user — demo account is never granted `"AiUser"` role. An explicit `IsDemo()` guard would be redundant and misleading (implies it's the actual guard when it isn't). |

---

## API Shape

### Request
```
POST /api/jobs/parse
Authorization: Bearer <token>
Content-Type: application/json

{ "text": "<raw job listing text>" }
```

Fields never parsed: `status` (always `Wishlist`), `priority` (always `Low`), `appliedAt` (not applied yet), `notes` (always empty at parse time).

### Validation (backend only — no frontend check needed)

| Condition | Response |
|---|---|
| Empty or whitespace-only | 400 Bad Request |
| Over 8,000 characters | 400 Bad Request |
| Contains HTML tags (`<[a-zA-Z/]`) | 400 Bad Request |

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

Fields not found are omitted (not null) — frontend skips them in the merge step. `description` is always present (the pasted text).

---

## Prompt Design

System prompt uses a RULES section + Fields section + two examples (full and partial extraction).

Key decisions:
- workMode: inferred from phrasing, not keyword matched. One value only; omit if unclear.
- salaryMin/salaryMax: integers, no currency assumption. Fixed salary → salaryMin only; salaryMax omitted.
- location: "where the role is based" — avoids matching eligibility or visa text.
- Fields not found are omitted (not null) — matches `[JsonIgnore(WhenWritingNull)]` on the model.
- Full extraction example included so Claude knows the exact expected shape.

`description` is not extracted by Claude — the backend passes the input text through directly.

---

## Steps

**Prerequisite:** `ai-access-admin` plan must be completed first — the `"AiEnabled"` policy and `"AiUser"` role must exist before this plan's step 3.

| # | Item | Status |
|---|---|---|
| 1 | Add `Anthropic:ApiKey` to config + fail-fast validation in `Program.cs` | ✅ |
| 2 | Add `ParsedJobFields` model + `IParsingService` + `ClaudeParsingService` (full impl) + `ClaudeParsingConfig` | ✅ |
| 3 | Add `ParseListingRequest` DTO + input validation + `POST /api/jobs/parse` with `[Authorize(Policy = "AiEnabled")]` + `[EnableRateLimiting("parse")]` in `JobsController` | ✅ |
| 4 | Register `ClaudeParsingService` + add `"parse"` rate limit policy (2 per minute per IP) in `Program.cs` | ✅ |
| 5 | Add controller tests for `POST /api/jobs/parse` — mock `IParsingService`; cover: 200 with partial result, 400 empty input, 400 over 8000 chars, 400 HTML input | ✅ |
| 6 | Add `bool AutoFillEnabled { get; set; } = true` to `UserPreferencesDto` | — |
| 7 | Add `autoFillEnabled: boolean` to frontend `Preferences` type in `preferencesService.ts` | — |
| 8 | Add AI-only `autoFillEnabled` toggle to `SettingsPage` | — |
| 9 | Revert collapsible section from `JobCreateSheet`; add optional `initialData?: Partial<FormState>` prop | — |
| 10 | New `ParseListingDialog` — textarea, "Fill fields" (calls `/api/jobs/parse`, loading + error state, passes result to sheet), "Fill manually" (opens sheet empty), Cancel | — |
| 11 | Wire "Add job" in `JobPage` — check `hasRole("AiUser")` + `autoFillEnabled` → dialog or sheet | — |

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

### Anthropic.SDK (tghamm)
Community C# NuGet package. Install: `dotnet add package Anthropic.SDK`.

**Switched from official `Anthropic` package (v12.23.0).** Official package is auto-generated from the API spec (Stainless) — not human-maintained C#. Auto-generated code does not follow C# conventions: response types use a discriminated union with no ergonomic helpers; `OfType<TextBlock>()` silently returns empty (CA2021). "Actively maintained" means API-spec-synchronized only, not C# experience maintained. tghamm uses standard C# inheritance — idiomatic, documented, maintainable. Extra dependency is the correct tradeoff when the official package harms maintainability.

**SDK API shape — verified from tghamm README + build 2026-05-24:**
- Namespace: `Anthropic.SDK.Messaging` (not `Anthropic.SDK.Messages` as README implies)
- Client: `new AnthropicClient(apiKey, new HttpClient())` — explicit no-retry HttpClient; fail fast by design
- Send: `await client.Messages.GetClaudeMessageAsync(new MessageParameters { ... })`
- Role: `RoleType.User`; Message param: `new Message(RoleType.User, text)`
- Read response: `response.Content.OfType<TextContent>().FirstOrDefault()?.Text ?? string.Empty` ✅

---

## Notes

- `description` is the pasted text passed through directly (not Claude-extracted). No sanitization needed — HTML tags are rejected at validation (400). A browser textarea strips HTML on paste, so HTML in the request body signals a crafted/attacker request, not a real user.
- `ParsedJobFields.ClosedAt` uses `DateOnly?` (not `DateTime?`) — serializes as `"YYYY-MM-DD"`, which works directly with frontend date inputs. `DateTime?` would produce `"T00:00:00"` suffix that breaks the input value.
- Tests: mock `IParsingService` in controller tests; no live Claude calls in CI.
