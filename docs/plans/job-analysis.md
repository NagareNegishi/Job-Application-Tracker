# Job Analysis (AI Insights)

Status: **Done.** Two connected features: **Profile** (user's background + preferences, stored in the app) and **Job Analysis** (on-demand AI insights comparing profile against a job). Five analysis types, triggered from the job detail page, plus an ad-hoc "worth applying?" triage entry point that doesn't require a saved job. CV integration deferred — analysis uses profile text only.

---

## Key Decisions

| Decision | Reasoning |
|---|---|
| Separate endpoint per analysis type | Focused prompt per concern beats one large response |
| On-demand, not saved | Always fresh; no stale data when job description changes |
| `UserProfile` as a new table, not a JSON column | Multiple structured fields, updated independently; needs to be queryable/evolvable |
| `AnalysisController` at `/api/analyse` is content-scoped, not job-scoped | Takes the job's text in the request body, not a stored job id — serves both the saved-job flow and an ad-hoc paste through one endpoint |
| Ad-hoc entry point exposes Alignment only | It's a triage check ("worth pursuing?"); the other four only make sense for a job you're already tracking |
| Ad-hoc trigger kept separate from `ParseListingDialog`, not folded in | Triage is an optional pre-decision step; folding it into auto-fill would force every auto-fill through an extra rate-limited call and a profile-readiness gate parsing doesn't need |
| PUT creates, PATCH updates (JSON Merge Patch, RFC 7396) | Avoids re-sending/re-validating the full profile on every edit |
| Save is permissive; the analysis gate is strict | Profiles are built incrementally — PUT/PATCH accept sparse/empty input; required-content is enforced only at analysis time (400 if profile doesn't meet the minimum) |
| `WorkingRights` = array of `(country, status)` | One person can hold rights in multiple countries; a single enum can't express that |
| One shared `"analyse"` rate-limit policy, 5/min across all 5 types | Real use is slow (~5s latency + reading); shared because users burst across types, not repeat one |
| Analysis requires `AiEnabled` policy; blocks demo user (403) | Every Claude-backed feature sits behind AI access and demo cost protection, same as auto-fill parsing |
| `claude-haiku-4-5`, 512 max output tokens shared across all 5 types | Fast/cheap extraction, not reasoning; token cap is a truncation ceiling, not per-type tuning |
| Claude failure → 502 (`AnalysisFormatException`), no retry | Upstream dependency failed, not our bug — matches auto-fill parsing's error convention |
| Empty list results (`[]`) are valid, not malformed | A `Length >= 1` floor once rejected legitimate zero-overlap Skills results as a 502, contradicting the prompts' own "never fabricate/pad" instruction. Only `null` is now rejected |
| Analysis result lifetime is page-durable, not cached | Results live in Job Detail page state only; reset on refresh/navigate-away — reinforces "on-demand, always fresh" |
| Job Detail analysis UI gated by `hasRole("AiUser")` only | Demo account has no `AiUser` role, so this already hides the section for demo too; server-side 403 stays as defense in depth |
| Profile = Background + Conditions (global, not per-role) | Conditions apply across all target roles; per-role conditions rejected as rare-need/high-cost |
| Only Alignment reads Conditions | The other four are background-only; conditions are about fit/desire, which is Alignment's job |
| Alignment carries a soft `concern: string?` | Flags "looks like a scam / unclear listing" without refusing to answer — score + reasoning still return |
| Demo user's profile is wiped, not reseeded, on nightly reset | Unlike `Jobs`, profile is meant to be visitor-filled to demonstrate the feature — nothing to restore |

---

## Profile

**Background fields:** `TargetRoles`, `Skills`, `Certifications`, `Languages` (string lists), `WorkingRights` (`WorkingRightEntry[]`: country ISO-2 + `WorkingRight` enum), `WorkHistory` (`WorkHistoryEntry[]`), `Education` (`EducationEntry[]`).

**Conditions fields** ("what I'm looking for" — optional, doesn't gate analysis): `WorkModes` (reuses `WorkMode` enum), `ContractTypes` (new enum), `SalaryExpectations` (min-floor per currency, max 3), `PreferredLocations` (`{Country, Areas[]}`), `AdditionalConditions` (free text, catch-all for experience level/nuance).

Validation lengths/counts are in `ValidationConstants` — generous by design, bounds abuse not real users. Dates reject future values; `to == null` means current/ongoing.

```
GET/PUT/PATCH /api/account/profile
```
GET returns `{}` if unset (frontend uses this to decide PUT vs PATCH). PUT 409s if a profile already exists. PATCH is JSON Merge Patch — `[]` clears a field, 404 if no profile exists.

## Analysis

```
POST /api/analyse/<type>
```
Body: `{ description, role?, company? }`. 400 if `description` is missing/too short, or if the profile doesn't meet the minimum (`TargetRoles`, `Skills`, `WorkingRights` non-empty + one of `Certifications`/`WorkHistory`/`Education`) — same rule enforced client-side to disable the buttons.

| Type | Endpoint | Entry points |
|---|---|---|
| Alignment score (1–5 + reasoning + soft `concern`) | `/api/analyse/alignment` | saved job + ad-hoc |
| Top skills for this role (5–8) | `/api/analyse/skills` | saved job |
| Gap analysis (2–4, gap+advice pairs) | `/api/analyse/gaps` | saved job |
| Questions to ask (3–5) | `/api/analyse/questions-to-ask` | saved job |
| Likely interview questions (4–6) | `/api/analyse/interview-questions` | saved job |

Response shapes/prompts live in `Models/` and `Services/ClaudeAnalysisConfig.cs`.

## UI

- **Job Detail (`AnalysisSection`):** floating FAB → bottom `Sheet` with 5 buttons, shared disabled/error state, shared result area (`src/services/analysisService.ts` + `AnalysisSection.tsx`).
- **Ad-hoc triage (`AlignmentDialog` + `AlignmentResultView`):** `Dialog` (matches `ParseListingDialog`'s shape), wired into `JobTable.tsx`. On a positive result, hands off directly to `parseListing()` + `toFormFields()` in the same dialog, skipping `ParseListingDialog`.

---

## Notes

### Reference
- `Anthropic:ApiKey` shared with auto-fill parsing — no duplicate config key.
- Tests mock `IAnalysisService`; no live Claude calls in CI.
- Suggestion pools live in `components/profile/tagSuggestions.ts`. Sources: Languages → `iso-639-1`; Institutions → Hipolabs `world_universities_and_domains.json`; Roles/Skills/Certifications/Degrees → curated static lists. Custom free-text input always allowed.
- Country flags render via `CountryFlag.tsx` (shared by `CountryCombobox` and view-mode lists) — `fi fi-<code>` sprite classes from the `flag-icons` package, already a dependency and imported globally in `main.tsx`. Not emoji — sprites render consistently across platforms/fonts.
