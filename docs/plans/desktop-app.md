# Desktop App Version

Separate project (fork of this repo). Single-user, local-only, no cloud services.

## Approach

Clone the repo into a new project. The two versions diverge permanently — different auth model, DB, deployment — so a shared codebase with feature flags would make both worse.

## What gets removed

| Area | Removed |
|---|---|
| Auth | JWT, refresh tokens, email confirmation, forgot-password, register, login pages |
| Admin | User management, AI-access toggle, `AdminController`, `AdminPage` |
| Demo | Seeded data, demo reset, demo login, `DemoSeed` |
| Database | PostgreSQL + Npgsql → SQLite |
| Storage | S3 / cloud path → local filesystem only (`LocalStorageService` kept, path managed by app) |
| Email service | `IEmailService`, `ResendEmailService`, `LogEmailService`, all email flows |
| Rate limiting | All per-IP policies (`auth`, `resend-confirmation`, `parse`) |
| CORS | Removed — loopback only |

## What gets added / changed

- **API key settings screen** — user enters their Claude API key; stored in OS keychain, not a config file
- **AI feature gating** — AI features enabled if API key is present, disabled with a prompt to add one if not
- **First-run setup** — on launch with no stored API key, surface the settings screen
- **Data export** — simple JSON export of all jobs; no cloud backup so this is the only safety net
- **SQLite file location** — OS app data dir (`%APPDATA%`, `~/Library/Application Support`, `~/.local/share`), not next to the binary
- **Document storage path** — fixed to a folder inside the same app data dir; user-selectable path is a later option
- **Auto-update mechanism** — Tauri's first-party `updater` plugin

## Decided

- Platform: desktop first (Windows, Mac, Linux); mobile deferred
- Separate project (fork), not a monorepo or shared codebase
- No auth — single user, app launches straight into jobs list
- SQLite via EF Core (package swap + connection string; migrations still work)
- API key in OS keychain — not a plain config file or localStorage
- AI features gated on keychain entry being present
- LocalStorageService kept; path pointed at app data dir
- Data export (JSON) included from day one
- Admin and demo features not carried over
- **Desktop shell: Tauri.** Chosen over Electron for footprint (~10–25x smaller installers, roughly half the idle memory) and formal governance (Tauri Programme under the Commons Conservancy, vs. Electron's OpenJS Foundation backing but much heavier runtime). Keychain access via community `tauri-plugin-keyring` (wraps `keyring-rs`, covers macOS Keychain / Windows Credential Manager / Linux Secret Service). Ruled out Photino.NET despite its no-sidecar, in-process .NET appeal — maintainer team is small and stretched (shifted to AI-assisted issue triage in March 2026, no release since Jan 2025), too much bus-factor risk for a foundational dependency.
- **Distribution: publicly downloadable, free-tier signing only.**
  - Windows: Microsoft Store (MSIX) — Microsoft signs the package for free after certification; one-time ~$19 individual developer account fee
  - Linux: Flathub — no signing cost
  - macOS: shipped unsigned — Gatekeeper warns on first launch, users right-click → Open to bypass. Apple has no free signing path (Developer Program is $99/yr with no substitute, even via third-party signing services like SignPath); revisit paying for this later if macOS adoption/complaints justify it
- **.NET backend runs as a sidecar process** (`externalBin` + `shell:allow-execute`), not a native Tauri rewrite — reuses the existing backend and frontend service layer as-is
  - Spawned on a loopback port at startup, passed to the frontend via Tauri IPC
  - Crash: retry with backoff, then show a persistent "backend unavailable" banner
  - Killed explicitly on app exit to avoid orphaned processes

## Not decided

(none currently blocking)
