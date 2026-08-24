# App name touchpoints — inventory (round 1)

_Last updated: 2026-08-24_

## Status
Round 1: raw inventory only. Impact/breakage analysis and action sorting is round 2 (not done yet — see docs/plans/app-rebrand/product.md).

## Scope note
Code and config only. Prose mentions in docs/*.md and README.md are excluded here — see product.md's "known touchpoints" for those.

## Inventory

### .NET namespace root
- what: `namespace JobTrackerApi...` / `using JobTrackerApi...` declarations
- where: throughout ~113 files across `JobTrackerApi/` and `JobTrackerApi.Tests/`
- form used: `JobTrackerApi`

### `JobTrackerContext` DbContext class
- what: the EF Core `DbContext` class name, referenced as a type throughout DI setup, controllers, and health checks
- where: `JobTrackerApi/Data/JobTrackerContext.cs` (definition), `JobTrackerApi/Data/JobTrackerContextFactory.cs`, `JobTrackerApi/Program.cs` (DI registration, health check, connection string lookup), all controllers (`JobsController`, `AnalysisController`, `AccountController`, `AuthController`, `DocumentsController`), one EF Core migrations snapshot file — ~59 references across ~15 files
- form used: `JobTrackerContext`

### Connection string config key
- what: the config key name used to look up the DB connection string
- where: `JobTrackerApi/appsettings.Development.json`, `.devcontainer/.env`, `.devcontainer/devcontainer.json` (`shell-env` postCreate command), `.github/workflows/deploy.yml`, `compose.prod.yml`
- form used: `ConnectionStrings:JobTrackerContext` / `ConnectionStrings__JobTrackerContext`

### Solution / project files and folders
- what: solution file, `.csproj` files, and their containing folder names (no `AssemblyName`/`RootNamespace` override present, so these double as the compiled assembly/namespace root)
- where: `Job-Application-Tracker.sln`, `JobTrackerApi/JobTrackerApi.csproj`, `JobTrackerApi.Tests/JobTrackerApi.Tests.csproj`, folders `JobTrackerApi/`, `JobTrackerApi.Tests/`
- form used: `Job-Application-Tracker`, `JobTrackerApi`, `JobTrackerApi.Tests`

### JWT Issuer/Audience
- what: JWT issuer/audience config values
- where: `JobTrackerApi/appsettings.Development.json` (hardcoded values); `compose.prod.yml` and `.env.example` reference them as env vars (`JWT_ISSUER`, `JWT_AUDIENCE`) sourced from GitHub secrets at deploy time, not hardcoded there
- form used: `"Issuer": "JobTrackerApi"`, `"Audience": "JobTrackerClient"`

### Frontend package/build identity
- what: npm package name, HTML title, folder name
- where: `job-tracker-ui/package.json` (`"name"`), `job-tracker-ui/index.html` (`<title>`), folder `job-tracker-ui/`
- form used: `job-tracker-ui`
- note: no in-app header/logo display string found in `job-tracker-ui/src` referencing the app name; favicon is the default `vite.svg`, not a custom app icon

### Desktop releases repo reference (frontend code)
- what: hardcoded URL to the public desktop releases repo, used to link users to installers
- where: `job-tracker-ui/src/components/DesktopDownloadPrompt.tsx`
- form used: `https://github.com/NagareNegishi/job-tracker-desktop-releases/releases/latest`

### Docker/deploy image and container names
- what: ECR image names for the two deployed images, plus an old unused Postgres volume name in a commented-out dev-only compose file
- where: `compose.prod.yml` (`image: ${ECR_REGISTRY}/jobtracker-frontend`, `jobtracker-backend`), `.github/workflows/deploy.yml` (`BACKEND_IMAGE`, `NGINX_IMAGE` env vars, same names), `compose.yaml` (fully commented out — `job_tracker_postgres` volume name in the comment block)
- form used: `jobtracker-frontend`, `jobtracker-backend`, `job_tracker_postgres`

### Dockerfile references
- what: `COPY`/build paths matching project folder names, and the compiled DLL name in `ENTRYPOINT`
- where: `JobTrackerApi/Dockerfile`
- form used: `JobTrackerApi.csproj`, `JobTrackerApi.Tests.csproj`, `JobTrackerApi.dll`

### Local dev Postgres DB name
- what: the Postgres database name used in the devcontainer
- where: `.devcontainer/.env` (`POSTGRES_DB=jobtracker`)
- form used: `jobtracker`

### `.env.example` (production env template)
- what: header comment and one example placeholder value; the rest of the file is generic `yourdomain.com`/`your-*` placeholders, not tied to the current name
- where: `.env.example`
- form used: header comment "Job Tracker — EC2 production environment variables"; `Database=jobtracker` in the example connection string

### Frontend-origin allowlist / production domain
- what: the production domain, used for CORS/email-link allowlisting, nginx server_name/SSL cert paths, and `AllowedHosts`
- where: `compose.prod.yml` (`App__AllowedFrontendOrigins__0`), `job-tracker-ui/nginx.conf` (`server_name`, SSL cert paths ×2), `JobTrackerApi/appsettings.Production.json` (`AllowedHosts`), `.github/workflows/demo-reset.yml` (two `curl` targets), `.github/workflows/renew-cert.yml` (cert path check)
- form used: `jobtracker.nagarenegishi.com`

### CI/CD workflows
- what: working-directory paths, cache paths, Docker build context/file paths, and one IAM role name mentioned in a comment
- where: `.github/workflows/pr-checks.yml` (working-directory, cache-dependency-path ×2 each), `.github/workflows/deploy.yml` (Dockerfile paths, build context, `ConnectionStrings__JobTrackerContext` env var, `--project JobTrackerApi` for `dotnet ef`, comment referencing IAM role `jobtracker_ec2_ecr_pull`)
- form used: `job-tracker-ui`, `JobTrackerApi`, `jobtracker_ec2_ecr_pull`

### Dependabot config
- what: per-ecosystem `directory` fields pointing at project folders
- where: `.github/dependabot.yml`
- form used: `/JobTrackerApi`, `/job-tracker-ui`

### Demo user email
- what: hardcoded demo account email constant, referenced in backend logic and a dev seed script
- where: `JobTrackerApi/Models/DemoUser.cs` (constant definition), `scripts/seed-dev.sh` (SQL filter)
- form used: `demo@jobtracker.com`

### Claude Code tooling config
- what: skill config files that hardcode the project's folder names as roots for their own scans (not app-facing, but would go stale if folders are renamed)
- where: `.claude/skills/responsive-layout/files.json`, `.claude/skills/unit-tests/files.json` (also lists every controller/test file path individually, all under `JobTrackerApi`/`JobTrackerApi.Tests`), `.claude/skills/unit-tests/plan.md`, `.claude/skills/owasp-scan/findings.json`, `.comment-audit/processed.json` (per-file audit timestamps keyed by path)
- form used: `JobTrackerApi`, `job-tracker-ui`

### GitHub repo names
- what: the three related repo names themselves
- where: not re-derived here — already listed in `docs/plans/app-rebrand/product.md`'s "known touchpoints" section
- form used: this repo, `job-tracker-desktop` (private), `job-tracker-desktop-releases` (public)
