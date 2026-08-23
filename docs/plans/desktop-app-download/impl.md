# Implementation plan: desktop-app-download

## Maturity
lowest: 🌱 idea
🌱 idea 3 · 🤖 ai-audited 4 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (not checked)

A service function fetches the Tauri updater manifest (`latest.json`) from
the public `job-tracker-desktop-releases` repo's release CDN, a TanStack
Query hook wraps it with caching and error state, and a single component
renders one download button per platform key in the manifest — or, on
fetch failure, one static link to the releases page. That component gets
placed on the login screen and in Settings; no other code changes.

## Risks & unknowns
🌱 idea · ❔ unverified (not checked)

- The exact `job-tracker-desktop-releases` owner/repo path isn't confirmed
  in this repo yet — needed before the fetch URL can be written.
- Whether GitHub's release CDN serves `latest.json` with CORS headers that
  allow a browser `fetch()` from the web app's origin hasn't been checked.
  If it doesn't, the fallback-link path becomes the only option and the
  manifest fetch needs to move behind a backend proxy — which would break
  the "no new backend endpoint" non-goal.
- The Tauri manifest's platform key names (e.g. `windows-x86_64`,
  `darwin-x86_64`) are assumed from the general Tauri updater format, not
  confirmed against this project's actual published `latest.json`.
- No existing `services/` file in this codebase fetches an external
  (non-`apiFetch`) URL — this introduces a new pattern alongside the
  established backend-fetch convention, so it's worth confirming placement
  reads naturally next to the rest of `src/services/`.

## Steps

### Step 1: Add the release-manifest service function
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New file `job-tracker-ui/src/services/desktopReleaseService.ts`. Plain
`fetch()` (not `apiFetch` — this is an external, unauthenticated GitHub CDN
request, not the backend API) against
`releases/latest/download/latest.json` in the public releases repo. Parses
the manifest into a small typed shape (version + platform → asset URL) and
throws on network failure or malformed JSON so the hook layer can catch it.

### Step 2: Add the `useDesktopRelease` query hook
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New file `job-tracker-ui/src/hooks/useDesktopRelease.ts`. TanStack Query
wrapper around the Step 1 service, following this codebase's existing
`hooks/` pattern. Exposes loading/error/data so the component can render
the fallback link on failure without its own fetch logic.

### Step 3: Build the download-prompt component
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New component (e.g. `job-tracker-ui/src/components/DesktopDownloadPrompt.tsx`)
using `useDesktopRelease`. Renders one button per platform key present in
the manifest, each opening that platform's asset URL in a new tab; on fetch
failure, renders a single link to the static `releases/latest` page
instead. No dismiss state, per the settled product doc — this is a plain
render, not something with its own persisted UI state.

### Step 4: Add the prompt to the login screen
🌱 idea · ❔ unverified (not checked)

Wire `DesktopDownloadPrompt` into `LoginPage`. Exact placement within the
existing layout not yet scoped — needs a look at the current login page
structure first.

### Step 5: Add the prompt to Settings
🌱 idea · ❔ unverified (not checked)

Wire `DesktopDownloadPrompt` into the Settings page as its own section.
Exact placement relative to existing settings sections not yet scoped —
needs a look at the current Settings page structure first.
