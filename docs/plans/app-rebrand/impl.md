# Implementation plan: app-rebrand

## Maturity
lowest: 🤖 ai-audited
🌱 idea 0 · 🤖 ai-audited 10 · 👤 human-ok 0 · ✅ settled 0

## Overview
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Rename the app from its current working name to the not-yet-settled new
name and identity, staged so nothing breaks mid-rename. Cosmetic display
changes land first (Steps 2–3), then the internal identifiers round-2
verification already confirmed are safe to rename outright (Steps 4–7),
spanning both this repo and the desktop repo's own copy of the same code.
The four desktop-specific items with real external-state risk (Step 8) are
deliberately left out of this plan — each needs its own research pass first,
and stays tracked as an open question in `product.md` until then.

## Risks & unknowns
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

- How the desktop repo's vendored copies of `JobTrackerApi`/`job-tracker-ui`/
  the solution file actually stay in sync with this repo was never checked.
  Steps 4 and 6 assume they need to move together — if the real sync
  mechanism is something else (an automated copy job, a submodule, or the
  copies have already diverged), Step 6's approach needs rethinking first.
- How many real users the desktop app already has is unknown. That's what
  actually determines how much urgency Step 8's deferred items carry —
  whether D1/D3/D5/D6 are theoretical risks or already live ones.
- Step 4's connection-string-key and Step 5's JWT config renames need
  matching environment/secret updates wherever the app is actually deployed
  (GitHub Actions secrets, the EC2 host) — a deploy-time coordination step,
  not just a code merge, and easy to miss.
- Step 4's `JobTrackerContext`/migration-snapshot rename should be confirmed
  with an actual build and `dotnet ef migrations list` pass before merging.
  EF Core's general behavior here is well-understood, but this specific
  repo's setup hasn't been test-built under the new name.
- Step 7 still depends partly on GitHub's rename redirect for anything not
  proactively fixed in the same step — round-2 findings say this is low
  risk, not zero risk.

## Steps

### Step 1: Settle the final app name and receive the icon/logo assets
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Blocking prerequisite for everything below — no other step can execute
against a placeholder name. Resolve `product.md`'s open question on whether
"NooBi" is final or something else is needed, and get the separately
produced icon/logo assets delivered (designing them isn't part of this
plan, per `product.md`'s non-goals). Every step after this one assumes a
concrete name string and finished asset files already exist.

### Step 2: Cosmetic rebrand — web frontend
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Update `job-tracker-ui/index.html`'s `<title>`, swap the favicon for the
delivered icon, and wire in an in-app logo once assets exist. Round-1
scanning found no hardcoded app-name string anywhere in the current UI, so
this is an asset swap plus one title change, not a text hunt. `package.json`'s
`name` field can move in the same pass — same low-risk bucket, no external
effect either way.

### Step 3: Cosmetic rebrand — desktop app
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Update `src-tauri/tauri.conf.json`'s `productName` and window title, and the
Flatpak display-facing fields (`Name=` in the `.desktop` file, `<name>` in
the AppStream metainfo). Display text only — the Flatpak app ID itself stays
untouched here, pending Step 8's D6 decision. Swap the app icon in both the
Tauri bundler config and the Flatpak packaging. The bundle identifier
(`com.nagarenegishi.jobtracker`) is explicitly not touched in this step —
that's Step 8's D1.

### Step 4: Internal rename — mechanical web-repo identifiers
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Everything `name-touchpoints-verification.md` bucketed 🔧 for this repo,
landed as one coordinated PR: the .NET namespace, the `JobTrackerContext`
DbContext class and its migration snapshot file, the connection-string
config key, the solution/`.csproj`/folder names, Dockerfile `COPY`/
`ENTRYPOINT` paths, Docker/ECR image names, the dev Postgres DB name,
`.env.example`, CI/CD workflow paths, `dependabot.yml`, the demo user's
email constant, and the `.claude` tooling config referencing these folder
names. Round 2 confirmed all of it is single-repo with no live-cutover risk.

### Step 5: Internal rename — JWT issuer/audience
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Change `Jwt:Issuer`/`Jwt:Audience` in `appsettings` and the deploy-time
`JWT_ISSUER`/`JWT_AUDIENCE` secrets. Kept as its own step rather than folded
into Step 4 because it's a runtime-behavior change on a live system — even
though round-2 verification confirmed it's safe (the refresh-token flow
doesn't depend on the old values, so no forced re-login), it deserves its
own deploy attention rather than getting lost in Step 4's bulk of pure
renames.

### Step 6: Cross-repo coordination — desktop repo's copy + sidecar build
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

The desktop repo carries its own copy of `JobTrackerApi`/`job-tracker-ui`/
the solution file — apply Step 4's renames there too, and update
`build-sidecar.mjs`, which hardcodes both the `apiProjectDir` path and the
published executable name (`JobTrackerApi[.exe]`) derived from the old
project name. Needs to land close enough to Step 4 that the desktop repo's
sidecar build doesn't break in the gap — see the sync-mechanism unknown
under Risks & unknowns before committing to how tightly coupled that timing
needs to be.

### Step 7: Rename the GitHub repos and fix hardcoded cross-references
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

Rename this repo, `job-tracker-desktop`, and `job-tracker-desktop-releases`
last, after the code-level work above has landed — minimizes how many
in-flight PRs end up relying on GitHub's old-name redirect. In the same
pass, fix the two hardcoded references that don't rely on the redirect:
`DesktopDownloadPrompt.tsx`'s releases URL, and the release-publishing
workflows' `REPO=` target in the desktop repo.

### Step 8 (deferred — not scoped in this plan): Resolve the four desktop-specific high-risk items
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked)

D1 (bundle identifier), D3 (keychain service name), D5 (auto-update
endpoint), and D6 (Flatpak app ID) each need their own research and decision
before any code change — tracked as open questions in `product.md`, not
planned here. Revisit once each has an answer; this will likely become its
own follow-up implementation pass rather than an extension of this one.
