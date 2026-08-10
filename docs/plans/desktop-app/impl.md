# Implementation plan: desktop-app

## Maturity
lowest: 🤖 ai-audited
🌱 idea 0 · 🤖 ai-audited 13 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(opus-4.8) · 🔗 verified → src: JobTrackerApi/Controllers/, job-tracker-ui/src/pages/

Fork the repo, then wrap the existing React frontend in a Tauri shell and run the existing ASP.NET Core backend as a bundled sidecar process that the frontend reaches over loopback. Most of the work is subtraction (removing auth, admin, demo, email, rate limiting, and CORS) and rewiring (PostgreSQL to SQLite, cloud paths to the OS app data dir, API key to the OS keychain). The genuinely new code is the Tauri layer: sidecar lifecycle, keychain access, first-run setup, and packaging per platform. The backend structure the plan assumes is present: six controllers, the storage/email/AI services, and the frontend pages all exist as named.

## Risks & unknowns
🤖 ai-audited(opus-4.8) · 🔗 verified → src: JobTrackerApi/Data/JobTrackerContext.cs:24-55, JobTrackerApi/Migrations/

The verification pass resolved several of these and made one worse. Updated state:

- **SQLite swap is a model rewrite, not a package swap (worse than assumed).** The DbContext maps owned collections with `.OwnsMany(...).ToJson()`, sets `.HasColumnType("jsonb")` explicitly, and maps `List<string>` to native Postgres `text[]`. The migrations contain `jsonb`, `text[]`, `NpgsqlValueGenerationStrategy`, and two raw-SQL migrations (`SalaryExpectationsArray`, `LanguagesFluencyEntry`) built on Postgres-only `jsonb`/`jsonb_agg`/`jsonb_build_object`/`::text[]` functions. None of this runs on SQLite. This contradicts the product doc's "package swap + connection string; migrations still work." See Step 4.
- **SQLite JSON is nonetheless feasible (resolved).** EF Core 8+ extended `ToJson()` owned collections and primitive collections to the SQLite provider, so the aggregate-to-JSON model survives the move once the Postgres-specific column types are dropped (SQLite stores them as TEXT).
- **Sidecar bundling per target triple is real but standard (resolved).** Tauri v2 requires the sidecar binary named with a `-$TARGET_TRIPLE` suffix and run via `shell:allow-execute`. Confirmed as the documented approach, so this is build-tooling work, not an open feasibility question.
- **Startup race is still net-new.** The health-check/handshake before revealing the UI has no analog in the web app. Unverified by nature.
- **Keychain on headless Linux is mitigated (partly resolved).** `tauri-plugin-keyring` defaults to the D-Bus Secret Service but ships a `linux-keyutils` backend that avoids needing gnome-keyring/KWallet running. A fallback exists.
- **Unsigned macOS auto-update mostly works (partly resolved).** Tauri's updater verifies its own minisign (Ed25519) signature, which is independent of Apple code signing, so an Apple-unsigned build can still auto-update. The open nuance is Gatekeeper quarantine on the replaced bundle, not the updater itself.
- **Auth removal cascade is still a hand-check.** It touches `Program.cs` startup wiring plus every `[Authorize]` controller; easy to leave a dangling reference. See Step 2.

## Steps

### Step 1: Scaffold the Tauri shell around the existing frontend
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Create the fork and add a Tauri project that wraps the current `job-tracker-ui` build as its web content. Get an empty-shell desktop window rendering the existing jobs UI in dev, pointed at a manually-run backend for now. No sidecar yet. This establishes the shell and the build pipeline before any feature changes. The frontend it wraps exists; the Tauri project is new.

### Step 2: Strip web-only features from the backend
🤖 ai-audited(opus-4.8) · 🔗 verified → src: JobTrackerApi/Program.cs:130,162,168,211,218,261,300

Remove auth (JWT, refresh tokens, email confirmation, register/login/forgot/reset flows), `AdminController`, `DemoSeed` and demo endpoints, the `IEmailService` implementations, all rate-limit policies, and CORS. Verified the wiring exists exactly where the plan assumes: `AddIdentityCore` (162), `AddAuthentication`/`AddJwtBearer` (168-169), `AddAuthorization` (211), `AddRateLimiter` (218), `AddCors` (261), `UseCors` (300); `AuthController`, `AdminController`, `AccountController` and the email services are present. Also remove the maintenance-window (503) behavior surfaced in Step 3, which is a cloud concern. Drop `[Authorize]` and role/policy setup, then chase the cascade through `Program.cs`.

### Step 3: Strip web-only features from the frontend
🤖 ai-audited(opus-4.8) · 🔗 verified → src: job-tracker-ui/src/App.tsx:48-60

Remove login, register, check-email, confirm-email, forgot-password, reset-password, and admin pages plus their routes, `ProtectedRoute`/`AdminRoute` wrappers, and the auth service and silent-refresh logic. Verified all these pages and routes exist (App.tsx:48-60). The pass also found `MaintenancePage` and its maintenance-window handling, which is cloud-only and should be removed too (pairs with the backend 503 removal in Step 2). Keep `SettingsPage` as the home for the API key screen. The app launches straight into the jobs list.

### Step 4: Swap PostgreSQL for SQLite
🤖 ai-audited(opus-4.8) · 🔗 verified → src: JobTrackerApi/Data/JobTrackerContext.cs:24-55, JobTrackerApi/Migrations/20260706043752_AddUserProfile.cs:22-28, JobTrackerApi/Migrations/20260717203254_LanguagesFluencyEntry.cs:20-42

Bigger than the product doc implied. Verified this is a model change plus a full migration regeneration, not a package-and-connection-string swap:
- Replace the Npgsql provider with the SQLite provider and update the connection string (`Program.cs:130` uses `UseNpgsql`).
- Remove or replace the Postgres-specific mappings in `JobTrackerContext.cs`: the explicit `.HasColumnType("jsonb")` calls (lines 50, 53) and the native `text[]` array mapping for `List<string>` (`TargetRoles`/`Skills`/`Certifications`, per `UserProfile.cs`). The `.OwnsMany(...).ToJson()` owned collections (lines 24-55) do carry over: EF Core 8+ supports `ToJson()` and primitive collections on SQLite, stored as TEXT.
- Delete and regenerate every migration against SQLite. The existing set embeds `jsonb`, `text[]`, `NpgsqlValueGenerationStrategy`, and two raw-SQL migrations (`SalaryExpectationsArray`, `LanguagesFluencyEntry`) written in Postgres-only JSON functions that SQLite cannot run.
- Apply the single-user data model as part of this regen (the drop-Identity decision in the product `non-goals`; Identity's runtime removal is Step 2): change `JobTrackerContext` from `IdentityDbContext<ApplicationUser>` to a plain `DbContext`, remove `Job.UserId`, and make `UserProfile` a singleton — drop `UserId`, the `User` navigation, the unique index and cascade delete, keeping all other fields and their JSON mapping. Add a one-row `AppSettings` table for the preferences (visible columns + `autoFillEnabled`) that were JSON on `ApplicationUser`. Controllers lose their `User.FindFirstValue(...)` scoping filters (`JobsController`, `DocumentsController`, `AnalysisController`).
- Keep the `IDesignTimeDbContextFactory` so `dotnet ef` still works after the swap.

### Step 5: Run the backend as a Tauri sidecar with a managed lifecycle
🤖 ai-audited(opus-4.8) · 🔗 verified → doc: https://v2.tauri.app/develop/sidecar/ §Embedding External Binaries (externalBin, shell:allow-execute, app.shell().sidecar())

Publish the backend as a self-contained per-platform binary named with the required `-$TARGET_TRIPLE` suffix, register it as a Tauri `externalBin` sidecar with the `shell:allow-execute` permission, and spawn it at startup via `app.shell().sidecar(...)` on a loopback port. Pass the chosen port to the frontend over Tauri IPC. Health-check before showing the UI. On crash, retry with backoff and fall back to a persistent "backend unavailable" banner. Kill the process on app exit. The config, permission identifier, and spawn API are confirmed current; the lifecycle glue (health handshake, backoff, banner) is net-new.

The sidecar starts **keyless** — remove the `Anthropic:ApiKey` startup fail-fast (`Program.cs:119`) so a missing key never blocks boot (human decision, 2026-08-11). The backend exposes a loopback-only endpoint that receives the current API key (see Step 6); until a key arrives it runs with AI disabled.

On startup, before serving requests, the backend brings the local schema up to date with `Database.Migrate()` (human decision, 2026-08-11) — there is no `dotnet ef database update` step on a user's machine, and auto-update (Step 10) can ship a schema change against the user's existing DB file. Guard it with a **pre-migration backup**: copy the SQLite file (see Step 8 for its location) before calling `Migrate()`, and on failure keep the backup and surface a failure state rather than reveal the UI over a half-migrated DB. `Migrate()` covers first run (creates the schema) and upgrade (applies pending migrations) in one path; this is net-new since `Program.cs` currently runs no schema step at all. Sequence it ahead of the Step 5 health handshake so the window only appears once the DB is ready. Keep authoring future migrations against the SQLite provider so EF emits SQLite-compatible DDL.

### Step 6: API key storage in the OS keychain with a settings screen
🤖 ai-audited(opus-4.8) · 🔗 verified → doc: https://github.com/charlesportwoodii/tauri-plugin-keyring (v0.2.0, macOS/Windows/Linux); src: job-tracker-ui/src/pages/SettingsPage.tsx

Add `tauri-plugin-keyring` (v0.2.0, actively maintained, covers macOS Keychain / Windows Credential Manager / Linux Secret Service, with a `linux-keyutils` fallback) and a settings screen where the user enters their Claude API key. On Save, **verify the key with one live test call to Anthropic and store it in the keychain only if verification succeeds** (human decision, 2026-08-11), never a config file or localStorage. The screen also lets the user update or remove the stored key at any time.

Delivery to the backend is **loopback push**, not a keychain read from inside the backend (`tauri-plugin-keyring` runs on the Tauri side, not in the .NET process): on add/update/remove, Tauri POSTs the current key to the loopback-only endpoint from Step 5, and the backend caches it in memory and builds the `AnthropicClient` per call from that value. `ClaudeParsingService.cs:22` and `ClaudeAnalysisService.cs:16` stop reading the key from `IConfiguration` in their constructor. The key never enters the webview/renderer. Reuse the existing `SettingsPage` (confirmed present) as the host.

### Step 7: First-run setup and AI feature gating
🤖 ai-audited(opus-4.8) · 🔗 verified → src: job-tracker-ui/src/services/parseService.ts, JobTrackerApi/Controllers/AnalysisController.cs

The app opens straight to the jobs list on every launch — a missing key is never a stopper (human decision, 2026-08-11), so there is no forced first-run redirect to settings. Gate the AI features on a verified key being stored: when an AI feature is invoked without one, disable it and prompt the user to add a key in settings. The AI surface is broader than the plan first captured: besides the parse/auto-fill flow (`parseService.ts`), there is a profile/job alignment-analysis feature (`AnalysisController`, `ClaudeAnalysisService`, surfaced in the frontend via `AnalysisSection`/`AlignmentDialog` on `JobDetailPage` — not `ProfilePage`) that also calls Claude and must be gated the same way. Depends on Step 6's key delivery.

### Step 8: Point database and document storage at the OS app data dir
🤖 ai-audited(opus-4.8) · 🔗 verified → src: JobTrackerApi/Services/LocalStorageService.cs:10-14

Resolve the OS-standard app data directory per platform (`%APPDATA%`, `~/Library/Application Support`, `~/.local/share`) and place the SQLite file there, not next to the binary. Point `LocalStorageService` at a fixed documents folder inside the same directory. Verified the service reads `Storage:UploadsPath` from config and calls `Directory.CreateDirectory` (lines 10-14), so this is a matter of supplying the resolved path rather than restructuring the service. A user-selectable path is out of scope for this plan. The Step 5 pre-migration backup copy of the SQLite file lives in this same app data directory.

### Step 9: JSON data export
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Add an export action that writes all jobs to a JSON file the user chooses a location for. Since there is no cloud backup, this is the only safety net, so it should cover the full job dataset (including document metadata) rather than a partial view. No existing export endpoint to build on.

### Step 10: Auto-update via the Tauri updater plugin
🤖 ai-audited(opus-4.8) · 🔗 verified → doc: https://v2.tauri.app/plugin/updater/ §signature (minisign/Ed25519, independent of Apple signing)

Wire in Tauri's first-party updater plugin. Verified the updater requires its own minisign signature (generated via `tauri signer generate`), which is independent of Apple code signing, so the Apple-unsigned macOS build can still auto-update. The remaining open question is Gatekeeper quarantine behavior on the replaced bundle, not the updater mechanism.

### Step 11: Package and distribute per platform
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Produce the three distribution artifacts: MSIX for the Microsoft Store (Windows), a Flathub package for Linux, and an unsigned macOS bundle with documented right-click-Open first-launch steps. Each ships the sidecar backend binary for that target triple from Step 5 (the `-$TARGET_TRIPLE` naming is confirmed). The store-specific mechanics — MSIX packaging/certification and the Flathub manifest and review process — were not checked this pass and should be verified before committing to timelines.
