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
3. **Unsupported** — return a clear "no adapter for this country" result.

### MVP scope

- **New Zealand** → native NZBN adapter. Must build — NZ is the primary market.
- **Australia** → native ABR adapter. Planned after the NZBN adapter ships.
- **Everything else** → "unsupported" until a native adapter is written.
- **Long-term** → additional countries where an official public registry API exists. Coverage expands as APIs are researched and adapters are built.

### How this differs from existing services

Tools like OpenCorporates aggregate company data across hundreds of jurisdictions. This project does one thing: answer whether a company is currently active, using live queries to official registries. The code is open-source and self-hostable. NZ and AU are the initial targets. Coverage expands to other countries as official registry APIs are identified.

### Important limitation (must be respected, not a decision)

Registry "active" status means the entity is **legally alive** (and for Australia's ABN, tied to current trading) — it does **not** prove the company is actually hiring or operating as a going concern. Verification filters out dead shells; it is **not** proof of a real vacancy. For the rating product, the ghost-job signal must come from the applicant-reported side, not from this service.

---

## Part 2 — Specification

### The contract — design rules

**Method:** `Search(name, country)` — the single operation every adapter must implement.

**Input:** company name string (partial or full name accepted; case-insensitive matching is handled by the registry), country code.

**Input validation rules (enforced in the contract, not just the HTTP layer):**
- Name must not be null, empty, or whitespace — `ArgumentException` thrown.
- Name must not exceed 200 characters — `ArgumentException` thrown.
  (Longest real names are ~100 chars; 200 gives headroom without accepting abuse.)
- Name must contain no control characters (`\0`, `\r`, `\n`, `\t`, or any character below ASCII 32) — `ArgumentException` thrown. These have no place in a company name and can cause HTTP header injection in outbound requests.
- HTML angle brackets (`<` and `>`) are rejected as defense in depth — no real company name requires them.
- Unicode is permitted — NZ/AU company names include Māori characters (ā, ō) and other scripts.
- Country code must be a two-letter ISO 3166-1 alpha-2 code (e.g. `"NZ"`, `"AU"`), accepted case-insensitively and normalized to uppercase internally — `ArgumentException` thrown if null, empty, or not exactly two letters.

Validation lives in the contract so it applies regardless of transport (HTTP, library, direct test). The HTTP controller adds its own layer that returns `400 Bad Request` before the contract is reached.

**Output:** `List<CompanyCandidate>` where each candidate contains:
- Registry-native ID (format is registry-specific — NZBN is 13-digit, ABN is 11-digit, etc.)
- Company name
- Country
- Additional fields as a key-value collection — what goes in here is the adapter's responsibility

**Empty list `[]` means not found.** No active company matched the name in that registry. This is a valid result, not an error. What the consuming application does with a not-found result (block a submission, show an error) is outside this service's concern.

**Adapter filtering rules (enforced, not optional):**
- Filter out non-active statuses before returning — only legally alive entities appear in results.
- Filter out non-company entity types before returning. What counts as a "company type" varies by registry — some adapters include partnerships, trusts, or government bodies; others do not. Each adapter declares its inclusions and exclusions in its conformance YAML.
- What counts as "active" and what counts as a "company type" is the adapter's decision, but it must be explicitly declared in the adapter's conformance declaration (see Conformance suite below).

**Other design rules:**
- Richer data (officers, financials, etc.) must never be required by the contract — it belongs in the key-value additional fields only.
- Countries without a native adapter return "unsupported". No fallback provider is currently in use.
- A conformance test suite and declaration file gate every adapter.

### Registry status reference

Not a C# type — reference for adapter authors and conformance declarations. Each adapter's YAML must declare which of its registry's exact status strings it treats as active (included) and which it excludes.

| Status category | NZ (NZBN) | AU (ABR) | UK (Companies House) |
|---|---|---|---|
| **Active (include)** | `Registered` | `Active` | `active`, `registered` |
| Cancelled | — | — | `voluntary-arrangement` |
| Removed | `Removed`, `Deregistered` | — | `dissolved`, `removed`, `converted-closed` |
| In liquidation | — | — | `liquidation`, `receivership`, `administration` |
| Other | anything else | anything else | anything else |

UK is included for future reference — it is not MVP scope.

### Data sources

**New Zealand — NZBN API (native, MVP)**
- Free; requires a free subscription key (read-only) or OAuth2 for writes.
- Base URL: `https://api.business.govt.nz/gateway/nzbn/v5/` — same host for sandbox and production; subscription key type is what differs. Verified May 2026.
- Returns company status; covers companies, other entity types, and registered sole traders/partnerships/trusts.
- Recheck features: **ETags** (send `If-None-Match`; a `304` means unchanged — cheap rechecks) and a **watchlist** capability for monitoring a set of businesses. Monthly bulk download (JSON/CSV) for initial load.
- Note: Australian companies operating in NZ sit on a separate Overseas Register with distinct identifiers.

**Australia — ABN Lookup (optional native; otherwise via fallback)**
- Free; requires a free authentication GUID. SOAP or plain HTTP GET/POST.
- Status updated daily, plus a status-date field to compare on recheck. Returns the ASIC number (ACN).
- Limitations: no director/officer data (would need ASIC for that); trading names not updated since 2012 — match on legal name.

**Fallback — none**

OpenRegistry was the initial candidate. Ruled out June 2026: it is an MCP server with no REST API a C# adapter can call directly. No suitable replacement was identified. See `docs/decisions/OpenRegistry/OpenRegistry_Compliance_For_My_App.md`.

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

- **Solution shape:** `CompanyVerification.Core/` (class library — contract, adapters) + `CompanyVerification.Api/` (HTTP front door) + `CompanyVerification.Tests/` (xUnit). Monorepo MVP; designed for clean extraction. No store layer — service is stateless.
- **Stack:** C# / .NET 10. Confirmed choice — matches the consuming product and the team's learning direction. .NET 10 is LTS, supported until November 2028. Because the boundary is a package/HTTP/MCP contract, the verification service *could* even be a different language than its consumers — an option, not a plan.
- **Repo:** MVP as a sibling directory in the monorepo; designed to be cleanly extractable into its own repo later (e.g. `git subtree split`) if/when opened to the public.
- **Licence:** AGPL 3.0. Free for non-commercial use. Commercial use (using this in a product or service that generates revenue) requires a separate commercial licence from the project owner. AGPL's copyleft clause means anyone running a modified version as a network service must publish their source — this creates natural pressure for commercial users to seek a paid licence rather than building on it silently. `LICENSE` file goes in the repo root before the first commit.
- **CLA (Contributor License Agreement):** Required from all external contributors before their code is merged. Grants the project owner the right to relicense contributions, preserving the option to move to a commercial or dual licence later. Set up `CLA.md` and CLA Assistant (GitHub App) before the first external pull request — not before coding starts.
- **Adapter firewall rule:** every new adapter must add its registry hostname to `.devcontainer/project-firewall.sh` before dev container code can reach it. The script is the auditable list of all external registries this service calls.
- **HTTPS in dev:** HTTP only. Registry data is public; no user credentials or personal data in transit. Render handles TLS termination in prod — the app serves plain HTTP behind their reverse proxy.
- **NuGet publishing threshold:** publish the first public package when both the NZ and AU adapters return real results (not mocked). Declare `1.0.0` after the Rating API consumes it in production and the `Search()` signature has not changed for 4–6 weeks of real use.

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
- **Database:** None. Service is stateless — no persistence layer.
- **CI/CD:** GitHub Actions (free for public repos). Deploys to Render via deploy hook on push to main.
- **Local development:** Dev container with .NET 10 SDK only.

**Known limitations to document:**
- Render free tier: 750 instance-hours/month; no custom domain (`.onrender.com` URL).
- Upgrade path: move to Render paid tier ($7/month, no sleep) if the project gains traction. Architecture does not need to change — tier only.

---

## Open decisions (summary)

- Whether/when to expose this service as an MCP server.
- Config/secrets contract for per-deployment adapter credentials — pattern established: `IOptions<T>` per adapter, env vars with `__` section separator, root `.env.example` as the developer setup file. Each new adapter adds its own key to the root file.
- YAML declaration schema — structure agreed, formal schema not yet written.
