# Job Application Rating API — Planning Doc

**Status:** Early planning. Core concept and architecture are decided; scoring weights, aggregation, role verification, and the first consumer are **not finalized** (flagged inline as `[NOT FINALIZED]`).

**Relationship to other docs:** This product depends on a separate **Company Verification API** (see `company-verification-api.md`). That service is being built as a standalone, reusable component; this product is one of its consumers.

---

## Part 1 — The Idea (narrative)

### What it is

A crowdsourced platform that rates **companies on their hiring and application experience** — not on culture or salary (Glassdoor already does that), but specifically on how they treat applicants during a hiring process: how fast they respond, whether they ghost people, whether the role was even real, and the quality of any feedback given.

The angle that makes it different from anything that exists today is **two-sided data**. Applicants report their experience, and companies can optionally disclose hard facts: how many people applied to a role, and whether anyone was actually hired. When a company refuses or fails to provide that, the listing is flagged as **"information not provided / potential ghost job."** That flag is the core value — it surfaces companies that post roles they never intend to fill.

### Who uses it

- **Applicants** — submit their experience of applying somewhere; read other people's experiences before applying.
- **Companies** — optionally disclose applicant counts and hire outcomes, and respond publicly to reviews (like an employer rebuttal).
- **Anyone (public/read-only)** — look up a company's score before applying, via the website, an embeddable badge, or a browser extension that overlays scores on job boards.

### The flow

1. An applicant applies to a real role at a real company. They come to the platform and submit their experience: which stage they reached, whether they got a response, how long it took, whether they were ghosted and at what stage, and the quality of any feedback.
2. The company referenced in that submission is checked against the **Company Verification API** — it must be a real, currently-active company, or the submission can't anchor to it. (Verifying the *specific posting* is a separate, harder problem — see open questions.)
3. The company is notified and can either disclose the hard facts (applicant count, who was hired), respond publicly, or do nothing. Doing nothing produces the ghost-job flag.
4. Every submission produces a **per-application score** (0–100). All submissions for a company aggregate into a **company score** with a color band.
5. Consumers (badge, extension, third-party apps) read those scores through the public API.

### Why it's structured as an API

Everything is built API-first. The website, the embeddable badge, the browser extension, and any third-party integration are all just **consumers of the same public API**. The "plugin" isn't a separate system — it's one more client of the read endpoints.

---

## Part 2 — Specification

### Architecture — three sections behind one API gateway

1. **Company registry & verification** — confirms a company is real and active before it exists on the platform. This is **delegated to the Company Verification API** (separate doc), not built here.
2. **Feedback capture (two-sided)** — applicants submit experiences; companies submit disclosures and public responses. This is where the enums live.
3. **Scoring & visualization** — runs the scoring model, aggregates company scores, and serves everything the consumers render.

**Auth scopes** (on the gateway):

| Scope | Who | Can do |
|---|---|---|
| `public` | anonymous / API key | read-only, rate-limited |
| `applicant` | verified email / OAuth | submit feedback |
| `company` | verified via Company Verification API | submit disclosures, post responses |

### Enums

Closed sets — **no free-text "other."** Users may suggest new values, which land in an admin review queue and only appear after approval. Forms read the live enum list from the API.

- **company_transparency:** `FULL`, `PARTIAL`, `NONE` (`NONE` triggers the ghost-job flag)
- **hire_outcome:** `HIRED_CONFIRMED`, `POSITION_FILLED_OTHER_CANDIDATE`, `POSITION_CLOSED_NO_HIRE`, `POSITION_REPOSTED`, `UNKNOWN`
- **response_status:** `NO_RESPONSE`, `AUTO_ACKNOWLEDGEMENT`, `GENERIC_REJECTION`, `PERSONAL_REJECTION`, `PERSONAL_RESPONSE`, `ADVANCED_TO_NEXT_STAGE`
- **stage_reached:** `APPLIED`, `AUTO_REJECTED`, `RECRUITER_SCREEN`, `ASSESSMENT_OR_TASK`, `FIRST_INTERVIEW`, `MULTI_ROUND_INTERVIEW`, `FINAL_INTERVIEW`, `OFFER`, `HIRED`
- **ghosted_at_stage:** `NOT_GHOSTED`, `AFTER_APPLICATION`, `AFTER_SCREEN`, `AFTER_ASSESSMENT`, `AFTER_FIRST_INTERVIEW`, `AFTER_FINAL_INTERVIEW`, `AFTER_OFFER_DISCUSSION`
- **feedback_quality:** `MEANINGFUL_TAILORED`, `GENERIC_NON_TAILORED`, `AI_GENERATED`, `NONE`
- **response_time_bucket:** `WITHIN_24H`, `WITHIN_3_DAYS`, `WITHIN_1_WEEK`, `WITHIN_2_WEEKS`, `WITHIN_1_MONTH`, `OVER_1_MONTH`, `NEVER`

`[NOT FINALIZED]` — The specific enum *values* above are a working draft and likely to change once real submissions reveal missing cases.

### Scoring model

Per-application score: **start at 100, subtract one penalty per dimension, clamp to 0–100.** States within a dimension are mutually exclusive, so penalties don't double-count within a dimension but do stack across dimensions.

`[NOT FINALIZED]` — All penalty weights below are example values to be tuned.

| Dimension | State | Penalty |
|---|---|---|
| Transparency | `FULL` / `PARTIAL` / `NONE` | 0 / −5 / −10 |
| Hire outcome | `HIRED_CONFIRMED` | 0 |
| | `POSITION_FILLED_OTHER_CANDIDATE` | −5 |
| | `POSITION_CLOSED_NO_HIRE` / `UNKNOWN` | −10 |
| | `POSITION_REPOSTED` | −15 |
| Feedback | `MEANINGFUL_TAILORED` | 0 |
| | `GENERIC_NON_TAILORED` | −10 |
| | `AI_GENERATED` | −20 |
| | `NONE` | −30 |
| Response time | `WITHIN_24H`…`WITHIN_1_WEEK` | 0 |
| | `WITHIN_2_WEEKS` | −5 |
| | `WITHIN_1_MONTH` | −10 |
| | `OVER_1_MONTH` / `NEVER` | −15 |

`score = clamp(100 − Σ penalties, 0, 100)`

**Color bands:** 85–100 green · 65–84 light green · 45–64 amber · 25–44 orange · 0–24 red.

**Company score** = aggregate of per-application scores. `[NOT FINALIZED]` — aggregation method undecided: mean vs median, recency weighting, and whether to exclude/down-weight company-origin submissions so a company can't inflate its own score. The ghost-job flag should be both a **visible badge** and a score penalty, not a buried penalty alone.

### API endpoints (draft)

`[NOT FINALIZED]` — endpoint shapes are a working sketch.

```
# Feedback capture
POST /v1/feedback                     applicant scope · submit experience
POST /v1/companies/{id}/disclosures   company scope · applicant count + hire outcome
POST /v1/feedback/{id}/response       company scope · public reply
GET  /v1/enums                        public · current enum values for forms
POST /v1/enums/suggestions            any scope · propose a new enum value (review queue)

# Scoring & visualization
GET  /v1/companies/{id}/score         number + color band + ghost-job flag
GET  /v1/companies/{id}/distribution  histogram for charts
GET  /v1/search?company=&role=        lookup
GET  /v1/companies/{id}/badge.svg     embeddable plugin badge
```

### Consumers / plugins

Badge embed (easiest, opt-in), browser extension (overlays scores on LinkedIn/Indeed — highest impact, more work), third-party apps via the JSON API.

`[NOT FINALIZED]` — which consumer ships first (badge vs extension).

### Tech & repo

- **Stack:** leaning C# / .NET 10 + ASP.NET Core, chosen for continuity with the existing job-tracker codebase (same domain). `[NOT FINALIZED]` as a hard commitment, but this is the working choice.
- **Repo layout:** sibling directory to the existing job tracker in the same monorepo (not nested under it), so Claude Code context stays clean (siblings don't cross-load). Loose coupling enforced by having **no project reference** between them — they communicate only over HTTP. Launch the agent from this project's own directory.

---

## Open decisions (summary)

- Tech stack not hard-committed (working choice: C#/.NET 10).
- Exact enum values are a draft.
- Scoring penalty weights are example values to tune.
- Company-score aggregation method (mean/median, recency weighting, excluding company-origin data) undecided.
- **Role/posting verification** entirely open — likely a standardized title taxonomy (O*NET / ESCO) plus a posting-URL snapshot at submit time, but undecided.
- First consumer to ship (badge vs browser extension) undecided.
- Whether to expose this platform itself as an MCP server for AI agents — open, deferred until a real agent consumer exists.
