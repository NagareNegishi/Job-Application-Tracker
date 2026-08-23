# Implementation plan: desktop-app-download

## Maturity
lowest: 🌱 idea
🌱 idea 2 · 🤖 ai-audited 5 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (not checked)

A service function fetches the Tauri updater manifest (`latest.json`) from
the public `job-tracker-desktop-releases` repo, a TanStack Query hook wraps
it with caching and error state, and a component renders one download
button per platform key in the manifest — or, on fetch failure, one static
link to the releases page. Placed on the login screen and in Settings.

## Risks & unknowns
🌱 idea · 🔗 verified → doc: https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests

- **Blocking.** GitHub release assets (`releases/latest/download/<file>`
  redirects to `release-assets.githubusercontent.com`, an Azure Blob
  backend) send no `Access-Control-Allow-Origin` header — checked directly
  against a live download. A browser `fetch()` of `latest.json` will fail
  CORS. `api.github.com` does send `Access-Control-Allow-Origin: *`, but
  that's the rate-limited path (60 req/hr/IP) `latest.json` was chosen to
  avoid. Conflicts with product.md's settled "no new backend endpoint"
  non-goal — needs a backend proxy, a switch to the rate-limited API, or
  dropping per-platform buttons for a static link. Back to the product doc,
  not decided here.
- `job-tracker-desktop-releases`'s owner/repo path isn't confirmed in this
  repo yet — needed before any fetch URL can be written.
- Tauri manifest schema — 🔗 verified → doc:
  https://github.com/tauri-apps/tauri-docs/blob/v2/src/content/docs/plugin/updater.mdx —
  `version`, optional `notes`/`pub_date`, `platforms` map keyed
  `<os>-<arch>` (`windows-x86_64`, `darwin-aarch64`, `darwin-x86_64`,
  `linux-x86_64`), each requiring a `url`. Moot if the CORS finding moves
  the design off `latest.json`.
- Plain-`fetch()`-outside-`apiFetch` has precedent — 🔗 verified → src:
  job-tracker-ui/src/lib/api.ts:12-18 (`silentRefresh`).

## Steps

### Step 1: Add the release-manifest service function
🌱 idea · ❔ unverified (net-new) — blocked on the CORS finding above

New file `job-tracker-ui/src/services/desktopReleaseService.ts`. Plain
`fetch()`, per the `silentRefresh` precedent. Target URL unresolved:
`releases/latest/download/latest.json` isn't reachable from a browser —
needs the product doc to settle how the manifest gets fetched.

### Step 2: Add the release-manifest query hook
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/hooks/{jobQuery,adminQuery,preferencesQuery,documentQuery,profileQuery}.ts

New file `job-tracker-ui/src/hooks/desktopReleaseQuery.ts` — corrected from
`useDesktopRelease.ts`. Every hook file here that imports
`@tanstack/react-query` is named `<domain>Query.ts`; plain `use*.ts` files
are non-Query utility hooks. TanStack Query wrapper around Step 1, exposing
loading/error/data.

### Step 3: Build the download-prompt component
🤖 ai-audited(claude-sonnet-5) · ❔ unverified (net-new)

New component `job-tracker-ui/src/components/DesktopDownloadPrompt.tsx`.
One button per platform key present in the manifest, each opening that
platform's asset URL in a new tab; on fetch failure, one static link to
`releases/latest`. No dismiss state.

### Step 4: Add the prompt to the login screen
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/LoginPage.tsx:1-118

Insert between the "Try Demo" button (105–108) and "No account?" (110–113),
matching the existing divider-separated block pattern (96–103).

### Step 5: Add the prompt to Settings
🤖 ai-audited(claude-sonnet-5) · 🔗 verified → src: job-tracker-ui/src/pages/SettingsPage.tsx:79-152

New `<section className="mt-6 pt-6 border-t">`, matching "Appearance" (107)
and "AI Features" (133–134) — insert after line 151.
