# Implementation plan: desktop-app-download

## Maturity
lowest: 🌱 idea
🌱 idea 2 · 🤖 ai-audited 6 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (not checked)

A backend endpoint fetches `latest.json` server-side and caches it in memory
on a short TTL. A frontend service/hook read that endpoint, and a component
renders one download button per platform key — or, on failure, one static
link to the releases page. Placed on the login screen and in Settings.

## Risks & unknowns
🌱 idea · ❔ unverified (not checked)

- `job-tracker-desktop-releases`'s owner/repo path isn't confirmed yet —
  needed before the backend's fetch URL can be written.
- **Auth surface.** This endpoint must be reachable pre-login, but CLAUDE.md
  states every controller except `AuthController` requires `[Authorize]`.
  The only existing unauthenticated route is `/health` — a minimal-API
  endpoint with `.AllowAnonymous()`, not an MVC controller — 🔗 verified →
  src: JobTrackerApi/Program.cs:378-388. Follow that precedent rather than
  adding `[AllowAnonymous]` to a new controller.
- `IMemoryCache` has zero existing usage in this codebase (checked) — a
  built-in ASP.NET Core service, first use here, not a new dependency.
- Tauri manifest schema — 🔗 verified → doc:
  https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/plugin/updater.mdx —
  `version`, optional `notes`/`pub_date`, `platforms` map keyed
  `<os>-<arch>` (`windows-x86_64`, `darwin-aarch64`, `darwin-x86_64`,
  `linux-x86_64`), each requiring a `url`.
- GitHub's `releases/latest/download/<file>` URL always resolves to the
  current release's asset — 🔗 verified → doc:
  https://docs.github.com/en/repositories/releasing-projects-on-github/linking-to-releases.
  Fetched server-side, so it's exempt from the browser CORS issue
  (confirmed separately: GitHub's release CDN sends no ACAO header).

## Steps

### Step 1: Add the backend release-manifest endpoint
🌱 idea · ❔ unverified (net-new)

New minimal-API route in `JobTrackerApi/Program.cs` (e.g.
`GET /api/desktop-release`), following the `/health` pattern —
`.AllowAnonymous()`, not a new `[Authorize]`-exempt controller (see Risks).
Fetches `releases/latest/download/latest.json` from the public releases
repo server-side, caches the parsed result in `IMemoryCache` on a short TTL
(e.g. 1 hour), and returns the cached manifest (or triggers a re-fetch on
expiry). No DB access needed.

### Step 2: Add the frontend release-manifest service function
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New file `job-tracker-ui/src/services/desktopReleaseService.ts`. Standard
`apiFetch` call to the Step 1 endpoint — this now calls our own backend, so
the earlier "plain fetch, not apiFetch" question doesn't apply; it follows
every other file in `services/`.

### Step 3: Add the release-manifest query hook
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/hooks/{jobQuery,adminQuery,preferencesQuery,documentQuery,profileQuery}.ts

New file `job-tracker-ui/src/hooks/desktopReleaseQuery.ts` — every hook file
here that imports `@tanstack/react-query` is named `<domain>Query.ts`; plain
`use*.ts` files are non-Query utility hooks. TanStack Query wrapper around
Step 2, exposing loading/error/data.

### Step 4: Build the download-prompt component
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New component `job-tracker-ui/src/components/DesktopDownloadPrompt.tsx`.
One button per platform key present in the manifest, each opening that
platform's asset URL in a new tab; on fetch failure, one static link to
`releases/latest`. No dismiss state.

### Step 5: Add the prompt to the login screen
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/LoginPage.tsx:1-118

Insert between the "Try Demo" button (105–108) and "No account?" (110–113),
matching the existing divider-separated block pattern (96–103).

### Step 6: Add the prompt to Settings
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/SettingsPage.tsx:79-152

New `<section className="mt-6 pt-6 border-t">`, matching "Appearance" (107)
and "AI Features" (133–134) — insert after line 151.
