# Implementation plan: desktop-app

## Maturity
lowest: 🤖 ai-audited
🌱 idea 0 · 🤖 ai-audited 13 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Fork the repo, then wrap the existing React frontend in a Tauri shell and run the existing ASP.NET Core backend as a bundled sidecar process that the frontend reaches over loopback. Most of the work is subtraction (removing auth, admin, demo, email, rate limiting, and CORS) and rewiring (PostgreSQL to SQLite, cloud paths to the OS app data dir, API key to the OS keychain). The genuinely new code is the Tauri layer: sidecar lifecycle, keychain access, first-run setup, and packaging per platform.

## Risks & unknowns
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

- Bundling a self-contained .NET runtime as a Tauri sidecar (`externalBin`) means a per-target-triple published binary for each of the three platforms. Cross-compiling and naming these correctly for Tauri's sidecar convention is the least-proven part and could force build-tooling changes.
- Sidecar startup is a race: the frontend must not call the API before the backend is listening. The health-check/handshake before revealing the UI is new code with no analog in the web app.
- SQLite swap looks like a package-and-connection-string change, but EF Core migrations authored against Npgsql may use provider-specific types or SQL that SQLite rejects. May need regenerated migrations rather than a clean carry-over.
- `tauri-plugin-keyring` is a community plugin. Linux Secret Service needs a running secret backend (gnome-keyring or KWallet); headless or minimal Linux installs may have none, leaving nowhere to store the API key.
- macOS ships unsigned, so the first-launch bypass and the Tauri updater's signature expectations need to coexist. Unsigned auto-update on macOS may not work the way signed builds do.
- Removing auth touches `Program.cs`, every `[Authorize]` controller, and JWT/refresh plumbing. Easy to leave a dangling reference that fails at startup rather than compile time.

## Steps

### Step 1: Scaffold the Tauri shell around the existing frontend
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Create the fork and add a Tauri project that wraps the current `job-tracker-ui` build as its web content. Get an empty-shell desktop window rendering the existing jobs UI in dev, pointed at a manually-run backend for now. No sidecar yet. This establishes the shell and the build pipeline before any feature changes.

### Step 2: Strip web-only features from the backend
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Remove auth (JWT, refresh tokens, email confirmation, register/login/forgot/reset flows), `AdminController`, `DemoSeed` and demo endpoints, the `IEmailService` implementations, all rate-limit policies, and CORS. Drop `[Authorize]` and role/policy setup from the controllers and `Program.cs`. The app becomes single-user with no identity, so anything keyed on a user id collapses to a single implicit owner. Expect this to cascade through `Program.cs` startup wiring.

### Step 3: Strip web-only features from the frontend
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Remove login, register, check-email, confirm-email, forgot-password, reset-password, and admin pages plus their routes, `ProtectedRoute`/`AdminRoute` wrappers, and the auth service and silent-refresh logic. The app launches straight into the jobs list. Keep the settings page as the home for the API key screen added later.

### Step 4: Swap PostgreSQL for SQLite
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Replace the Npgsql EF Core provider with the SQLite provider and update the connection string. Verify the existing migrations apply against SQLite; regenerate them if provider-specific SQL or column types break. The `IDesignTimeDbContextFactory` should keep `dotnet ef` working through the swap.

### Step 5: Run the backend as a Tauri sidecar with a managed lifecycle
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Publish the backend as a self-contained per-platform binary, register it as a Tauri `externalBin` sidecar with `shell:allow-execute`, and spawn it at app startup on a loopback port. Pass the chosen port to the frontend over Tauri IPC. Health-check before showing the UI. On crash, retry with backoff and fall back to a persistent "backend unavailable" banner. Kill the process on app exit so nothing lingers. This is the core new plumbing and carries the startup-race and bundling risks noted above.

### Step 6: API key storage in the OS keychain with a settings screen
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Add `tauri-plugin-keyring` and a settings screen where the user enters their Claude API key, stored in the OS keychain (never a config file or localStorage). The backend reads the key from the keychain at call time rather than from `appsettings`. Reuse the existing settings page as the host for this screen.

### Step 7: First-run setup and AI feature gating
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

On launch with no stored key, route the user to the settings screen for first-run setup. Gate AI features (the parse/auto-fill flow and any job insights) on the key being present: enabled when it exists, disabled with a prompt to add one when it doesn't. This depends on Step 6's keychain read and the existing AI feature surface in the frontend.

### Step 8: Point database and document storage at the OS app data dir
🤖 ai-audited(opus-4.8) · ❔ unverified (not checked)

Resolve the OS-standard app data directory per platform (`%APPDATA%`, `~/Library/Application Support`, `~/.local/share`) and place the SQLite file there, not next to the binary. Point `LocalStorageService` at a fixed documents folder inside the same directory, created on first run. A user-selectable path is out of scope for this plan.

### Step 9: JSON data export
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Add an export action that writes all jobs to a JSON file the user chooses a location for. Since there is no cloud backup, this is the only safety net, so it should cover the full job dataset (including documents metadata) rather than a partial view.

### Step 10: Auto-update via the Tauri updater plugin
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Wire in Tauri's first-party updater plugin so the app can check for and apply updates. Confirm behavior on the unsigned macOS build, which may not update the same way a signed build would (flagged in risks).

### Step 11: Package and distribute per platform
🤖 ai-audited(opus-4.8) · ❔ unverified (net-new)

Produce the three distribution artifacts: MSIX for the Microsoft Store (Windows, free package signing after the one-time developer account fee), a Flathub package for Linux, and an unsigned macOS bundle with documented right-click-Open first-launch steps. Each ships the sidecar backend binary for that target triple built in Step 5.
