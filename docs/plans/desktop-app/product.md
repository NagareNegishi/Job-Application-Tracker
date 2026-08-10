# Product plan: desktop-app

## Maturity
lowest: 🤖 ai-audited
🌱 idea 0 · 🤖 ai-audited 10 · 👤 human-ok 0 · ✅ settled 0

## about
🤖 ai-audited(opus-4.8) — no change; scope is clear from the source doc

A desktop build of the job tracker, forked from the existing web app. Single user, runs entirely on the local machine, no cloud services involved.

## problem / motivation
🤖 ai-audited(opus-4.8) — tightened; user demand is assumed, no numbers on how many people actually want local-only

The web app requires an account, a hosted backend, and network access. Some users want to track job applications without any of that: no sign-up, no data leaving the machine, works offline. The fork exists to serve that case without compromising the web app's multi-user, cloud-backed design.

## goal
🤖 ai-audited(opus-4.8) — no change; states the outcome, not the mechanism

Ship a desktop app (Windows, Mac, Linux) that reuses the existing backend and frontend as-is, strips out everything that assumes a hosted multi-user service, and runs as a single local installable with no ongoing server dependency.

## audience
🤖 ai-audited(opus-4.8) — no change

One person tracking their own job applications, who wants a local-only tool: no account, no cloud sync, no shared server.

## requirements
🤖 ai-audited(opus-4.8) — converted two always-true "when app runs on any platform" triggers to ubiquitous EARS phrasing; named both AI surfaces (parse + alignment analysis) on the key-present gating requirement after `plan-verify` (2026-08-11)

- When the app launches and no API key is stored in the OS keychain, the system shall show the settings screen for first-run setup.
- When the user enters a Claude API key in settings, the system shall store it in the OS keychain, not in a config file or localStorage.
- When an AI feature is invoked and no API key is present, the system shall disable the feature and prompt the user to add one. This gating covers both AI surfaces, not just parse: job-listing parse (`JobsController` `POST /api/jobs/parse`) and profile/job alignment analysis (`AnalysisController` `POST /api/analyse/*`, surfaced in the frontend via `AnalysisSection`/`AlignmentDialog`). In the web app both are gated by the `AiEnabled` role policy; the fork replaces that role gate with a key-present check.
- When the app starts, the system shall spawn the .NET backend as a sidecar process on a loopback port and pass that port to the frontend over Tauri IPC.
- When the backend sidecar process crashes, the system shall retry with backoff, then show a persistent "backend unavailable" banner if retries are exhausted.
- When the app exits, the system shall explicitly kill the sidecar process so it doesn't linger.
- When the user requests a data export, the system shall produce a JSON file containing all jobs.
- The system shall store the SQLite database file in the OS-standard app data directory, not next to the binary.
- The system shall store uploaded documents in a fixed folder inside the same app data directory.
- When an update is available, the system shall use Tauri's first-party updater plugin to apply it.

## stack
🤖 ai-audited(opus-4.8) — corrected the SQLite line after `plan-verify` (2026-08-11) disproved the "package swap, migrations carry over" claim; everything else decided in the source doc

- Desktop shell: Tauri
- Backend: existing ASP.NET Core API, unmodified aside from removed features, run as a sidecar process (`externalBin` + `shell:allow-execute`)
- Database: SQLite via EF Core. Supported on EF Core 8+ (incl. `.OwnsMany(...).ToJson()`, which is used heavily and needs no change), but this is **not** a package swap and existing migrations do **not** carry over. Three things in the current model are Postgres-only and must be reworked before SQLite will build:
  - `List<string>` fields `TargetRoles`/`Skills`/`Certifications` (`Models/UserProfile.cs:11-13`) map to Npgsql native `text[]`; SQLite has no array type — convert to `PrimitiveCollection` (JSON/TEXT) or a value-converted string.
  - Two `PrimitiveCollection(...).HasColumnType("jsonb")` calls for `WorkModes`/`ContractTypes` (`Data/JobTrackerContext.cs:48-53`); `jsonb` is Postgres-only — drop the explicit column type (EF maps primitive collections to TEXT JSON on SQLite automatically) or make it provider-conditional.
  - Two migrations use raw Postgres JSON SQL that SQLite cannot run: `Migrations/20260717065502_SalaryExpectationsArray.cs` (`::jsonb`, `jsonb_typeof`, `jsonb_build_array`, `-> 0`) and `Migrations/20260717203254_LanguagesFluencyEntry.cs` (`jsonb_agg`/`jsonb_build_object`/`::text[]`).
  - Because this is a fork with no existing data to preserve, "migrations carry over" is not a goal: after fixing the two mappings, delete `Migrations/` and regenerate a single `InitialCreate` against SQLite (the Postgres-only data-reshaping migration above simply drops out). Net effect: a small model-mapping rework in one file plus a full migration regen — low-risk, not trivial. Do not switch away from SQLite: embedded Postgres reintroduces a server process, and LiteDB/raw files mean abandoning EF Core.
- Keychain access: `tauri-plugin-keyring` (wraps `keyring-rs`; covers macOS Keychain, Windows Credential Manager, Linux Secret Service)
- Storage: `LocalStorageService`, reused from the web app, pointed at the app data directory

## target device / platform
🤖 ai-audited(opus-4.8) — no change; mobile is explicitly deferred to non-goals

Desktop: Windows, macOS, Linux. Mobile is out of scope for this plan (see non-goals).

## constraints
🤖 ai-audited(opus-4.8) — no change; all three signing/distribution limits are settled decisions

- No paid Apple Developer account: macOS builds ship unsigned. Gatekeeper will warn on first launch; users right-click and choose Open to bypass.
- Windows distribution goes through the Microsoft Store (MSIX), which requires a one-time ~$19 individual developer account fee but signs the package for free.
- Linux distribution goes through Flathub, no signing cost.
- No per-IP rate limiting or CORS handling needed: the backend only ever talks to the local frontend over loopback.

## non-goals
🤖 ai-audited(opus-4.8) — added the maintenance-window removal and the drop-Identity/multi-user-data-model exclusions (2026-08-11); the other six carried from the source doc

- No authentication or multi-user support: the app launches straight into the jobs list.
- No ASP.NET Identity or multi-user data model: Identity is dropped entirely (it only served the auth the fork removes). Jobs are no longer user-scoped, and the profile and preferences are stored as single rows, not per-user records.
- No admin panel, user management, or AI-access toggle.
- No demo mode or seeded sample data.
- No cloud storage, cloud backup, or sync between machines.
- No shared codebase with the web app: this is a permanent fork, not a feature-flagged variant.
- No maintenance window or scheduled-downtime handling: the web app's 503 maintenance behavior is cloud-only and is stripped from the fork. This spans the backend 503 response (`Program.cs`), the `MaintenanceError`-on-503 path in `job-tracker-ui/src/lib/api.ts`, and `MaintenancePage.tsx`.
- No mobile build in this plan (may be revisited separately later).

## open questions
🤖 ai-audited(opus-4.8) — added the open decisions surfaced by the pre-audit gap check (2026-08-11); the key-delivery and on-launch-migration items are the ones that block clean implementation

- **How does the .NET sidecar obtain the keychain-stored API key?** `tauri-plugin-keyring` runs on the Tauri side, not inside the backend process, so the key has to be handed over somehow (env var at sidecar spawn vs. per-request header). Related: the backend currently fails fast at startup if `Anthropic:ApiKey` is missing (`Program.cs:119`) and both Claude services read it in their constructor (`ClaudeAnalysisService.cs:18`), so decide whether the sidecar starts keyless and acquires the key later, or only spawns after key entry.
- **What owns jobs and the profile once auth is removed?** Jobs are user-scoped (`ScopeJobsToUser` migration) and `UserProfile` has a required `UserId` FK to `ApplicationUser` with cascade delete. Options: a synthetic single implicit user, or detaching these from `ApplicationUser` entirely. This decision shapes the Step 4 migration regeneration in `impl.md`.
- **How is the local SQLite schema migrated when an auto-updated version ships a schema change?** Nothing currently runs `Database.Migrate()` at startup; decide whether the app migrates the existing DB file on launch (essential once auto-update is in play).
- **What does the data export actually cover, and is there an import?** Does the JSON export include the `UserProfile` and the actual uploaded document files, or only jobs plus document metadata? And is there an import/restore counterpart — without one, export is a weak backup and the "only safety net" framing (impl Step 9) doesn't hold.
- **Confirm the privacy carve-out.** The `about`/`problem` framing promises offline use and "no data leaving the machine," but both AI surfaces send job text (and, for alignment, the profile) to Anthropic. The intended carve-out — AI features are optional and key-gated, everything else stays local — should be stated explicitly rather than left implied.
- User-selectable document storage path (instead of the fixed app-data-dir location) is deferred; no target version set yet.
- What signal or threshold would justify paying for Apple code signing later ("if macOS adoption/complaints justify it" isn't a defined trigger yet).
- No decision yet on how the sidecar retry/backoff parameters (attempt count, delay curve) are tuned, or what "unavailable" recovery looks like beyond the banner (manual retry button? auto-recovery once the backend comes back?).
