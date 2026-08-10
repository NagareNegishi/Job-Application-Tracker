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
🤖 ai-audited(opus-4.8) — converted two always-true "when app runs on any platform" triggers to ubiquitous EARS phrasing

- When the app launches and no API key is stored in the OS keychain, the system shall show the settings screen for first-run setup.
- When the user enters a Claude API key in settings, the system shall store it in the OS keychain, not in a config file or localStorage.
- When an AI feature is invoked and no API key is present, the system shall disable the feature and prompt the user to add one.
- When the app starts, the system shall spawn the .NET backend as a sidecar process on a loopback port and pass that port to the frontend over Tauri IPC.
- When the backend sidecar process crashes, the system shall retry with backoff, then show a persistent "backend unavailable" banner if retries are exhausted.
- When the app exits, the system shall explicitly kill the sidecar process so it doesn't linger.
- When the user requests a data export, the system shall produce a JSON file containing all jobs.
- The system shall store the SQLite database file in the OS-standard app data directory, not next to the binary.
- The system shall store uploaded documents in a fixed folder inside the same app data directory.
- When an update is available, the system shall use Tauri's first-party updater plugin to apply it.

## stack
🤖 ai-audited(opus-4.8) — no change; every component is decided in the source doc

- Desktop shell: Tauri
- Backend: existing ASP.NET Core API, unmodified aside from removed features, run as a sidecar process (`externalBin` + `shell:allow-execute`)
- Database: SQLite via EF Core (swapped from PostgreSQL/Npgsql; migrations carry over)
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
🤖 ai-audited(opus-4.8) — no change; six clear exclusions carried from the source doc

- No authentication or multi-user support: the app launches straight into the jobs list.
- No admin panel, user management, or AI-access toggle.
- No demo mode or seeded sample data.
- No cloud storage, cloud backup, or sync between machines.
- No shared codebase with the web app: this is a permanent fork, not a feature-flagged variant.
- No mobile build in this plan (may be revisited separately later).

## open questions
🤖 ai-audited(opus-4.8) — no change; three real unknowns, none currently blocking

- User-selectable document storage path (instead of the fixed app-data-dir location) is deferred; no target version set yet.
- What signal or threshold would justify paying for Apple code signing later ("if macOS adoption/complaints justify it" isn't a defined trigger yet).
- No decision yet on how the sidecar retry/backoff parameters (attempt count, delay curve) are tuned, or what "unavailable" recovery looks like beyond the banner (manual retry button? auto-recovery once the backend comes back?).
