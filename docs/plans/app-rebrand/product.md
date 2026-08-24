# Product plan: app-rebrand

## Maturity
lowest: 🤖 ai-audited
🌱 idea 0 · 🤖 ai-audited 11 · 👤 human-ok 0 · ✅ settled 0

## about
🤖 ai-audited(sonnet-5) — tightened; folded in the staged-rollout decision

A plan and checklist for renaming the app (candidate name "NooBi", not yet
settled) and applying a separately-produced icon and logo across the web and
desktop apps, ahead of distributing them more widely. The rename is staged:
cosmetic display-name/logo changes first, then the internal identifiers that
are safe to rename outright, with a handful of higher-risk desktop-specific
items (bundle identifier, OS keychain service name, auto-update endpoint,
Flatpak app ID) deferred to their own researched decisions.

## problem / motivation
🤖 ai-audited(sonnet-5) — tightened; now backed by concrete findings instead of assumption

The apps are about to be distributed more seriously. Going out under the
current working name and no visual identity, then rebranding later, means
retrofitting a new name and logo onto a product that already has users,
bookmarks, installers, and shared links in the wild. A full touchpoint scan
across both repos confirmed this isn't hypothetical: the desktop app's OS
keychain service name, its bundle identifier, and its auto-update endpoint
are all the kind of identifier that gets harder to change, not easier, once
real users have the app installed. Settling the brand now avoids that churn.

## goal
🤖 ai-audited(sonnet-5) — tightened; captures the staged approach

The app presents one consistent name and visual identity everywhere a user
or developer encounters it. Reached in stages — cosmetic display changes
first, then internal identifiers that are safe to rename outright — with
anything touching an already-installed user's local state (desktop bundle
identity, stored credentials, update delivery) handled as its own deliberate
decision rather than swept in by default.

## audience
🤖 ai-audited(sonnet-5) — no material change

End users of the web and desktop apps, and whoever maintains the repos going
forward.

## requirements
🤖 ai-audited(sonnet-5) — unchanged; validated against round-2 findings, nothing contradicted

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
🤖 ai-audited(sonnet-5) — no material change

Touches both `job-tracker-ui` (React) and `JobTrackerApi` (.NET) in this repo,
plus the desktop app and its releases repo, and GitHub repo settings.

## target device / platform
🤖 ai-audited(sonnet-5) — corrected: desktop also ships macOS, not just Windows/Linux

Web app, desktop app (Windows, macOS, and Linux — confirmed via the desktop
repo's release workflows, which build all three), and the repos/URLs that
front them.

## constraints
🤖 ai-audited(sonnet-5) — narrowed to match the actual rule set this session

Icon and logo assets are produced separately and are an input to this plan,
not part of it. The private desktop repo's source code and implementation
details must never be referenced from this (web) repo's docs or code, rename
or not — but its name-related config identifiers (not implementation) may be
recorded here, kept in their own doc rather than mixed into this repo's own
touchpoint inventory (see `name-touchpoints-desktop.md`).

## non-goals
🤖 ai-audited(sonnet-5) — resolved the open hedge on desktop-specific steps

- Not designing the icon or logo — that's a separate track.
- Not a user data migration — nothing here should touch stored data, only
  names, identifiers, and visual assets.
- Not resolving the four desktop-specific high-risk items (bundle
  identifier, OS keychain service name, auto-update endpoint, Flatpak app
  ID) as part of this pass. Round-2 verification confirmed these are
  genuinely non-trivial — each carries a real external-state or
  unverified-behavior risk — so each gets its own research/decision rather
  than being swept in with the rest. Tracked under open questions below.

## open questions
🤖 ai-audited(sonnet-5) — reorganized into resolved/still-open; three resolved this session, four added from round-2 findings; D3's severity corrected during plan-verify (keychain stores only the optional Anthropic API key, not an account credential)

### Resolved this session
- **JWT `Issuer`/`Audience` rename does not force re-login.**
  `AuthController.Refresh()` validates the refresh token against the
  DB-stored `RefreshToken` row, not JWT claims — so the frontend's existing
  silent-refresh already handles a config change transparently.
- **GitHub repo rename redirect, checked against GitHub's own docs.** Web
  page URLs and git clone/fetch/push against the old name redirect
  automatically and indefinitely (breaks only if the old name is later
  reused by a new repo). GitHub Actions referencing an Action *hosted* in a
  renamed repo do not redirect — checked, doesn't apply to either of this
  project's repos (no such references found).
- **Rename order** — resolved via the staged-rollout decision: cosmetic
  display changes first, then the mechanical/safe internal identifiers, with
  the desktop high-risk items handled separately. Full per-item bucketing
  this is based on is in `name-touchpoints-verification.md`.

### Still open
- Is "NooBi" a real candidate to plan around, or should the checklist stay
  name-agnostic for now?
- Does "config and id" extend to third-party service registrations tied to
  the current name (email sending domain/display name, storage bucket
  naming, any API key labels)? Not covered by the round-1/2 scans.
- Should the old name persist anywhere as an alias during a transition
  window (e.g. repo description, README note), or is this a clean cutover?
- Is the production domain (`jobtracker.nagarenegishi.com`) in scope for
  this rebrand at all, or does the app keep its current domain regardless of
  what it's called?
- Tauri bundle identifier (`com.nagarenegishi.jobtracker`) — does changing
  it break update continuity or OS-level app identity for users who already
  have the app installed? Needs research into Tauri's specific behavior
  before deciding whether it changes at all.
- OS keychain service name (hardcoded in the desktop app) — if it changes,
  a user's saved Anthropic API key (the only thing stored there — confirmed
  via `keychain.rs`; it's the optional AI-parsing key, not an app-login
  credential, since the desktop app is local-only with no account) becomes
  invisible to the renamed app. Lower severity than "existing users get
  logged out" implies: at most a one-time re-paste of an optional key, no
  loss of account access or tracked data. Still needs a decision: ship a
  migration, or accept the one-time re-paste.
- Auto-update endpoint — GitHub's redirect behavior is confirmed for general
  web traffic but not verified for this specific release-asset-download URL
  pattern fetched by a non-browser HTTP client; also has a chicken/egg
  constraint (an already-installed client only knows the endpoint baked
  into the build it's currently running). Needs empirical verification or a
  proactive fix.
- Flatpak app ID (`com.nagarenegishi.jobtracker`) — is this app currently
  published on Flathub under this ID? If so, changing it likely means a new
  listing rather than a rename, with consequences for existing installs'
  auto-updates.

## known touchpoints
🤖 ai-audited(sonnet-5) — superseded by dedicated docs; this section now just points to them

Full inventories exist and are more current than anything that used to be
duplicated here:

- `name-touchpoints.md` — round-1 raw inventory, this (web) repo
- `name-touchpoints-desktop.md` — round-1 raw inventory, the desktop repo
  (config identifiers only, not implementation — see constraints above)
- `name-touchpoints-verification.md` — round-2 impact verification, each
  item bucketed by whether it's safe to rename outright, needs a decision
  first, or needs no action at all — the basis for the staged rollout order
  once `plan-impl` builds it
