# App name touchpoints — verification (round 2)

_Last updated: 2026-08-24_

## Status
Round 2: for each round-1 touchpoint, verify what renaming it would actually
break (if anything) and sort into a bucket. Where real risk or unknown
external behavior is involved, that's flagged as needing research/decision
rather than guessed at.

**If resuming this in a new session**: check the Progress tracker below.
Every row currently has a bucket assigned — this pass got through the full
list. What's NOT done yet: the framing question and the two 🔬 items marked
"needs empirical test" haven't been tested against a live rename (can't be,
until a rename actually happens) — treat those as still open when the actual
rename is executed, not just verified-safe.

## Framing question (answer this before bucketing means much)
Is this a **cosmetic rebrand** (user-facing display name/logo/title only) or
a **full internal rename** (namespaces, class names, config keys, DB/env
identifiers, repo names)? Most 🔧/🔬 items below only matter under the full
rename. A cosmetic-only rebrand shrinks this to: frontend title/package name,
Tauri `productName`/window title, and the icon/logo swap — nearly everything
else in both round-1 docs stays untouched. This wasn't settled in `product.md`
and materially changes how much of the list below is even in scope.

## Bucket legend
- ✅ **no-action** — cosmetic, freely renameable, nothing depends on it
- 🔧 **action-direct** — needs editing when the rename happens, but the fix
  is known and mechanical; no open unknowns
- 🔬 **action-needs-research** — real external/persisted state is coupled to
  this name; the right fix depends on answering something first
- ❓ **open-question** — not a technical fact, a scope/policy call for the
  user

## Progress tracker

| # | Category | Source | Bucket | Note |
|---|---|---|---|---|
| M1 | .NET namespace root | main | 🔧 | mechanical; see cross-repo note under M4 |
| M2 | `JobTrackerContext` DbContext class | main | 🔧 | verified via EF migration model |
| M3 | Connection string config key | main | 🔧 | multi-file, same repo, coordinate in one PR |
| M4 | Solution/project files & folders | main | 🔬 | cascades into desktop repo's sidecar build |
| M5 | JWT Issuer/Audience | main | 🔧 | verified via code — no forced re-login |
| M6 | Frontend package/build identity | main | ✅ | no coupling found |
| M7 | Desktop releases repo reference (URL) | main | 🔧 | GitHub redirect covers this either way |
| M8 | Docker/deploy image & container names | main | 🔧 | has one real infra-side step (see note) |
| M9 | Dockerfile references | main | 🔧 | coordinate with M4 |
| M10 | Local dev Postgres DB name | main | ✅ | dev-only, zero prod impact |
| M11 | `.env.example` | main | ✅ | template text only |
| M12 | Prod domain / frontend-origin allowlist | main | ❓ | is the domain even changing? not settled |
| M13 | CI/CD workflows | main | 🔧 | coordinate with M1/M4 |
| M14 | Dependabot config | main | ✅ | single path field |
| M15 | Demo user email | main | ✅ | verified — demo login never sends real email |
| M16 | Claude Code tooling config | main | ✅ | internal only, zero user-facing risk |
| M17 | GitHub repo names | main | 🔧 | verified via GitHub docs (see below) |
| D1 | Tauri app identity (productName/title/identifier) | desktop | 🔬 | bundle identifier change ≠ safe, see note |
| D2 | Sidecar binary naming | desktop | 🔧 | coordinate with M4 (cross-repo) |
| D3 | OS keychain service name | desktop | 🔬 | orphans existing users' stored credentials |
| D4 | Cargo package | desktop | ✅ | already generic, not tied to product name |
| D5 | Auto-updater endpoint | desktop | 🔬 | redirect coverage for this is unverified |
| D6 | Flatpak packaging (app ID) | desktop | 🔬 | possible Flathub re-registration, needs check |
| D7 | GitHub Actions artifact/job naming | desktop | ✅ | cosmetic, internal to CI runs only |
| D8 | GitHub Actions release publishing (REPO=) | desktop | 🔧 | fix directly at rename time, don't rely on redirect |
| D9 | GitHub Actions flatpak build/run | desktop | 🔧 | coordinate with D6's decision |
| D10 | GitHub Actions working-dir/cache paths | desktop | 🔧 | same as M13, no new risk |

## Findings

### M1 — .NET namespace root
Mechanical `namespace`/`using` rename across ~113 files (IDE rename handles
it). Checked `appsettings*.json` `Logging:LogLevel` — not namespace-keyed
(only `Default` and `Microsoft.AspNetCore`), so no logging config depends on
the current namespace string. The real coupling isn't the namespace itself,
it's the **compiled assembly name**, which defaults from the `.csproj`
filename — see M4.

### M2 — `JobTrackerContext` DbContext class
Confirmed the migrations snapshot file is
`JobTrackerApi/Migrations/JobTrackerContextModelSnapshot.cs`, named after the
class. EF Core's migration history table stores migration *IDs* (timestamps +
names), not the DbContext class name — renaming the class (and the snapshot
file to match) is a standard IDE-rename with no migration regeneration
required and no risk to already-applied migrations in the DB.

### M3 — Connection string config key
Same key (`ConnectionStrings:JobTrackerContext` /
`ConnectionStrings__JobTrackerContext`) has to change together across
`appsettings.Development.json`, `.devcontainer/.env`,
`.devcontainer/devcontainer.json`, `.github/workflows/deploy.yml`,
`compose.prod.yml`. All five files live in this repo, so it's one coordinated
PR, not a live cutover — no partial-deploy window where old and new keys
disagree.

### M4 — Solution/project files & folders
**Cross-repo coupling confirmed.** Read
`/workspaces/job-tracker-desktop/src-tauri/scripts/build-sidecar.mjs`: it
hardcodes `apiProjectDir` as `../../JobTrackerApi` (folder name) and expects
the published executable at `JobTrackerApi(.exe)` — the default output name
derived from `JobTrackerApi.csproj`. Renaming the web repo's project
folder/`.csproj` **without** updating this script breaks the desktop app's
sidecar build. This is the single biggest coordination point in the whole
list — it's not that either repo alone is risky, it's that they have to move
together.

### M5 — JWT Issuer/Audience
Read `Program.cs`: `ValidateIssuer = true` and `ValidateAudience = true`, so
any access token issued under the old values fails validation the instant
the config changes. But read `AuthController.Refresh()`: it validates the
refresh token by looking up the opaque token value in the `RefreshTokens`
table, **not** by checking JWT issuer/audience claims. So a logged-in user
just gets one 401 on their next API call, which the frontend's existing
silent-refresh logic (`src/lib/auth.ts`) already handles transparently by
fetching a new access token under the new config — no forced re-login, no
transition period needed. **This resolves the open question in `product.md`.**

### M6 — Frontend package/build identity
`package.json` `name` and the folder name aren't referenced by anything at
build or runtime beyond themselves (Vite doesn't derive output filenames from
`package.json` name by default). No coupling found.

### M7 — Desktop releases repo reference (frontend URL)
Per GitHub's rename docs (see M17), this is a plain web page URL
(`.../releases/latest`) — covered by GitHub's web-traffic redirect either
way. Update it for cleanliness when renaming, but it won't silently break if
missed in the same PR.

### M8 — Docker/deploy image & container names
The image name strings themselves are free to rename (both files that set
them live in this repo, changed together). One thing this *doesn't* cover:
if the ECR repository in AWS is also being renamed (vs. just retagging into
the same ECR repo under a new image name), that's an actual AWS-console/CLI
step outside the codebase — not a research unknown, just a reminder it's not
purely a text edit.

### M9 — Dockerfile references
`COPY`/`ENTRYPOINT` paths reference `JobTrackerApi.csproj`/`.dll` — same
assembly-name coupling as M4, same fix, same PR.

### M10 — Local dev Postgres DB name
`.devcontainer/.env` only, dev-only, no prod path touches it, no other file
reads this value except the devcontainer's own Postgres init. Zero risk
either way.

### M11 — `.env.example`
Template file, never executed, values are illustrative. No risk.

### M12 — Prod domain / frontend-origin allowlist
Flagging as an open question rather than assuming: renaming the **app** does
not require renaming the **domain** (`jobtracker.nagarenegishi.com`). That
domain is a much bigger and separately-risky change — DNS, SSL cert
reissuance, already-sent email links (password reset, confirmation), anyone
with it bookmarked. `product.md`'s scope doesn't say either way. Worth
settling explicitly: does the rebrand include a domain change, or does the
app keep this domain regardless of what it's called?

### M13 — CI/CD workflows
Working-directory/cache-path references to `JobTrackerApi`/`job-tracker-ui`
folder names — same rename, same PR as M1/M4, no independent risk.

### M14 — Dependabot config
Two `directory:` fields in `.github/dependabot.yml`. Single mechanical edit.

### M15 — Demo user email
Verified: `AuthController`'s demo login (`POST /api/auth/demo`) bypasses the
password check and issues tokens directly for the seeded account — it never
triggers a confirmation, reset, or any other email send. `demo@jobtracker.com`
never needs to receive real mail, so renaming it is purely cosmetic.

### M16 — Claude Code tooling config
`.claude/skills/*/files.json`, `.comment-audit/` etc. only affect this
session's own tooling if left stale after a folder rename (skills would scan
the wrong/missing paths) — no user-facing or product risk. Lowest priority,
fix whenever convenient.

### M17 — GitHub repo names
Fetched GitHub's own docs on repository renaming. Confirmed: **web page
URLs and all `git clone`/`fetch`/`push` operations against the old name
redirect automatically and indefinitely** (until/unless someone creates a
new repo at the old name, which GitHub explicitly warns breaks the
redirect). Documented exception: **GitHub Actions does not redirect** —
a workflow that references an Action *hosted* in a renamed repo
(`uses: owner/repo@ref`) breaks immediately. Checked both repos' workflows;
neither hosts a custom Action referenced this way (all `uses:` are
third-party/official actions), so this exception doesn't currently bite.
API-level and release-asset-download-URL redirect behavior wasn't explicitly
confirmed by GitHub's docs either way — treated as "probably fine, same as
other web traffic" but not proven, hence D5/D8 below still get flagged
rather than assumed safe.

### D1 — Tauri app identity (productName/title/identifier)
`productName`/window `title` are cosmetic and safe to change anytime. The
**bundle identifier** (`com.nagarenegishi.jobtracker`) is a different
category of risk: on Windows and macOS, the OS treats app identity partly by
this identifier — changing it can make an OS see the renamed build as a
*different application* from what's already installed, meaning existing
installs may not treat a new-identifier build as an update at all (separate
install, duplicate Start Menu/uninstall entries, no continuity). This needs
a decision, not just a code change: keep the identifier stable and only
change display strings, or accept a one-time forced fresh-install for
existing users. Flagged for research into Tauri's specific behavior here
before deciding.

### D2 — Sidecar binary naming
Directly coupled to M4 — `build-sidecar.mjs` derives the `jobtrackerapi`
sidecar name from the same `JobTrackerApi` assembly output. Same fix, same
coordinated PR across both repos.

### D3 — OS keychain service name
Confirmed in round 1: `src-tauri/src/keychain.rs` hardcodes
`const SERVICE: &str = "job-tracker-desktop"`. Renaming this string means the
app now looks under a *different* OS keychain entry — any credential a
current user already has stored under the old service name becomes
invisible to the renamed app. This needs a decision: ship a one-time
migration (read old service name once, rewrite under new, delete old) or
accept that existing installed users get silently logged out of stored
credentials on next update and have to re-enter them once.

**Severity correction (plan-verify pass):** read `keychain.rs` in full —
`KEY_NAME: &str = "anthropic-api-key"` is the only entry ever stored under
this service. It's the user's optional Anthropic API key for AI-assisted
parsing, not an app-login credential — the desktop app is local-only with
no account (per its AppStream metadata). So the actual worst case is a
one-time re-paste of an optional key, not users getting "logged out" of
anything. Lowers this item's urgency relative to how it read before; the
migration-vs-accept decision itself is unchanged.

### D4 — Cargo package
`name = "app"` in `Cargo.toml` was never tied to the product name. No action
surface.

### D5 — Auto-updater endpoint
This is the one product.md flagged as an open question and it's still open.
The updater endpoint
(`.../job-tracker-desktop-releases/releases/latest/download/latest.json`) is
fetched by Tauri's updater plugin via an HTTP client, not a browser — GitHub's
documented redirect behavior (M17) covers "web traffic" but wasn't verified
specifically for this kind of direct HTTP GET to a release-asset download
path, or whether Tauri's HTTP client follows redirects the way a browser
does. **Needs empirical verification**: either test this specific URL
pattern against a real renamed repo before relying on it, or treat it as
unsafe and update the endpoint proactively — which has its own chicken/egg
problem, since already-installed clients only ever see whatever endpoint was
baked into the build they're running, so an endpoint change only reaches
existing users if a build with the *old* endpoint can still fetch the update
that changes it.

### D6 — Flatpak packaging (app ID)
`com.nagarenegishi.jobtracker` is used as the Flatpak/Flathub app ID
(`flatpak/com.nagarenegishi.jobtracker.yml` + `.metainfo.xml` + `.desktop`).
Flatpak/Flathub app IDs are meant to be permanent identifiers — changing one
is generally treated as publishing a *new* app, not renaming the existing
listing. Needs a factual check not done in this pass: **is this app
currently published on Flathub under this ID?** If yes, renaming the ID has
real consequences for existing Flathub users' auto-updates and reviews/stars
tied to the old listing. If it's not published yet, this is a non-issue.

### D7 — GitHub Actions artifact/job naming
Uploaded artifact names (`jobtracker-windows-installers` etc.) only exist
inside a single CI run's lifetime — nothing external depends on them. Purely
cosmetic.

### D8 — GitHub Actions release publishing (`REPO=`)
Hardcoded target repo string for `gh release upload`/API calls. Per M17,
GitHub's docs don't explicitly confirm API-level redirect behavior for a
renamed repo — rather than relying on unverified behavior, the direct fix is
simply to update the `REPO=` value in the same PR that renames the target
repo. No research needed because the safe fix is no harder than the risky
one.

### D9 — GitHub Actions flatpak build/run
Manifest path and app-id references in `flatpak-build.yml`/
`flatpak-demo-video.yml` — mechanical update, follows whatever D6 decides.

### D10 — GitHub Actions working-dir/cache paths
Same `job-tracker-ui` folder references as M13, just duplicated across the
desktop repo's workflow files. No independent risk beyond M13/M1.

## Open items carried forward (not resolved by this pass)
1. **Framing question** (above) — cosmetic vs. full internal rename. Answer
   this first; it determines how much of this list is actually in scope.
2. **D1** — research Tauri's actual behavior on bundle-identifier change
   before deciding whether the identifier changes at all.
3. **D3** — decide: keychain migration shim, or accept one-time re-auth for
   existing installed users.
4. **D5** — empirically verify (or route around) auto-updater endpoint
   redirect behavior; has a chicken/egg constraint on already-installed
   clients.
5. **D6** — check current Flathub publication status before deciding
   whether the app ID can move.
6. **M12** — settle whether the production domain is in scope for this
   rebrand at all.
