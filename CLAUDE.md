## Project Overview

A full-stack job application tracker with:
- **Backend**: ASP.NET Core 10 Web API (`JobTrackerApi/`)
- **Frontend**: React 19 + TypeScript + Vite (`job-tracker-ui/`)
- **Database**: PostgreSQL 14 via Entity Framework Core + Npgsql
- **Test project**: xUnit + Moq (`JobTrackerApi.Tests/`)

The dev environment runs in a Dev Container (`.devcontainer/`) with the PostgreSQL DB as a separate Docker service.

## Docs

- `docs/progress.md` — read at session start; update after each major feature completes.
- `docs/plans/` — per-feature plan/decision files; read only the relevant file when working on a feature.
- `docs/company-verification-api-reference.md` — contract for the external company verification API.

## Commands

### Backend (from `JobTrackerApi/`)

```bash
dotnet run --launch-profile https     # Run (HTTPS on 7100, HTTP on 5286)
```

### Database Migrations (from `JobTrackerApi/`)

```bash
dotnet ef migrations add <MigrationName>    # name required, e.g. AddJobPriority
dotnet ef database update
```

### Tests (from repo root or `JobTrackerApi.Tests/`)

```bash
dotnet test
dotnet test --filter "FullyQualifiedName~ClassName"
dotnet test --filter "FullyQualifiedName~TestName"
```

### Frontend (from `job-tracker-ui/`)

```bash
npm run dev      # Dev server on http://127.0.0.1:5173
npm run build
```

## Configuration

### Backend

Config in `appsettings.Development.json` or environment variables:

- **`ConnectionStrings:JobTrackerContext`** — PostgreSQL connection string
- **`Jwt:Key`** / **`Jwt:Issuer`** / **`Jwt:Audience`** / **`Jwt:ExpiryMinutes`** / **`Jwt:RefreshExpiryDays`** — JWT config; app fails fast on startup if missing
- **`Storage:UploadsPath`** — local upload directory (dev only); created automatically if missing
- **`Cors:AllowedOrigins`** — e.g. `["http://localhost:5173"]`
- **`Anthropic:ApiKey`** — required for AI parsing; app fails fast on startup if missing
- **`Admin:Email`** — seeds admin role on startup; app fails fast if missing

### Frontend

API base URL is read from `VITE_API_BASE_URL` (`.env`).

## Architecture

### Backend

**Controllers** (`Controllers/`) inject `JobTrackerContext` directly. Storage and email go through service abstractions (`Services/`) — no general repository layer.
- `JobsController` — CRUD + JSON Patch at `/api/jobs`; `POST /api/jobs/parse` for AI auto-fill
- `DocumentsController` — upload/download/delete at `/api/jobs/{jobId}/documents`; demo user blocked (403)
- `AuthController` — unauthenticated flows at `/api/auth/`: register, login, refresh, logout, demo login, demo reset, email confirmation, resend confirmation, forgot password, reset password, cleanup unverified accounts
- `AccountController` — authenticated account management at `/api/account/`: change password, `GET/PUT /api/account/preferences`
- `AdminController` — requires `Admin` role; `GET /api/admin/users` + `PATCH /api/admin/users/{userId}/ai-access`

All controllers except `AuthController` require `[Authorize]`. New controllers must include it.

**Roles**: `Admin` and `AiUser` — defined as string constants; seeded on startup; included as JWT claims. Use `"Admin"` or `"AiEnabled"` policy names registered in `Program.cs`. Rate limit policies: `"auth"` (5/min per IP), `"resend-confirmation"` (3/hr per IP), `"parse"` (2/min per IP).

**Services** (`Services/`):
- `IStorageService` / `LocalStorageService` (dev) / `S3StorageService` (prod)
- `IEmailService` / `LogEmailService` (dev) / `ResendEmailService` (prod)
- `IParsingService` / `ClaudeParsingService` — AI job listing parser using `claude-haiku-4-5`; rate-limited to 2/min per IP (`"parse"` policy)

**Models** (`Models/`):
- `Job` / `Document` — EF Core entities with `ToResponseDto()` methods
- `JobDTO` / `UpdateJobDTO` / `DocumentDTO` / `UpdateDocumentDTO` — request DTOs with validation attributes
- `JobResponseDto` / `DocumentResponseDto` — response shapes (never expose `StoredName`/`StorageKey`)
- `Contact` / `Correspondence` — owned types, stored as JSON columns in `Jobs` table (not separate tables); `email` and `phone` must be sent as `undefined` not `""` to pass `[EmailAddress]`/`[Phone]` validation
- `RefreshToken` — tracks issued refresh tokens for rotation/revocation
- `AuthDTO` — `RegisterDTO`, `LoginDTO`, `ChangePasswordDTO`
- `UserPreferencesDto` — visible column list + `autoFillEnabled`; stored as JSON on `ApplicationUser`
- `ParseListingRequest` / `ParsedJobFields` — request/response DTOs for `POST /api/jobs/parse`
- `DemoSeed` — static class; holds sample job keys + `CreateJobs(userId)` for demo data seeding
- `ValidationConstants` — max lengths, file size, allowed extensions
- Enums: `JobStatus`, `Priority`, `DocumentType`, `WorkMode` — serialized as strings

**Document storage**: Handled via `IStorageService` (dev: local filesystem at `Storage:UploadsPath`). Files stored with a GUID key (`StorageKey`); display name kept in `Document.Name`. No PUT — use DELETE + POST instead. Uploads use `FormData`, not JSON — don't set `Content-Type` manually.

**JSON Patch**: Jobs support PATCH via `Microsoft.AspNetCore.JsonPatch.SystemTextJson`, applied to `UpdateJobDTO` then mapped to the entity.

**`Data/JobTrackerContextFactory`**: `IDesignTimeDbContextFactory` implementation — required so `dotnet ef` CLI can build the DbContext without hitting the fail-fast JWT validation in `Program.cs`.

### Frontend

**Data flow**: `pages/` → `hooks/` (TanStack Query) → `services/` (fetch wrappers) → API

- `src/services/` — fetch wrappers using `apiFetch` from `src/lib/api.ts` (never plain `fetch`); `apiFetch` attaches the Bearer token, sends credentials, handles 401 silent refresh, and throws `MaintenanceError` on 503 during scheduled window (midnight–8 AM Sydney); includes `authService.ts`, `adminService.ts`, `preferencesService.ts`; silent refresh logic in `src/lib/auth.ts`
- `src/hooks/` — TanStack Query hooks
- `src/pages/` — `JobPage` (list), `JobDetailPage` (detail), `LoginPage`, `RegisterPage`, `SettingsPage`, `CheckEmailPage`, `ConfirmEmailPage`, `ForgotPasswordPage`, `ResetPasswordPage`, `AdminPage`
- `src/components/` — feature components including `KanbanBoard`, `ParseListingDialog`, `ColumnToggle`; `src/components/ui/` — shadcn/ui primitives
- `src/types/` — TypeScript types mirroring backend models; enums use `const` object pattern (`enum` keyword disallowed by `erasableSyntaxOnly`)

**Routing**: React Router 7 — `/` → `/jobs`, `/jobs/:id`, `/login`, `/register`, `/settings`, `/check-email`, `/confirm-email`, `/forgot-password`, `/reset-password`, `/admin`. All job + account routes wrapped in `ProtectedRoute`; `/admin` wrapped in `AdminRoute`.

**Path alias**: `@/` resolves to `src/` (configured in `vite.config.ts`).

### Tests

Tests use an in-memory EF Core database (unique per test class via `Guid.NewGuid()`). Controllers are instantiated directly — no HTTP pipeline involved. `IStorageService` mocked via Moq in `DocumentsControllerTests`. `ClaimsPrincipal` set up manually for `[Authorize]`.

## Skills

- When working on frontend UI or styling: follow: `.claude/skills/frontend-design/SKILL.md`