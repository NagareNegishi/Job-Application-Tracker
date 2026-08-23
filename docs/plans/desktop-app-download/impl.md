# Implementation plan: desktop-app-download

## Maturity
lowest: 🌱 idea
🌱 idea 3 · 🤖 ai-audited 6 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (not checked)

A backend endpoint calls the GitHub Releases API for
`NagareNegishi/job-tracker-desktop-releases`, picks the real installer per
platform by filename pattern, and caches the result in memory on a short
TTL. A frontend service/hook read that endpoint, and a component renders
one labeled download button per platform present — or, on failure, one
static link to the releases page. Placed on the login screen and in
Settings.

## Risks & unknowns
🌱 idea · ❔ unverified (not checked)

- **Filename-pattern fragility.** The backend identifies installers by
  matching asset filenames (`.msi` → Windows, `.dmg` containing "universal"
  → macOS, `.deb` → Linux) against the GitHub Releases API's asset list —
  🔗 verified → doc:
  https://github.com/NagareNegishi/job-tracker-desktop-releases/releases/latest
  (live check: current assets are
  `Job.Application.Tracker_0.1.2_x64_en-US.msi`,
  `Job.Application.Tracker_0.1.2_universal.dmg`,
  `Job.Application.Tracker_0.1.2_aarch64.dmg`; no Linux asset in this
  release despite one existing in v0.1.0). If the desktop app's build script
  changes filename conventions, a button silently stops appearing or
  404s — there's no compile-time signal. Considered and rejected: parsing
  `latest.json` (points at auto-updater payloads, not installers — checked
  directly, both `darwin-*` keys resolve to the same `.app.tar.gz`, not any
  `.dmg`) and a second manifest published from the desktop repo's own CI
  (real cross-repo work for a benefit that mostly evaporates since the same
  person maintains both repos).
- **Auth surface.** This endpoint must be reachable pre-login, but CLAUDE.md
  states every controller except `AuthController` requires `[Authorize]`.
  The only existing unauthenticated route is `/health` — a minimal-API
  endpoint with `.AllowAnonymous()`, not an MVC controller — 🔗 verified →
  src: JobTrackerApi/Program.cs:378-388. Follow that precedent rather than
  adding `[AllowAnonymous]` to a new controller.
- `IMemoryCache` has zero existing usage in this codebase (checked) — a
  built-in ASP.NET Core service, first use here, not a new dependency.
- `api.github.com` sends `Access-Control-Allow-Origin: *` (checked live) —
  CORS isn't actually why this must be server-side; the reason is the
  60 req/hr/IP unauthenticated rate limit (checked live via
  `x-ratelimit-limit`), shared across every visitor behind the same IP.
  Caching server-side avoids that regardless of traffic volume.

## Steps

### Step 1: Add the backend release-installer endpoint
🌱 idea · ❔ unverified (net-new)

New minimal-API route in `JobTrackerApi/Program.cs` (e.g.
`GET /api/desktop-release`), `.AllowAnonymous()` per the `/health` pattern
(see Risks). Calls
`GET api.github.com/repos/NagareNegishi/job-tracker-desktop-releases/releases/latest`,
scans `assets[]` for the Windows/macOS/Linux installer by filename pattern,
and returns `{ version, platforms: [{ platform, label, url }] }` — only
entries actually found; no placeholder for Linux while absent. Caches the
result in `IMemoryCache` on a short TTL (e.g. 1 hour). Returns an error
status if the upstream call fails and nothing is cached yet, so the
frontend's fallback path has a clear signal to act on.

### Step 2: Add the frontend release-installer service function
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New file `job-tracker-ui/src/services/desktopReleaseService.ts`. Standard
`apiFetch` call to the Step 1 endpoint — calls our own backend, so this
follows every other file in `services/`.

### Step 3: Add the release-installer query hook
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/hooks/{jobQuery,adminQuery,preferencesQuery,documentQuery,profileQuery}.ts

New file `job-tracker-ui/src/hooks/desktopReleaseQuery.ts` — every hook file
here that imports `@tanstack/react-query` is named `<domain>Query.ts`; plain
`use*.ts` files are non-Query utility hooks. TanStack Query wrapper around
Step 2, exposing loading/error/data.

### Step 4: Build the download-prompt component
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New component `job-tracker-ui/src/components/DesktopDownloadPrompt.tsx`.
One button per platform entry returned by the backend, using its `label`
field directly (no client-side platform-key-to-label mapping needed — the
backend already owns that); each opens its `url` in a new tab. On fetch
failure, one static link to `releases/latest`. No dismiss state.

### Step 5: Add the prompt to the login screen
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/LoginPage.tsx:1-118

Insert between the "Try Demo" button (105–108) and "No account?" (110–113),
matching the existing divider-separated block pattern (96–103).

### Step 6: Add the prompt to Settings
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/SettingsPage.tsx:79-152

New `<section className="mt-6 pt-6 border-t">`, matching "Appearance" (107)
and "AI Features" (133–134) — insert after line 151.

### Step 7: Add backend tests for the release-installer endpoint
🌱 idea · ❔ unverified (net-new)

`JobTrackerApi.Tests` — cover the filename-matching logic (each platform
picked correctly, Linux absent when no matching asset exists) and the
cache/fallback behavior (upstream failure with an empty cache surfaces an
error rather than a blank 200).
