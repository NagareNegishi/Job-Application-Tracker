# Product plan: desktop-app

## Maturity
lowest: 🤖 ai-audited
🌱 idea 0 · 🤖 ai-audited 10 · 👤 human-ok 0 · ✅ settled 0

## about
🤖 ai-audited(opus-4.8) — no change; scope is clear from the source doc

A desktop build of the job tracker, forked from the existing web app. Single user, runs entirely on the local machine, no cloud services involved.

## problem / motivation
🤖 ai-audited(opus-4.8) — tightened; user demand is assumed, no numbers on how many people actually want local-only. 👤 privacy carve-out stated explicitly (2026-08-11): the "no data leaving the machine" promise holds by default and has exactly one opt-in exception, the AI features — see the carve-out below and the matching constraint.

The web app requires an account, a hosted backend, and network access. Some users want to track job applications without any of that: no sign-up, no data leaving the machine, works offline. The fork exists to serve that case without compromising the web app's multi-user, cloud-backed design.

**Privacy carve-out.** "No data leaving the machine" is the default and holds fully with no API key: the database, uploaded documents, and backups all stay on the local disk, and the app is usable offline. The single exception is the AI features, and they are opt-in. When — and only when — the user has added a verified Claude API key, invoking an AI feature sends data to Anthropic: job-listing text for parse (`JobsController` `POST /api/jobs/parse`), and job text plus the user's profile for alignment analysis (`AnalysisController`). With no key stored both features are disabled (see the gating requirement), so nothing is ever sent implicitly — the user opts in per key, not per launch. The only other network activity is the Tauri auto-updater checking for and downloading new versions, which transmits no user data (just app version/update metadata).

## goal
🤖 ai-audited(opus-4.8) — no change; states the outcome, not the mechanism

Ship a desktop app (Windows, Mac, Linux) that reuses the existing backend and frontend as-is, strips out everything that assumes a hosted multi-user service, and runs as a single local installable with no ongoing server dependency.

## audience
🤖 ai-audited(opus-4.8) — no change

One person tracking their own job applications, who wants a local-only tool: no account, no cloud sync, no shared server.

## requirements
🤖 ai-audited(opus-4.8) — converted two always-true "when app runs on any platform" triggers to ubiquitous EARS phrasing; named both AI surfaces (parse + alignment analysis) on the key-present gating requirement after `plan-verify` (2026-08-11). 👤 API-key behavior settled by human decision (2026-08-11): keyless boot, live-verified entry, add/update/remove, loopback-push delivery — see the rewritten first three requirements. 👤 on-launch schema migration settled by human decision (2026-08-11): `Database.Migrate()` on startup behind a pre-migration backup — see the migration requirement below. 👤 backup/restore settled by human decision (2026-08-11): the JSON-export-of-jobs is replaced by a full-coverage zip backup plus a replace-all restore — see the two backup/restore requirements below.

- When the app launches, the system shall open directly to the jobs list whether or not an API key is stored, and shall never block startup on key setup. The key ships empty by default and is optional; the web app's startup fail-fast on a missing `Anthropic:ApiKey` is removed.
- When the user enters a Claude API key in settings, the system shall verify it with a live test call to Anthropic and store it in the OS keychain (never a config file or localStorage) only if verification succeeds. The user can update or remove the stored key at any time from the same screen.
- When the stored key is added, updated, or removed, the system shall push the current key to the backend over the loopback interface; the backend holds it in memory and reads it per AI call, not from configuration.
- When an AI feature is invoked and no verified key is stored, the system shall disable the feature and prompt the user to add one. This gating covers both AI surfaces, not just parse: job-listing parse (`JobsController` `POST /api/jobs/parse`) and profile/job alignment analysis (`AnalysisController` `POST /api/analyse/*`, surfaced in the frontend via `AnalysisSection`/`AlignmentDialog`). In the web app both are gated by the `AiEnabled` role policy; the fork replaces that role gate with a key-present check.
- When the app starts, the system shall spawn the .NET backend as a sidecar process on a loopback port and pass that port to the frontend over Tauri IPC.
- When the backend sidecar process crashes, the system shall retry with backoff, then show a persistent "backend unavailable" banner if retries are exhausted.
- When the app exits, the system shall explicitly kill the sidecar process so it doesn't linger.
- When the user requests a backup, the system shall write a single zip archive to a user-chosen location containing all jobs, the profile, the app preferences, document metadata, and the uploaded document files. This is the app's backup mechanism; there is no cloud copy, so it must be complete enough to reconstitute the app on a fresh install.
- When the user requests a restore, the system shall replace all current data with a backup archive's contents after an explicit confirmation, and shall snapshot the current state first so a failed or unwanted restore can be rolled back. Restore is replace-all, not merge; there is no selective import in this plan.
- The system shall store the SQLite database file in the OS-standard app data directory, not next to the binary.
- When the app starts, the system shall bring the SQLite schema up to date by applying any pending EF Core migrations (`Database.Migrate()`), after first copying the database file to a backup. This runs before the app serves requests and reveals the UI, and covers both first run (schema created from scratch) and post-auto-update schema changes. If migration fails, the system shall keep the backup and surface a failure state rather than serve a half-migrated database.
- The system shall store uploaded documents in a fixed folder inside the same app data directory.
- When an update is available, the system shall use Tauri's first-party updater plugin to apply it.

## stack
🤖 ai-audited(opus-4.8) — corrected the SQLite line after `plan-verify` (2026-08-11) disproved the "package swap, migrations carry over" claim; everything else decided in the source doc. 👤 added the API-key delivery line (human decision, 2026-08-11).

- Desktop shell: Tauri
- Backend: existing ASP.NET Core API, unmodified aside from removed features, run as a sidecar process (`externalBin` + `shell:allow-execute`)
- Database: SQLite via EF Core. Supported on EF Core 8+ (incl. `.OwnsMany(...).ToJson()`, which is used heavily and needs no change), but this is **not** a package swap and existing migrations do **not** carry over. Three things in the current model are Postgres-only and must be reworked before SQLite will build:
  - `List<string>` fields `TargetRoles`/`Skills`/`Certifications` (`Models/UserProfile.cs:11-13`) map to Npgsql native `text[]`; SQLite has no array type — convert to `PrimitiveCollection` (JSON/TEXT) or a value-converted string.
  - Two `PrimitiveCollection(...).HasColumnType("jsonb")` calls for `WorkModes`/`ContractTypes` (`Data/JobTrackerContext.cs:48-53`); `jsonb` is Postgres-only — drop the explicit column type (EF maps primitive collections to TEXT JSON on SQLite automatically) or make it provider-conditional.
  - Two migrations use raw Postgres JSON SQL that SQLite cannot run: `Migrations/20260717065502_SalaryExpectationsArray.cs` (`::jsonb`, `jsonb_typeof`, `jsonb_build_array`, `-> 0`) and `Migrations/20260717203254_LanguagesFluencyEntry.cs` (`jsonb_agg`/`jsonb_build_object`/`::text[]`).
  - Because this is a fork with no existing data to preserve, "migrations carry over" is not a goal: after fixing the two mappings, delete `Migrations/` and regenerate a single `InitialCreate` against SQLite (the Postgres-only data-reshaping migration above simply drops out). Net effect: a small model-mapping rework in one file plus a full migration regen — low-risk, not trivial. Do not switch away from SQLite: embedded Postgres reintroduces a server process, and LiteDB/raw files mean abandoning EF Core.
- Keychain access: `tauri-plugin-keyring` (wraps `keyring-rs`; covers macOS Keychain, Windows Credential Manager, Linux Secret Service)
- API key delivery: the backend starts keyless (no startup fail-fast on a missing key). On add/update/remove the Tauri side POSTs the current key to a loopback-only backend endpoint; the backend caches it in memory and constructs the `AnthropicClient` per call. `ClaudeParsingService`/`ClaudeAnalysisService` stop reading the key from `IConfiguration` in their constructor. The key crosses keychain → Tauri → loopback and never enters the webview/renderer.
- Storage: `LocalStorageService`, reused from the web app, pointed at the app data directory
- Backup format: a single zip archive (JSON manifest + the document files under their `StorageKey` names), written to and read from a user-chosen path via the Tauri dialog/fs plugins. A zip is one file the user saves in one place yet holds the binary document files natively — chosen over a lone base64-in-JSON file (bloated, all in memory) and over a JSON-plus-loose-folder pair (two things to keep together)

## target device / platform
🤖 ai-audited(opus-4.8) — no change; mobile is explicitly deferred to non-goals

Desktop: Windows, macOS, Linux. Mobile is out of scope for this plan (see non-goals).

## constraints
🤖 ai-audited(opus-4.8) — corrected the Windows line after `plan-verify` (2026-08-11) disproved MSIX: Tauri emits only EXE/MSI, so the Store path is a Win32 installer, not an MSIX package (matches `impl.md` Step 11). The Apple and Flathub limits are unchanged settled decisions. 👤 added the AI-egress boundary (2026-08-11) as the hard-boundary half of the privacy carve-out stated in `problem / motivation`.

- No paid Apple Developer account: macOS builds ship unsigned. Gatekeeper will warn on first launch; users right-click and choose Open to bypass.
- Windows distribution ships a Win32 installer (MSI via WiX, or NSIS) — Tauri does **not** generate MSIX. It can still be listed on the Microsoft Store as a Store-linked Win32 app (a one-time ~$19 individual developer account; the Store requires the installer to support silent installation), or distributed directly. Signing is not covered by the Store for this path.
- Linux distribution goes through Flathub, no signing cost.
- No per-IP rate limiting or CORS handling needed: the backend only ever talks to the local frontend over loopback.
- The only user data that may leave the machine is what the opt-in AI features send to Anthropic, and only when a verified key is stored: job-listing text (parse) and job text plus profile (alignment analysis). No telemetry, no analytics, no sync; the API key lives in the OS keychain and is never transmitted anywhere but Anthropic (and locally over loopback to the sidecar).

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
🤖 ai-audited(opus-4.8) — added the open decisions surfaced by the pre-audit gap check (2026-08-11). 👤 resolved the sidecar key-delivery item (2026-08-11): keyless boot + loopback push + live-verified entry — moved into requirements/stack. 👤 resolved on-launch-migration (2026-08-11): `Database.Migrate()` on startup behind a pre-migration backup — moved into requirements + impl Step 5/8. 👤 resolved export/import (2026-08-11): full-coverage zip backup + replace-all restore, covering jobs, profile, preferences, document metadata and files — moved into requirements/stack + impl Step 9. The `.bak` from Step 5 stays a narrow migration-failure guard; the backup/restore is the user-facing DR layer on top. 👤 resolved privacy carve-out (2026-08-11): stated explicitly in `problem / motivation` and pinned as a hard boundary in `constraints` — local by default, AI features the one opt-in, key-gated exception, updater carries no user data.

- **What owns jobs and the profile once auth is removed?** Jobs are user-scoped (`ScopeJobsToUser` migration) and `UserProfile` has a required `UserId` FK to `ApplicationUser` with cascade delete. Options: a synthetic single implicit user, or detaching these from `ApplicationUser` entirely. This decision shapes the Step 4 migration regeneration in `impl.md`.
- User-selectable document storage path (instead of the fixed app-data-dir location) is deferred; no target version set yet.
- What signal or threshold would justify paying for Apple code signing later ("if macOS adoption/complaints justify it" isn't a defined trigger yet).
- No decision yet on how the sidecar retry/backoff parameters (attempt count, delay curve) are tuned, or what "unavailable" recovery looks like beyond the banner (manual retry button? auto-recovery once the backend comes back?).
