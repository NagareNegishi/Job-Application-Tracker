C#/.NET job application tracker project. Full-stack ASP.NET Core 10 Web API + React 19, EF Core 10, PostgreSQL, Docker. Dev environment runs in a Dev Container. Live at [jobtracker.nagarenegishi.com](https://jobtracker.nagarenegishi.com).

## Project Structure

```
Job-Application-Tracker/
├── .devcontainer/              # Dev Container (Docker + Dockerfile + firewall script)
├── .github/                    # dependabot.yml + GitHub Actions workflows (deploy, demo-reset)
├── .vscode/                    # launch.json, tasks.json
├── .claude/                    # Claude Code settings + skills
├── JobTrackerApi/              # Backend (ASP.NET Core 10)
├── JobTrackerApi.Tests/        # xUnit tests
├── job-tracker-ui/             # Frontend (React 19 + TypeScript + Vite)
├── uploads/                    # Local document storage (dev only)
├── docs/                       # Committed project documentation
├── notes/                      # Local notes (not committed)
├── compose.yaml                # Dev container compose (app + db services)
├── compose.prod.yml            # Production Docker Compose (nginx + backend)
├── Job-Application-Tracker.sln
└── CLAUDE.md
```

## Backend — JobTrackerApi/

### Controllers/
- `AuthController` — unauthenticated auth flows at `/api/auth/`: register, login, refresh, logout, demo login, demo reset, email confirmation, resend confirmation, forgot password, reset password, cleanup unverified accounts
- `AccountController` — authenticated account management at `/api/account/`: change password
- `JobsController` — CRUD + JSON Patch at `/api/jobs`. All endpoints `[Authorize]`.
- `DocumentsController` — Upload/download/delete at `/api/jobs/{jobId}/documents`. All endpoints `[Authorize]`. Demo user blocked from upload/delete (403).

### Models/
- `Job`, `Document` — EF Core entities with `ToResponseDto()` methods
- `Contact`, `Correspondence` — Owned types, stored as JSON columns in Jobs table (not separate tables)
- `RefreshToken` — Tracks issued refresh tokens for rotation/revocation
- `JobDTO`, `UpdateJobDTO`, `DocumentDTO`, `UpdateDocumentDTO` — Request DTOs with validation
- `JobResponseDto`, `DocumentResponseDto` — Response shapes (strips internal fields like StoredName)
- `AuthDTO` — `RegisterDTO`, `LoginDTO`, `ChangePasswordDTO`
- `DemoSeed` — static class; holds sample job keys + `CreateJobs(userId)` for demo data seeding
- `ValidationConstants` — Max lengths, file size, allowed extensions
- Enums: `JobStatus`, `Priority`, `DocumentType` — serialized as strings

### Services/
- `IStorageService` — Interface: `SaveAsync`, `DeleteAsync`, `GetAsync`, `GetDownloadUrlAsync`
- `LocalStorageService` — Writes files to `Storage:UploadsPath` on disk (dev)
- `S3StorageService` — S3 upload/delete/pre-signed URL (prod)
- `IEmailService` — Interface: `SendAsync(to, subject, htmlBody)`
- `LogEmailService` — Logs to console (dev)
- `ResendEmailService` — HTTP POST to Resend API (prod); `SesEmailService` kept but commented out

### Data/
- `JobTrackerContext` — EF Core DbContext. DbSets: Jobs, Documents, Users (IdentityUser), RefreshTokens.
- `JobTrackerContextFactory` — `IDesignTimeDbContextFactory<JobTrackerContext>` for EF CLI migrations (bypasses fail-fast JWT validation in Program.cs)

### Migrations (applied)
1. `InitialCreate`
2. `AddDocumentStoredName`
3. `UpdateSchema`
4. `InitializeCollectionsAsEmpty`
5. `RenameFilePathToStorageKey`

### Packages
- `Npgsql.EntityFrameworkCore.PostgreSQL` v10.0.0
- `Microsoft.EntityFrameworkCore.Design` + `.Tools` v10.0.3
- `Microsoft.AspNetCore.Authentication.JwtBearer` v10.0.5
- `Microsoft.AspNetCore.Identity.EntityFrameworkCore` v10.0.5
- `Microsoft.AspNetCore.JsonPatch.SystemTextJson` v10.0.3
- `Microsoft.AspNetCore.OpenApi` + `NSwag.AspNetCore` — Swagger in dev
- `Serilog.AspNetCore`, `Serilog.Sinks.Console` — structured logging
- `AWSSDK.S3`, `AWSSDK.Extensions.NETCore.Setup` — S3 storage
- `AWSSDK.SimpleEmailV2` — SES (kept, currently unused; Resend used instead)
- `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` — `/health` endpoint
- `dotnet-ef` installed globally in dev container

## Frontend — job-tracker-ui/

```
src/
├── pages/          JobPage.tsx, JobDetailPage.tsx, LoginPage.tsx, RegisterPage.tsx,
│                   SettingsPage.tsx, CheckEmailPage.tsx, ConfirmEmailPage.tsx,
│                   ForgotPasswordPage.tsx, ResetPasswordPage.tsx
├── components/     JobTable, JobHeader, JobInfoCard, JobFilterBar, JobCreateSheet,
│                   JobEditSheet, ContactList, CorrespondenceList, DocumentCard,
│                   DocumentList, NavBar, ProtectedRoute, UnderlinedText
│   └── ui/         shadcn/ui primitives + DatePicker, StatusBadge, PriorityDot
├── hooks/          jobQuery.ts, documentQuery.ts, useJobFilters.ts
├── services/       authService.ts, jobService.ts, documentService.ts
├── lib/            api.ts (apiFetch wrapper), auth.ts (silentRefresh), utils.ts,
│                   validationConstants.ts
└── types/          job.ts, jobDocument.ts, contact.ts, enums.ts
```

### Key packages
- React 19, React Router 7, TanStack Query v5
- Tailwind CSS v4, shadcn/ui (Radix), lucide-react
- date-fns, react-day-picker
- TypeScript ~5.9, Vite 7

### Routing
`/` → `/jobs`, `/jobs/:id`, `/login`, `/register`, `/settings`, `/check-email`, `/confirm-email`, `/forgot-password`, `/reset-password`. All job + account routes wrapped in `ProtectedRoute`.

## Key Decisions

### Auth
- JWT access token returned in response body; refresh token in httpOnly cookie
- Silent refresh on app init (`silentRefresh` in `lib/auth.ts`)
- `apiFetch` in `lib/api.ts` attaches Bearer token, handles 401 → silent refresh automatically
- Login/register errors show "Invalid email or password" without distinguishing which field
- No retry on auth failure (no retry loops on 401)
- `SameSite` cookie controlled by `IWebHostEnvironment`: None in dev, Strict in prod
- Demo user (`demo@jobtracker.com`) — password never used; `/api/auth/demo` bypasses password check; always `EmailConfirmed = true`
- Email verification required before login — `EmailConfirmed` flag on `IdentityUser`
- Rate limiting: `"auth"` policy (5 req/min per IP), `"resend-confirmation"` policy (3 req/hour per IP)

### Backend
- Controllers inject `JobTrackerContext` directly — no repository/service layer
- Contact and Correspondence are JSON columns via `OwnsMany + ToJson()` — not separate tables
- `IStorageService` abstraction — `LocalStorageService` (dev), `S3StorageService` (prod)
- `IEmailService` abstraction — `LogEmailService` (dev), `ResendEmailService` (prod)
- `ToResponseDto()` on entities; response DTOs never expose `StoredName`/`StorageKey`/`FilePath`
- JSON Patch for job mutations (`Microsoft.AspNetCore.JsonPatch.SystemTextJson`)
- Contacts/Correspondences initialized as `[]` not null — enables JSON Patch `/-` append without null check
- Optional string fields (`email`, `phone`) must be sent as `undefined` not `""` to pass `[EmailAddress]`/`[Phone]` validation
- `[ApiController]` handles automatic 400 — no manual `ModelState.IsValid` checks
- PostDocument: writes file before DB save; DB failure triggers file cleanup (no orphaned files)
- Kestrel: `MinRequestBodyDataRate` 100 bytes/sec, 10 sec grace period
- `IDesignTimeDbContextFactory` in `Data/JobTrackerContextFactory.cs` — bypasses fail-fast JWT validation for EF CLI

### Frontend
- Enums use `const` object pattern — `enum` keyword disallowed by `erasableSyntaxOnly`
- `ApiError` carries HTTP status code for structured error handling
- FormData for file uploads — never set `Content-Type` manually (browser sets boundary)
- `useDownloadDocument` uses `useMutation` not `useQuery` — download is a user-triggered side effect
- TanStack Query cache keys: `["jobs", jobId, "documents", "list"/"detail"]` — prefix matching for invalidation
- `enabled: !isNaN(jobId)` guard on all document/job queries
- Sheet component (shadcn) for job editing; Dialog for contact/correspondence editing
- `DatePicker` defaults to today for correspondence entries
- Demo mode 403 on upload/delete shows inline message (not generic error toast)
- After register: redirect to `/check-email` with email in router state; resend cooldown 2 min

## Tests — JobTrackerApi.Tests/

- `JobDTOTests.cs` — DTO validation
- `DocumentDTOTests.cs` — Document DTO validation
- `JobsControllerTests.cs` — Jobs CRUD
- `DocumentsControllerTests.cs` — Document upload/download/delete

In-memory EF Core DB (unique GUID per test class). Controllers instantiated directly — no HTTP pipeline. `IStorageService` mocked via Moq. `ClaimsPrincipal` set up manually for `[Authorize]`.

Packages: xUnit v2.9.3, Moq v4.20.72, `Microsoft.EntityFrameworkCore.InMemory` v10.0.3

## Dev Container

- Base image: `mcr.microsoft.com/devcontainers/dotnet:2-10.0`
- PostgreSQL 14 as separate Docker service in compose
- Node.js feature + Claude Code feature
- Ports forwarded: 7100 (HTTPS), 5286 (HTTP), 5173 (Vite), 5432 (PostgreSQL)
- ASPNET HTTPS cert bind-mounted from host into `/home/vscode/.aspnet/https/`
- `KESTREL_CERT_PASSWORD` set via `remoteEnv` from host env var
- `dotnet-ef` installed globally in container as `vscode` user
- Post-create: `dotnet restore` + `npm install`
- `project-firewall.sh` — network isolation script

## Production Build Status

All planned production steps complete. See `docs/Production build plan.md` for full detail.

| Step | Item | Status |
|---|---|---|
| 1 | Auth (JWT, ASP.NET Identity, httpOnly refresh cookie) | Done |
| 2a | AWS infrastructure + DNS setup | Done |
| 2b | S3 file storage refactor + Dockerfiles + compose.prod.yml | Done |
| 3 | appsettings.Production.json + .env.example | Done |
| 4 | Global exception handler + structured logging (Serilog) | Done |
| 5 | Health check endpoint | Done |
| 6 | Security headers | Done |
| 7 | GitHub Actions CI/CD | Done |
| 8a | DB migration automation in CI | Done |
| 8b | First production deploy | Done |
| 8b-1 | SSL via Certbot | Done |
| 8c | Rate limiting | Done |
| 9 | Monitoring/metrics | Backlog |

## Demo + Auth Features Status

All planned steps complete. See `docs/Demo and Auth Features Plan.md` for full detail.

| Step | Item | Status |
|---|---|---|
| 1 | Demo user + "Try Demo" button | Done |
| 2 | Periodic demo data reset + login re-seed | Done |
| 3 | Change password | Done |
| 4 | AWS SES setup | Done (superseded by Step 7) |
| 5 | Email verification on register | Done |
| 6 | Forgot password | Done |
| 7 | Migrate email provider from SES to Resend | Done |

## Additional Completed Features

| Feature | Notes |
|---|---|
| Extra model fields | Job URL, salary range, location, work mode, interview date |
| Customizable table columns | `Preferences` JSON on user; column toggle UI in toolbar |
| Job table tabs | Active / Closing Soon / All / Rejected; frontend-only filtering |
| Kanban board view | `@dnd-kit`; drag card patches job status via PATCH |
| Kanban DragOverlay refactor | `DragOverlay` portal; `KanbanCardPreview` clone; `draggingId` state for clean post-drop transition |
| AI access admin | `Admin` + `AiUser` roles; `AdminController`; `/admin` page |
| Auto-fill parsing | `ParseListingDialog`; Claude Haiku; `POST /api/jobs/parse`; 2/min rate limit |
| RDS maintenance window | EventBridge stops DB 00:00–08:00 AEST; backend 503 on `DbException`; frontend `MaintenanceError` with time-aware message |
| Company Verification API | External repo; live at `https://company-verification.onrender.com`; NZ + AU registries; not yet integrated into this project |
| Dark mode + custom themes | Dark/light toggle in NavBar; 4 color themes (blue, red, yellow, pink); applied via `.theme-*` on `<html>`; stored in `UserPreferences.theme` |
| Assessment + Withdrawn statuses | New enum values 7/8; auto-fill `appliedAt` on POST (non-Wishlist) and PATCH (→ Applied); Kanban column order and tab filters updated |

## Active / Upcoming Work

| Plan | Item | Status |
|---|---|---|
| Dashboard / Analytics | Funnel, response rate, weekly chart, stale jobs, upcoming interviews | In Progress |
| Job analysis | `UserProfile` table + 5 AI analysis endpoints + detail page UI | Pending |
| Company verification integration | Wire `GET /verify` into job create/edit UI; see `docs/company-verification-api-reference.md` | Pending |
| Preferences PATCH refactor | `PUT /api/account/preferences` → `PATCH` with merge semantics | Postponed |
| Job application rating API | Crowdsourced company ratings; separate product; scoring weights not finalized | Early planning |
| Table scroll accessibility | Always-accessible horizontal scrollbar for `JobTable` + `KanbanBoard`; two sessions attempted and reverted; see `docs/plans/table-scroll-accessibility.md` | Pending |
