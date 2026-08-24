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
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked) — a decision/asset-delivery gate, not a code claim; nothing to verify against source until it's resolved

Blocking prerequisite for everything below — no other step can execute
against a placeholder name. Resolve `product.md`'s open question on whether
"NooBi" is final or something else is needed, and get the separately
produced icon/logo assets delivered (designing them isn't part of this
plan, per `product.md`'s non-goals). Every step after this one assumes a
concrete name string and finished asset files already exist.

### Step 2: Cosmetic rebrand — web frontend
🤖 ai-audited(sonnet-5) · 🔗 verified → src: job-tracker-ui/index.html:5,7; job-tracker-ui/package.json:2

Update `job-tracker-ui/index.html`'s `<title>`, swap the favicon for the
delivered icon, and wire in an in-app logo once assets exist. Round-1
scanning found no hardcoded app-name string anywhere in the current UI, so
this is an asset swap plus one title change, not a text hunt. `package.json`'s
`name` field can move in the same pass — same low-risk bucket, no external
effect either way.

Re-verified this pass: `index.html:7` is `<title>job-tracker-ui</title>`,
`index.html:5` points the favicon at the default `/vite.svg` (no custom
icon yet), and `package.json:2` has `"name": "job-tracker-ui"`. Re-ran the
round-1 grep for a hardcoded app-name string across `job-tracker-ui/src` —
the only hit is a code comment in `validationConstants.ts` referencing the
backend class name (`JobTrackerApi/Models/ValidationConstants.cs`), not a
display string. Confirms round-1's "no text hunt" finding still holds.

### Step 3: Cosmetic rebrand — desktop app
🤖 ai-audited(sonnet-5) · 🔗 verified → src: src-tauri/tauri.conf.json:3,5,18 (desktop repo); flatpak/com.nagarenegishi.jobtracker.desktop:3; flatpak/com.nagarenegishi.jobtracker.metainfo.xml:5 (desktop repo)

Update `src-tauri/tauri.conf.json`'s `productName` and window title, and the
Flatpak display-facing fields (`Name=` in the `.desktop` file, `<name>` in
the AppStream metainfo). Display text only — the Flatpak app ID itself stays
untouched here, pending Step 8's D6 decision. Swap the app icon in both the
Tauri bundler config and the Flatpak packaging. The bundle identifier
(`com.nagarenegishi.jobtracker`) is explicitly not touched in this step —
that's Step 8's D1.

Re-verified this pass (config identifiers only, per `product.md`'s
constraint on referencing the desktop repo): `tauri.conf.json:3` is
`"productName": "Job Application Tracker"`, `:18` is `"title": "Job
Application Tracker"`, `:5` is `"identifier":
"com.nagarenegishi.jobtracker"` — confirmed this step's config-editing scope
doesn't touch line 5. `com.nagarenegishi.jobtracker.desktop:3` is
`Name=Job Application Tracker`; `.metainfo.xml:5` is `<name>Job Application
Tracker</name>`. Both confirmed distinct from the Flatpak app ID (`<id>` at
metainfo.xml:3, the `.desktop` filename itself), consistent with the plan's
claim that this step is display-text-only.

### Step 4: Internal rename — mechanical web-repo identifiers
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Data/JobTrackerContext.cs:4; JobTrackerApi/Migrations/JobTrackerContextModelSnapshot.cs; Job-Application-Tracker.sln; JobTrackerApi/JobTrackerApi.csproj; JobTrackerApi/Dockerfile:8-13,42; compose.prod.yml:7,21,29; .github/workflows/deploy.yml:12-13,125; .env.example:1,6; .github/workflows/pr-checks.yml:28,37,49,58; .github/dependabot.yml:9,17,25; JobTrackerApi/Models/DemoUser.cs:7; scripts/seed-dev.sh:29 — plus ❔ unverified (not checked): 3 files (see note)

Everything `name-touchpoints-verification.md` bucketed 🔧 for this repo,
landed as one coordinated PR: the .NET namespace, the `JobTrackerContext`
DbContext class and its migration snapshot file, the connection-string
config key, the solution/`.csproj`/folder names, Dockerfile `COPY`/
`ENTRYPOINT` paths, Docker/ECR image names, the dev Postgres DB name,
`.env.example`, CI/CD workflow paths, `dependabot.yml`, the demo user's
email constant, and the `.claude` tooling config referencing these folder
names. Round 2 confirmed all of it is single-repo with no live-cutover risk.

Re-verified this pass, item by item: namespace declarations confirmed
(`JobTrackerContext.cs:4` → `namespace JobTrackerApi.Data;`,
`JobsController.cs:12` → `namespace JobTrackerApi.Controllers;`); the
migration snapshot file exists at the claimed path; the solution and
`.csproj` files exist under the claimed names; `Dockerfile:8-13` copies
`Job-Application-Tracker.sln`/`JobTrackerApi.csproj` and `:42` is
`ENTRYPOINT ["dotnet", "JobTrackerApi.dll"]`; `compose.prod.yml:7,21`
confirm the `jobtracker-frontend`/`jobtracker-backend` image names and
`:29` the `ConnectionStrings__JobTrackerContext` env var; `deploy.yml:12-13`
confirm the same image names and `:125` the same connection-string env var
set from a GitHub secret; `.env.example` confirmed verbatim (header comment
and `Database=jobtracker`); `pr-checks.yml:28,37,49,58` confirm the
`job-tracker-ui` working-directory/cache-path references; `dependabot.yml`
confirms the `/JobTrackerApi` and `/job-tracker-ui` `directory:` fields;
`DemoUser.cs:7` is `public const string Email = "demo@jobtracker.com";`,
matched in `seed-dev.sh:29`; a fresh grep across `.claude/skills/` and
`.comment-audit/` reproduced round-1's file list unchanged.

**Not re-verified this pass** — `JobTrackerApi/appsettings.Development.json`,
`.devcontainer/.env`, and `.devcontainer/devcontainer.json` were blocked by
this session's file-access permissions (denied for both `Read` and `Bash
grep`). The connection-string-key and JWT-issuer/audience claims that
depend on these three files rest on round 2's prior read, not an
independent check this pass — worth a manual look (or a session with
broader file access) before this step is treated as fully verified.

### Step 5: Internal rename — JWT issuer/audience
🤖 ai-audited(sonnet-5) · 🔗 verified → src: JobTrackerApi/Program.cs:95-98,177-179; JobTrackerApi/Controllers/AuthController.cs:258-280

Change `Jwt:Issuer`/`Jwt:Audience` in `appsettings` and the deploy-time
`JWT_ISSUER`/`JWT_AUDIENCE` secrets. Kept as its own step rather than folded
into Step 4 because it's a runtime-behavior change on a live system — even
though round-2 verification confirmed it's safe (the refresh-token flow
doesn't depend on the old values, so no forced re-login), it deserves its
own deploy attention rather than getting lost in Step 4's bulk of pure
renames.

Re-verified this pass: `Program.cs:95-98` fails startup if `Jwt:Issuer`/
`Jwt:Audience` aren't configured, and `:177-179` sets `ValidateIssuer =
true`/`ValidateAudience = true` on the token validation parameters —
confirming a changed value does invalidate outstanding access tokens.
`AuthController.cs:258-280`'s `Refresh()` reads the refresh token from the
`refreshToken` cookie and looks it up by matching `r.Token == token` against
the `RefreshTokens` table (`:260-264`) — no JWT claim check anywhere in that
method. This confirms the "one 401, then silent-refresh recovers" behavior
round 2 claimed, rather than a forced re-login.

### Step 6: Cross-repo coordination — desktop repo's copy + sidecar build
🤖 ai-audited(sonnet-5) · 🔗 verified → src: src-tauri/scripts/build-sidecar.mjs:20,68 (desktop repo)

The desktop repo carries its own copy of `JobTrackerApi`/`job-tracker-ui`/
the solution file — apply Step 4's renames there too, and update
`build-sidecar.mjs`, which hardcodes both the `apiProjectDir` path and the
published executable name (`JobTrackerApi[.exe]`) derived from the old
project name. Needs to land close enough to Step 4 that the desktop repo's
sidecar build doesn't break in the gap — see the sync-mechanism unknown
under Risks & unknowns before committing to how tightly coupled that timing
needs to be.

Re-verified this pass: `build-sidecar.mjs:20` is `const apiProjectDir =
join(srcTauriDir, "..", "JobTrackerApi")` and `:68` derives `sourceExe` as
`` `JobTrackerApi${exeSuffix}` `` — both hardcode the old project name
exactly as claimed, confirming this script breaks if Step 4 renames the web
repo's project folder without a matching edit here. The sync-mechanism
unknown flagged under Risks & unknowns is still genuinely unresolved — this
pass only confirmed the coupling exists, not how the two repos' copies stay
in sync day-to-day.

### Step 7: Rename the GitHub repos and fix hardcoded cross-references
🤖 ai-audited(sonnet-5) · 🔗 verified → src: job-tracker-ui/src/components/DesktopDownloadPrompt.tsx:5; .github/workflows/release.yml:324,342,387, release-windows.yml:114,136,175 (desktop repo) · doc: https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository

Rename this repo, `job-tracker-desktop`, and `job-tracker-desktop-releases`
last, after the code-level work above has landed — minimizes how many
in-flight PRs end up relying on GitHub's old-name redirect. In the same
pass, fix the two hardcoded references that don't rely on the redirect:
`DesktopDownloadPrompt.tsx`'s releases URL, and the release-publishing
workflows' `REPO=` target in the desktop repo.

Re-verified this pass: `DesktopDownloadPrompt.tsx:5` hardcodes
`RELEASES_URL = "https://github.com/NagareNegishi/job-tracker-desktop-releases/releases/latest"`;
the desktop repo's `release.yml` and `release-windows.yml` each hardcode
`REPO="NagareNegishi/job-tracker-desktop-releases"` at three call sites
apiece — both match round 1's inventory exactly. Re-checked the underlying
GitHub-redirect claim directly against GitHub's current docs (not from
model memory, per this skill's rule on external claims): "all `git clone`,
`git fetch`, or `git push` operations targeting the previous location will
continue to function as if made on the new location," and reusing the old
name for a new repo later is what breaks the redirect — confirming
round-2's "indefinite until reused" framing. The docs also explicitly
confirm the Actions exception: "GitHub will not redirect calls to an action
hosted by a renamed repository. Any workflow that uses that action will
fail with the error `repository not found`" — matching round 2's finding,
and neither repo's workflows reference a custom action this way (only
third-party/official `uses:` entries), so this exception still doesn't
bite. The docs page does not state an explicit redirect-behavior guarantee
for API calls or release-asset-download URLs specifically (as opposed to
`git`/web traffic) — consistent with round 2 leaving D5/D8 flagged rather
than assumed safe.

### Step 8 (deferred — not scoped in this plan): Resolve the four desktop-specific high-risk items
🤖 ai-audited(sonnet-5) · ❔ unverified (not checked) — deliberately out of scope for this plan; D1/D3/D5/D6 need their own research pass before there's a concrete change to verify

D1 (bundle identifier), D3 (keychain service name), D5 (auto-update
endpoint), and D6 (Flatpak app ID) each need their own research and decision
before any code change — tracked as open questions in `product.md`, not
planned here. Revisit once each has an answer; this will likely become its
own follow-up implementation pass rather than an extension of this one.
