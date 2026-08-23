# Product plan: desktop-app-download

## Maturity
lowest: ✅ settled
🌱 idea 0 · 🤖 ai-audited 0 · 👤 human-ok 0 · ✅ settled 10

## about
✅ settled

A function-plus-component pair in the web app that tells users a desktop
version of the job tracker exists and links them to download it, surfaced at
a few points in the UI.

## problem / motivation
✅ settled

The desktop app is built and shipping releases (v0.1.0 through v0.1.2 so far,
Windows/macOS/Linux installers) from a public GitHub repo, but nothing in the
web app mentions it. Users have no way to discover the desktop option unless
they're told about it outside the product.

## goal
✅ settled

A user browsing the web app can find and reach the desktop download in at
most one click, without needing to be told about it out of band.

## audience
✅ settled

Web app users (existing or prospective) who might prefer a native desktop
client over the browser.

## requirements
✅ settled

- When a user views the login screen, the system shall display a prompt
  linking to the desktop app download.
- When an authenticated user views Settings, the system shall display a
  section linking to the desktop app download.
- When the prompt renders, the system shall fetch the release manifest from a
  backend endpoint and display one download button per platform key present.
  *(browser can't fetch `latest.json` directly — GitHub's release CDN sends
  no CORS headers; see impl.md.)*
- When the user activates a platform's download button, the system shall open
  that platform's asset URL from the manifest in a new tab.
- When the manifest fetch fails, the system shall fall back to a single link
  to the static `releases/latest` page.

## stack
✅ settled

Frontend (`job-tracker-ui`, `services/` + component convention) plus a new
read-only backend endpoint (`JobTrackerApi`) that fetches `latest.json`
server-side and caches it in memory (short TTL).

## target device / platform
✅ settled

Web app (React), linking to desktop installers per platform key in
`latest.json` — Windows, macOS (universal), Linux.

## constraints
✅ settled

The link must point only at the public `job-tracker-desktop-releases` repo.
The private source repo (`job-tracker-desktop`) must not be referenced
anywhere in this repo's docs or code.

## non-goals
✅ settled

- No auto-updater or in-app installer — this only links out to GitHub releases.
- No migration or setup work for the desktop app itself — that's already done.
- No webhook or manual step to keep the backend's cached URLs current — the
  cache just re-fetches itself on TTL expiry.
- No dismiss/"don't show again" state.

## open questions
✅ settled

None remaining.
