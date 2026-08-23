# Product plan: desktop-app-download

## Maturity
lowest: 🌱 idea
🌱 idea 10 · 🤖 ai-audited 0 · 👤 human-ok 0 · ✅ settled 0

## about
🌱 idea

A function-plus-component pair in the web app that tells users a desktop
version of the job tracker exists and links them to download it, surfaced at
a few points in the UI.

## problem / motivation
🌱 idea

The desktop app is built and shipping releases (v0.1.0 through v0.1.2, Windows
and Linux installers) from a public GitHub repo, but nothing in the web app
mentions it. Users have no way to discover the desktop option unless they're
told about it outside the product.

## goal
🌱 idea

A user browsing the web app can find and reach the desktop download in at
most one click, without needing to be told about it out of band.

## audience
🌱 idea

Web app users (existing or prospective) who might prefer a native desktop
client over the browser.

## requirements
🌱 idea

- When a user views the login screen, the system shall display a prompt
  linking to the desktop app download.
- When a login attempt fails, the system shall display the same download
  prompt alongside the error message.
- When an authenticated user views Settings, the system shall display a
  section linking to the desktop app download.
- When the user activates the download prompt, the system shall open the
  public releases page (`job-tracker-desktop-releases`) in a new tab.

## stack
🌱 idea

Frontend only (`job-tracker-ui`), following the existing `services/` +
component convention. No backend changes anticipated unless the "dynamic
latest release" open question below resolves toward a server-side proxy.

## target device / platform
🌱 idea

Web app (React), linking out to Windows and Linux desktop installers. No Mac
build exists yet.

## constraints
🌱 idea

The link must point only at the public `job-tracker-desktop-releases` repo.
The private source repo (`job-tracker-desktop`) must not be referenced
anywhere in this repo's docs or code.

## non-goals
🌱 idea

- No auto-updater or in-app installer — this only links out to GitHub releases.
- No migration or setup work for the desktop app itself — that's already done.
- No new backend endpoint unless the dynamic-lookup open question requires one.

## open questions
🌱 idea

- Static link to the releases page vs. a dynamic "latest release" lookup via
  the GitHub API (adds rate-limit and caching considerations for an
  unauthenticated client-side call)?
- Should the component detect the user's OS and link straight to the matching
  asset, or just link to the releases page and let the user pick? Mac has no
  build yet, so the component needs to degrade gracefully if it does try to
  detect platform.
- Is failed-login really the right placement? It's a stressful moment for the
  user and the connection to "try the desktop app instead" isn't obvious —
  worth checking whether this is genuinely useful or just clutter, and whether
  it should only appear after repeated failures rather than the first one.
- Where exactly is "somewhere the user sees first"? There's no public landing
  route today — `/` redirects to `/jobs`, which requires auth — so in practice
  this likely means the login screen itself.
- Should the prompt be dismissible or remember a "don't show again" choice, so
  it doesn't nag returning users who've already chosen the web app?
