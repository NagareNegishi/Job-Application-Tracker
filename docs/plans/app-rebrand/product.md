# Product plan: app-rebrand

## Maturity
lowest: 🌱 idea
🌱 idea 10 · 🤖 ai-audited 0 · 👤 human-ok 0 · ✅ settled 0

## about
🌱 idea

A plan and checklist for renaming the app (candidate: "NooBi", not settled)
and applying a separately-produced icon and logo across the web and desktop
apps, ahead of distributing them more widely.

## problem / motivation
🌱 idea

The apps are about to be distributed more seriously. Going out under the
current working name and no visual identity, then rebranding later, means
retrofitting a new name and logo onto a product that already has users,
bookmarks, installers, and shared links in the wild. Settling the brand now
avoids that churn.

## goal
🌱 idea

The app presents one consistent name and visual identity everywhere a user or
developer encounters it, applied in an order that doesn't break anything
mid-rename.

## audience
🌱 idea

End users of the web and desktop apps, and whoever maintains the repos going
forward.

## requirements
🌱 idea

- When the app name is finalized, the system shall reflect it in all
  user-facing UI text (page title, header/logo area).
- When the icon and logo assets are delivered, the system shall replace the
  current favicon and any in-app logo placeholders in both the web and
  desktop builds.
- When developer-facing identifiers are renamed (package name, JWT issuer/
  audience, solution/project names), the system shall do so in an order that
  doesn't invalidate things still in use (e.g. active sessions) without a
  planned cutover.
- When the repos are renamed, the system shall update cross-references
  between them (web repo, desktop repo, desktop-releases repo) consistently.

## stack
🌱 idea

Touches both `job-tracker-ui` (React) and `JobTrackerApi` (.NET) in this repo,
plus the desktop app and its releases repo, and GitHub repo settings.

## target device / platform
🌱 idea

Web app, desktop app (Windows/Linux), and the repos/URLs that front them.

## constraints
🌱 idea

Icon and logo assets are produced separately and are an input to this plan,
not part of it. The private desktop source repo must still never be
referenced from this (web) repo's docs or code, rename or not.

## non-goals
🌱 idea

- Not designing the icon or logo — that's a separate track.
- Not a user data migration — nothing here should touch stored data, only
  names, identifiers, and visual assets.
- Not the detailed desktop-specific rename steps (installer naming, app ID,
  auto-update feed if any) — flagged as an affected surface here, but may
  need its own doc if it turns out to be non-trivial.

## open questions
🌱 idea

- Is "NooBi" a real candidate to plan around, or still open enough that the
  checklist should stay name-agnostic for now?
- JWT `Issuer`/`Audience` currently read `"JobTrackerApi"` / `"JobTrackerClient"`
  (`JobTrackerApi/appsettings.Development.json`). Changing these on a live
  system invalidates existing tokens — is a forced re-login acceptable, or
  does this need a transition period accepting both values?
- When a GitHub repo is renamed, GitHub keeps a redirect from the old name.
  Does that cover everything that matters here — clone URLs, already-shared
  release asset links, local `gh`/git remotes, any CI hooks — or are there
  gaps to plan around?
- Does "config and id" extend to third-party service registrations tied to
  the current name (e.g. email sending domain/display name, storage bucket
  naming, any API key labels) that would also need updating?
- What order minimizes breakage: code/config first and repo rename last, or
  the reverse? Renaming a repo while still developing against it changes the
  remote out from under an open working tree.
- Should the old name persist anywhere as an alias during a transition
  window (e.g. repo description, README note), or is this a clean cutover?

## known touchpoints (from repo scan)
🌱 idea

Not exhaustive — a starting list for the checklist this plan should produce:

- `job-tracker-ui/package.json` — `"name": "job-tracker-ui"`
- `job-tracker-ui/index.html` — `<title>job-tracker-ui</title>`, favicon link
- `JobTrackerApi/appsettings.Development.json` — `Jwt:Issuer` = `"JobTrackerApi"`,
  `Jwt:Audience` = `"JobTrackerClient"`
- `Job-Application-Tracker.sln` — solution file name
- `README.md` — repo-level name references
- GitHub repo names/URLs: this repo, `job-tracker-desktop` (private),
  `job-tracker-desktop-releases` (public)
