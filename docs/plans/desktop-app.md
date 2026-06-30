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
- **Auto-update mechanism** — depends on shell choice (TBD)

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

## Not decided

- Desktop shell (Tauri / Electron / other) — affects auto-update, keychain access method, binary size, sidecar vs native backend; Tauri 2.0 worth noting as it supports mobile later without an architecture change

## Open questions (shell-dependent)

- .NET backend as sidecar process, or replace with something native to the shell?
- Sidecar crash handling and restart strategy
- Code signing / notarization pipeline (required for Mac, recommended for Windows)
