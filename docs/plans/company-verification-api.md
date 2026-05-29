# Company Verification API — Planning Doc

**Status:** Early planning. The architecture (abstract contract + per-country adapters + fallback) is decided. The exact contract signatures, the normalized status enum, whether/when to expose an MCP server, and the open-source/community governance are **not finalized** (flagged inline as `[NOT FINALIZED]`).

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

- **New Zealand** → native NZBN adapter. **Must build** — NZ is the primary market and is *not* covered by the chosen fallback.
- **Australia** → covered for free by the fallback (its registry, ABR, is in the fallback's coverage). A native ABN adapter is optional, added later only for freshness/monitoring control.
- **Everything else** → fallback where covered, otherwise "unsupported."

### Important limitation (must be respected, not a decision)

Registry "active" status means the entity is **legally alive** (and for Australia's ABN, tied to current trading) — it does **not** prove the company is actually hiring or operating as a going concern. Verification filters out dead shells; it is **not** proof of a real vacancy. For the rating product, the ghost-job signal must come from the applicant-reported side, not from this service.

---

## Part 2 — Specification

### The contract — design rules

1. **Lowest-common-denominator required surface.** Every adapter (native, community, and the fallback wrapper) must satisfy the interface, so the *required* output is only what is universal:
   - company exists (yes/no)
   - normalized status
   - canonical registry id
   - source reference (so any result traces back to the government record)
2. **Richer data is optional + capability-flagged.** Officers, beneficial owners, financials, etc. must never be required, or the first adapter that can't supply them can't conform.
3. **Each adapter declares its capabilities** (e.g. `supportsChangeNotification`, `supportsMonitoring`, `supportsOfficers`). The platform reads these to decide whether it can do a cheap recheck or must re-query. (This mirrors the `list_jurisdictions` capability-matrix idea from existing tools.)
4. **The fallback is optional and swappable** — configured per deployment, never hard-coded, so the core markets don't depend on a third party and the fallback slot can be replaced.
5. **A conformance test suite gates every adapter** (including the fallback wrapper and all community adapters).

`[NOT FINALIZED]` — concrete method signatures. Direction agreed (something like `Verify(identifier, country)` plus `CheckStatus(canonicalId)` returning a normalized result), but not drafted.

### Normalized status enum

`[NOT FINALIZED]` — to be reconciled against each registry's actual status vocabulary (especially NZBN's published status list).

Working set: `ACTIVE`, `CANCELLED` (a.k.a. inactive), `REMOVED` (dissolved/struck off), `IN_LIQUIDATION`, `UNKNOWN`.

Each adapter maps its registry's native status strings into this enum so the rest of the system is jurisdiction-agnostic.

### Data sources

**New Zealand — NZBN API (native, MVP)**
- Free; requires a free subscription key (read-only) or OAuth2 for writes.
- Returns company status; covers companies, other entity types, and registered sole traders/partnerships/trusts.
- Recheck features: **ETags** (send `If-None-Match`; a `304` means unchanged — cheap rechecks) and a **watchlist** capability for monitoring a set of businesses. Monthly bulk download (JSON/CSV) for initial load.
- Note: Australian companies operating in NZ sit on a separate Overseas Register with distinct identifiers.

**Australia — ABN Lookup (optional native; otherwise via fallback)**
- Free; requires a free authentication GUID. SOAP or plain HTTP GET/POST.
- Status: `Active` / `Cancelled` / `Not Active`, updated daily, plus a status-date field to compare on recheck. Returns the ASIC number (ACN).
- Limitations: no director/officer data (would need ASIC for that); trading names not updated since 2012 — match on legal name.

**Fallback — OpenRegistry (candidate, with caveats)**
- An MCP-native hosted service proxying ~27 national registries live (verbatim government data, no cache). Covers **Australia (ABR)** but **not New Zealand**.
- Pricing: free tiers (anonymous 20 req/min per IP; signed-in 30/min), then Pro $9/mo, Max $29/mo, Enterprise by contact. Auth via OAuth 2.1 (no API keys).
- **`[NOT FINALIZED]` / caveats:**
  - It is **closed-source** (the public repo is documentation only) — so it can only be *consumed*, not extended. You cannot contribute a NZ adapter to it.
  - **Check its Terms of Service** before shipping it as a default provider inside a redistributed product. Not yet verified.
  - Because this project may be run by others, the fallback's **auth/credentials must be per-deployment configurable** — you cannot bundle shared credentials. Each deployment uses its own tier/limits.
  - Treat it as *a* configurable fallback, swappable for OpenCorporates or another provider.

**Note on calling the fallback:** the verification service calling OpenRegistry is a plain MCP client reading JSON — **no LLM, no token cost.** Token cost only arises if *this* service is later exposed as an MCP server that an AI agent calls.

### Re-check / monitoring design

Active status must be re-verified on a recurring basis, **at least every 6 months** (a floor, not a target). Prefer push/notification over blind polling where the source supports it.

- Store the **canonical registry id** at verification time (NZBN / NZ company number; ABN/ACN), not the name.
- **NZ:** use ETags (`If-None-Match`) and/or a watchlist for near-real-time change detection; the 6-month timer is just a backstop.
- **AU:** no push mechanism — re-query on schedule and compare the returned status + status date. Daily-updated source allows more frequent polling if wanted.
- Normalize each registry's status into the enum; cache last status + `last_checked` per company.

### Front doors (output interfaces)

The core verification logic is the same regardless of how it's consumed. Possible front doors, added as consumers appear:

- **Library** — referenced directly (e.g. a NuGet package) by .NET consumers like the rating platform.
- **HTTP API** — for web apps and cross-language consumers.
- **MCP server** — so AI agents can call it as a tool. `[NOT FINALIZED]` — whether and when to build this; defer until a real agent consumer exists. The official C# MCP SDK (`ModelContextProtocol`, with `ModelContextProtocol.AspNetCore` for HTTP servers) makes this a thin add-on later.

Keep every front door a **thin wrapper over the core** — no business logic in a transport layer.

### Conformance suite

The mechanism that makes community contribution safe without hand-auditing each adapter. A standard battery every adapter must pass:

- a known **active** company returns `ACTIVE`
- a known **dissolved/cancelled** company returns the correct status
- a **missing** company returns not-found
- an **upstream outage** surfaces a clean, structured error

Fixtures (recorded registry responses) so adapters are testable **offline** — a contributor in another country can't run NZ's live tests and vice versa.

### Tech & repo

- **Stack:** C# / .NET 10 (matches the consuming product). `[NOT FINALIZED]` as a hard commitment but the working choice. Because the boundary is a package/HTTP/MCP contract, the verification service *could* even be a different language than its consumers — an option, not a plan.
- **Repo:** MVP as a sibling directory in the monorepo; designed to be cleanly extractable into its own repo later (e.g. `git subtree split`) if/when opened to the public.

---

## Open decisions (summary)

- Concrete contract method signatures not drafted (direction agreed).
- Normalized status enum values not reconciled against NZBN's real status list.
- Whether to build a native AU/ABN adapter now or rely on the fallback.
- Fallback provider not locked: OpenRegistry is the candidate but is closed-source, lacks NZ, and its Terms of Service for wrapping/redistribution are **unverified**.
- Whether/when to expose this service as an MCP server.
- **Open-source + community governance:** whether to publish open-source (a real differentiator, since OpenRegistry is closed and not extensible), and when to open to outside contributions vs. keeping NZ/AU first-party during MVP.
- Config/secrets contract for per-deployment adapter credentials — direction agreed, details undrafted.
