# App name touchpoints — desktop (round 1)

_Last updated: 2026-08-24_

## Status
Round 1: raw inventory only. Impact/breakage analysis and action sorting is round 2 (not done yet — see docs/plans/app-rebrand/product.md).

## Scope note
Covers the desktop repo (`/workspaces/job-tracker-desktop`, Tauri wrapper) specifically. It carries its own copies of `JobTrackerApi/`, `job-tracker-ui/`, and `Job-Application-Tracker.sln` — those are identical to the web repo's and already covered by `docs/plans/app-rebrand/name-touchpoints.md`; not re-listed here. Prose in docs/*.md and README.md is excluded, same as round 1.

## Inventory

### Tauri app identity (`tauri.conf.json`)
- what: product name, window title, bundle identifier
- where: `src-tauri/tauri.conf.json`
- form used: `"productName": "Job Application Tracker"`, window `"title": "Job Application Tracker"`, `"identifier": "com.nagarenegishi.jobtracker"`

### Sidecar binary naming
- what: the bundled backend executable name, referenced in bundler config, the build script that produces it, and the Rust code that spawns it
- where: `src-tauri/tauri.conf.json` (`bundle.externalBin: ["binaries/jobtrackerapi"]`), `src-tauri/scripts/build-sidecar.mjs` (writes `jobtrackerapi-$TARGET_TRIPLE[.exe]`), `src-tauri/src/sidecar.rs` (`app.shell().sidecar("jobtrackerapi")`)
- form used: `jobtrackerapi`

### OS keychain service name
- what: the service identifier used when reading/writing credentials via the OS keychain (`keyring` crate)
- where: `src-tauri/src/keychain.rs` (`const SERVICE: &str = "job-tracker-desktop"`)
- form used: `job-tracker-desktop`

### Cargo package
- what: Rust crate name/lib name in the Tauri backend
- where: `src-tauri/Cargo.toml`
- form used: `name = "app"`, `[lib] name = "app_lib"` — not tied to the product name, noted for completeness

### Auto-updater endpoint
- what: update feed URL and the pinned public key, platform-specific
- where: `src-tauri/tauri.macos.conf.json`, `src-tauri/tauri.windows.conf.json` (`plugins.updater.endpoints`)
- form used: `https://github.com/NagareNegishi/job-tracker-desktop-releases/releases/latest/download/latest.json`

### Flatpak packaging
- what: app ID, desktop entry, AppStream metadata — file names and internal fields
- where: `flatpak/com.nagarenegishi.jobtracker.desktop` (`Name=`, `Icon=`), `flatpak/com.nagarenegishi.jobtracker.metainfo.xml` (`<id>`, `<name>`), `flatpak/com.nagarenegishi.jobtracker.yml` (manifest `id:`, module `name: jobtracker`, references Cargo package name in a comment)
- form used: `com.nagarenegishi.jobtracker` (file names + IDs), `Job Application Tracker` (display name), `jobtracker` (flatpak module name)

### GitHub Actions — artifact/job naming
- what: uploaded build artifact names
- where: `.github/workflows/build-windows.yml`, `.github/workflows/release.yml`
- form used: `jobtracker-windows-installers`, `jobtracker-macos-installers`, `jobtracker-linux-installer`

### GitHub Actions — release publishing to sibling repo
- what: hardcoded target repo for publishing built installers, plus release notes text
- where: `.github/workflows/release.yml`, `release-windows.yml`, `release-macos.yml`, `release-macos-apple-silicon.yml`, `release-linux.yml`
- form used: `REPO="NagareNegishi/job-tracker-desktop-releases"`, notes text containing `"Job Application Tracker v${VERSION}..."` and `"...published from job-tracker-desktop."`

### GitHub Actions — flatpak build/run
- what: manifest path and flatpak app-id used in build, bundle, and demo-video workflows
- where: `.github/workflows/flatpak-build.yml`, `.github/workflows/flatpak-demo-video.yml`
- form used: `flatpak/com.nagarenegishi.jobtracker.yml`, `com.nagarenegishi.jobtracker`

### GitHub Actions — working directory / cache paths (copied-folder references)
- what: paths into the repo's copy of `job-tracker-ui/` — listed here (not the main doc) because these are desktop-repo workflow files, even though the folder itself is the same copied folder
- where: `build-windows.yml`, `release-linux.yml`, `release-macos.yml`, `release-macos-apple-silicon.yml`, `release-windows.yml`, `release.yml` (`cache-dependency-path`, `working-directory`)
- form used: `job-tracker-ui`

## Not found here
- No root-level `package.json` (frontend lives entirely under the copied `job-tracker-ui/`).
- No separate Tauri-specific shell frontend outside `job-tracker-ui/` — the Tauri window loads the copied frontend directly.
- No WiX/NSIS custom installer templates (bundler uses Tauri defaults — no extra name strings to track beyond `productName`).
- `.claude/skills/*/files.json`, `.comment-audit/`, `.config-drift-watch/` in this repo reference only the copied `JobTrackerApi`/`job-tracker-ui` paths (same as the main doc's tooling-config category) — no desktop-specific naming in these.
