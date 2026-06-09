# Company Verification API — Planning Doc

**Status:** Early planning. The architecture, contract method signature, normalized status enum, deployment, and licence are decided. Whether/when to expose an MCP server is **not finalized** (flagged inline as `[NOT FINALIZED]`).

**Relationship to other docs:** This is a **standalone, reusable component**. Its first consumer is the Job Application Rating API (see `job-application-rating-api.md`), but it is deliberately not coupled to it — any product needing "is this a real, active company in country X" could use it.

---

## Part 1 — The Idea (narrative)

### What it is

A small, focused service that answers one question well: **given a company identifier (or name) and a country, does this company exist and is it currently active?** — returning a normalized result regardless of which country's registry the data came from.

It is intentionally *horizontal* (useful far beyond job-application rating: onboarding, KYB, fraud checks, B2B flows), which is exactly why it's split out from the rating product. The rating product is vertical and changes with product decisions; this verification capability is stable and reusable, so it lives on its own.

### The core design: abstract contract + pluggable country adapters

There is **one abstract verification contract**, and a **separate adapter implementation per country**, each calling that country's official government registry. New countries are added by writing a new adapter, never by changing core logic. This is the same pattern as auth-strategy libraries, cloud-provider abstractions, and database drivers — a thin core with swappable backends.

### Resolution order (the key behavioral decision)

When asked to verify a company in some country, the service resolves a provider in this order:

1. **Native adapter** (first-party, highest quality) — e.g. New Zealand via NZBN.
2. **Community adapter** (contributed by others, must pass the conformance suite).
3. **Fallback provider** — wrap an existing multi-country source so unsupported countries still get *some* answer.
4. **Unsupported** — return a clear "no adapter for this country" result.

This gives day-one breadth (via fallback), high quality where it matters (native adapters), and an open path for others to contribute.

### MVP scope

- **New Zealand** → native NZBN adapter. **Must build** — NZ is the primary market. OpenRegistry lists NZ Companies Office as a covered jurisdiction, but their NZ implementation is undocumented (no upstream source published, unlike every other jurisdiction they cover), making it a black box for the primary market. The native NZBN adapter gives known scope, ETag recheck support, and watchlist monitoring that OpenRegistry's NZ coverage cannot be verified to provide.
- **Australia** → covered for free by the fallback (its registry, ABR, is in the fallback's coverage). A native ABN adapter is optional, added later only for freshness/monitoring control.
- **Everything else** → fallback where covered, otherwise "unsupported."

### Important limitation (must be respected, not a decision)

Registry "active" status means the entity is **legally alive** (and for Australia's ABN, tied to current trading) — it does **not** prove the company is actually hiring or operating as a going concern. Verification filters out dead shells; it is **not** proof of a real vacancy. For the rating product, the ghost-job signal must come from the applicant-reported side, not from this service.

---

## Part 2 — Specification

### The contract — design rules

**Method:** `Search(name, country)` — the single operation every adapter must implement.

**Input:** company name string, country code.

**Output:** `List<CompanyCandidate>` where each candidate contains:
- Registry-native ID (format is registry-specific — NZBN is 13-digit, ABN is 11-digit, etc.)
- Company name
- Country
- Additional fields as a key-value collection — what goes in here is the adapter's responsibility

**Empty list `[]` means not found.** No active company matched the name in that registry. This is a valid result, not an error. What the consuming application does with a not-found result (block a submission, show an error) is outside this service's concern.

**Adapter filtering rules (enforced, not optional):**
- Filter out non-active statuses before returning — only legally alive entities appear in results.
- Filter out non-company entity types before returning — sole traders, partnerships, trusts, and similar are excluded. The purpose is company verification; these types are unlikely to be posting jobs.
- What counts as "active" and what counts as a "company type" is the adapter's decision, but it must be explicitly declared in the adapter's conformance declaration (see Conformance suite below).

**Other design rules:**
- Richer data (officers, financials, etc.) must never be required by the contract — it belongs in the key-value additional fields only.
- The fallback is optional and swappable — configured per deployment, never hard-coded.
- A conformance test suite and declaration file gate every adapter.

### Normalized status enum

Reconciled against the actual status vocabularies of NZ, AU, and UK registries. The enum is confirmed:

`ACTIVE`, `CANCELLED`, `REMOVED`, `IN_LIQUIDATION`, `UNKNOWN`

**Registry mappings (for reference and adapter declaration use):**

| Enum value | NZ (NZBN) | AU (ABR) | UK (Companies House) |
|---|---|---|---|
| `ACTIVE` | `Registered` | `Active` | `active`, `registered` |
| `CANCELLED` | — | `Cancelled`, `Not Active` | `voluntary-arrangement` |
| `REMOVED` | `Removed`, `Deregistered` | — | `dissolved`, `removed`, `converted-closed` |
| `IN_LIQUIDATION` | — | — | `liquidation`, `receivership`, `administration` |
| `UNKNOWN` | anything else | anything else | anything else |

UK is included for future reference — it is not MVP scope. Each adapter's YAML declaration must explicitly state its own mapping using the registry's exact status strings.

Note: the normalized enum is used for the re-check/monitoring layer. The `Search` contract does not return the enum — it filters by it internally (only `ACTIVE` entities are returned). The enum surfaces in stored records and monitoring logic.

### Data sources

**New Zealand — NZBN API (native, MVP)**
- Free; requires a free subscription key (read-only) or OAuth2 for writes.
- Base URL: `https://api.business.govt.nz/gateway/nzbn/v5/` — same host for sandbox and production; subscription key type is what differs. Verified May 2026.
- Returns company status; covers companies, other entity types, and registered sole traders/partnerships/trusts.
- Recheck features: **ETags** (send `If-None-Match`; a `304` means unchanged — cheap rechecks) and a **watchlist** capability for monitoring a set of businesses. Monthly bulk download (JSON/CSV) for initial load.
- Note: Australian companies operating in NZ sit on a separate Overseas Register with distinct identifiers.

**Australia — ABN Lookup (optional native; otherwise via fallback)**
- Free; requires a free authentication GUID. SOAP or plain HTTP GET/POST.
- Status: `Active` / `Cancelled` / `Not Active`, updated daily, plus a status-date field to compare on recheck. Returns the ASIC number (ACN).
- Limitations: no director/officer data (would need ASIC for that); trading names not updated since 2012 — match on legal name.

**Fallback — OpenRegistry (candidate, with caveats)**
- Base URL: `https://openregistry.sophymarine.com` — all endpoints (MCP, auth, jurisdictions) use this single host. Verified May 2026.
- An MCP-native hosted service proxying ~27 national registries live (verbatim government data, no cache). Covers **Australia (ABR)**. Lists **New Zealand (NZ Companies Office)** as a covered jurisdiction, but their NZ implementation is undocumented — the upstream source they call is not published, unlike every other jurisdiction they cover. Treat NZ via OpenRegistry as an unverified backstop only, not a substitute for the native NZBN adapter.
- Pricing: free tiers (anonymous 20 req/min per IP; signed-in 30/min), then Pro $9/mo, Max $29/mo, Enterprise by contact. Auth via OAuth 2.1 (no API keys).
- **ToS verified (2026-05-16).** Wrapping OpenRegistry as a configurable fallback is permitted. Specific restrictions that apply:
  - Do not redistribute its responses as a commercial dataset-for-sale.
  - Do not use it to build a competing general-purpose registry proxy.
  - Per-deployment credentials are required by design — shared credentials cannot be bundled.
  - Governed by the laws of England and Wales (jurisdiction mismatch for a NZ-primary project — minor but noted).
- **Remaining caveats:**
  - It is **closed-source** (the public repo is documentation only) — so it can only be *consumed*, not extended.
  - Treat it as *a* configurable fallback, swappable for OpenCorporates or another provider.

**Note on calling the fallback:** the verification service calling OpenRegistry is a plain MCP client reading JSON — **no LLM, no token cost.** Token cost only arises if *this* service is later exposed as an MCP server that an AI agent calls.

### Re-check / monitoring design

Active status must be re-verified on a recurring basis, **at least every 6 months** (a floor, not a target). Prefer push/notification over blind polling where the source supports it.

- Store the **canonical registry id** at verification time (NZBN / NZ company number; ABN/ACN), not the name.
- **NZ:** use ETags (`If-None-Match`) and/or a watchlist for near-real-time change detection; the 6-month timer is just a backstop.
- **AU:** no push mechanism — re-query on schedule and compare the returned status + status date. Daily-updated source allows more frequent polling if wanted.
- Normalize each registry's status into the enum; cache last status + `last_checked` per company.
- Storage is behind `IVerificationStore` (defined in Core). Dev and test use `InMemoryVerificationStore`. The production implementation (Neon/PostgreSQL) is added when re-check/monitoring is built. Whether an adapter uses the store at all is the adapter's decision — adapters with native re-check support (e.g. NZBN ETags) may not need it.

### Front doors (output interfaces)

The core verification logic is the same regardless of how it's consumed. Possible front doors, added as consumers appear:

- **Library** — referenced directly (e.g. a NuGet package) by .NET consumers like the rating platform.
- **HTTP API** — for web apps and cross-language consumers.
- **MCP server** — so AI agents can call it as a tool. `[NOT FINALIZED]` — whether and when to build this; defer until a real agent consumer exists. The official C# MCP SDK (`ModelContextProtocol`, with `ModelContextProtocol.AspNetCore` for HTTP servers) makes this a thin add-on later.

Keep every front door a **thin wrapper over the core** — no business logic in a transport layer.

### Conformance suite

Two gates every adapter must pass before merging to main:

**1. YAML conformance declaration (required artefact)**

Every adapter ships a YAML declaration file alongside its code. No declaration = merge blocked. Incomplete declaration = merge blocked. A reviewer verifies the declaration against the registry's published documentation without reading the full adapter code.

Required fields in the declaration:
- Registry name and source URL
- Status values included (map to `ACTIVE`) using the registry's exact strings
- Status values excluded, using the registry's exact strings
- Entity types included as "company", using the registry's exact type strings
- Entity types excluded, using the registry's exact type strings

**2. Conformance test suite (automated)**

A standard battery every adapter must pass:
- A known active company name returns a non-empty list containing that company
- A known dissolved/cancelled company name returns `[]`
- A known sole trader or non-company entity name returns `[]`
- A name that does not exist in the registry returns `[]`
- An upstream outage surfaces a clean, structured error

Fixtures (recorded registry responses) so adapters are testable **offline** — a contributor in another country cannot run NZ's live tests and vice versa.

### Tech & repo

- **Solution shape:** `CompanyVerification.Core/` (class library — contract, adapters, `IVerificationStore`, `InMemoryVerificationStore`) + `CompanyVerification.Api/` (HTTP front door, future `NeonVerificationStore`) + `CompanyVerification.Tests/` (xUnit). Monorepo MVP; designed for clean extraction.
- **Stack:** C# / .NET 10. Confirmed choice — matches the consuming product and the team's learning direction. .NET 10 is LTS, supported until November 2028. Because the boundary is a package/HTTP/MCP contract, the verification service *could* even be a different language than its consumers — an option, not a plan.
- **Repo:** MVP as a sibling directory in the monorepo; designed to be cleanly extractable into its own repo later (e.g. `git subtree split`) if/when opened to the public.
- **Licence:** AGPL 3.0. Free for non-commercial use. Commercial use (using this in a product or service that generates revenue) requires a separate commercial licence from the project owner. AGPL's copyleft clause means anyone running a modified version as a network service must publish their source — this creates natural pressure for commercial users to seek a paid licence rather than building on it silently. `LICENSE` file goes in the repo root before the first commit.
- **CLA (Contributor License Agreement):** Required from all external contributors before their code is merged. Grants the project owner the right to relicense contributions, preserving the option to move to a commercial or dual licence later. Set up `CLA.md` and CLA Assistant (GitHub App) before the first external pull request — not before coding starts.
- **Adapter firewall rule:** every new adapter must add its registry hostname to `.devcontainer/project-firewall.sh` before dev container code can reach it. The script is the auditable list of all external registries this service calls.
- **HTTPS in dev:** HTTP only. Registry data is public; no user credentials or personal data in transit. Render handles TLS termination in prod — the app serves plain HTTP behind their reverse proxy.
- **NuGet publishing threshold:** publish `0.1.0` when the NZ native adapter returns real NZBN results (not mocked). Declare `1.0.0` after the Rating API consumes it in production and the `Search()` signature has not changed for 4–6 weeks of real use.

### Bootstrap order

Set up the environment before any .NET code, so Claude Code is configured and constrained from the first commit:

1. Create directory + `git init`
2. `.devcontainer/` files (`Dockerfile`, `docker-compose.yml`, `devcontainer.json`, `.env`, `project-firewall.sh`)
3. `.claude/` config (`settings.json` + `CLAUDE.md`)
4. `LICENSE` (AGPL 3.0)
5. Initial commit
6. Open directory in its own VS Code dev container
7. Scaffold .NET solution + projects from inside that container

### Deployment architecture

Zero-cost hosting. Cold start is a known, accepted tradeoff — documented here, not treated as a bug.

- **App hosting:** Render free tier. Sleeps after 15 minutes of inactivity; first request after idle takes up to ~30 seconds. Acceptable because the verify step is an explicit user-triggered gate (spinner shown), not a background call.
- **Database:** Neon free tier (serverless PostgreSQL). Compute auto-pauses and resumes transparently on connection; adds ~100–300ms to the first query after idle. 0.5 GB storage. Chosen over Supabase because Supabase pauses the entire project after 1 week of inactivity and requires manual intervention to unpause — incompatible with low-traffic early stage. `[DEFERRED — not needed until IVerificationStore has a PostgreSQL implementation]`
- **CI/CD:** GitHub Actions (free for public repos). Deploys to Render via deploy hook on push to main.
- **Local development:** Dev container with .NET 10 SDK only — no PostgreSQL service until the Neon/PostgreSQL store implementation is built.

**Known limitations to document:**
- Render free tier: 750 instance-hours/month; no custom domain (`.onrender.com` URL).
- Neon free tier: 0.5 GB storage cap.
- Upgrade path: move to Render paid tier ($7/month, no sleep) if the project gains traction. Architecture does not need to change — tier only.

---

## Open decisions (summary)

- Whether to build a native AU/ABN adapter now or rely on the fallback.
- Fallback provider not locked: OpenRegistry is the candidate — ToS verified (wrapping permitted), closed-source, lists NZ but NZ implementation is undocumented. Still swappable.
- Whether/when to expose this service as an MCP server.
- Config/secrets contract for per-deployment adapter credentials — direction agreed, details undrafted.
- YAML declaration schema — structure agreed, formal schema not yet written.
