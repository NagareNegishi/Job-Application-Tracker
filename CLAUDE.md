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

### Frontend

API base URL is read from `VITE_API_BASE_URL` (`.env`).

## Architecture

### Backend

**Controllers** (`Controllers/`) inject `JobTrackerContext` directly. Storage and email go through service abstractions (`Services/`) — no general repository layer.
- `JobsController` — CRUD + JSON Patch at `/api/jobs`
- `DocumentsController` — upload/download/delete at `/api/jobs/{jobId}/documents`; demo user blocked (403)
- `AuthController` — unauthenticated flows at `/api/auth/`: register, login, refresh, logout, demo login, demo reset, email confirmation, resend confirmation, forgot password, reset password
- `AccountController` — authenticated account management at `/api/account/`: change password

All controllers except `AuthController` require `[Authorize]`. New controllers must include it.

**Services** (`Services/`):
- `IStorageService` / `LocalStorageService` (dev) / `S3StorageService` (prod)
- `IEmailService` / `LogEmailService` (dev) / `ResendEmailService` (prod)

**Models** (`Models/`):
- `Job` / `Document` — EF Core entities with `ToResponseDto()` methods
- `JobDTO` / `UpdateJobDTO` / `DocumentDTO` / `UpdateDocumentDTO` — request DTOs with validation attributes
- `JobResponseDto` / `DocumentResponseDto` — response shapes (never expose `StoredName`/`StorageKey`)
- `Contact` / `Correspondence` — owned types, stored as JSON columns in `Jobs` table (not separate tables); `email` and `phone` must be sent as `undefined` not `""` to pass `[EmailAddress]`/`[Phone]` validation
- `RefreshToken` — tracks issued refresh tokens for rotation/revocation
- `AuthDTO` — `RegisterDTO`, `LoginDTO`, `ChangePasswordDTO`
- `DemoSeed` — static class; holds sample job keys + `CreateJobs(userId)` for demo data seeding
- `ValidationConstants` — max lengths, file size, allowed extensions
- Enums: `JobStatus`, `Priority`, `DocumentType` — serialized as strings

**Document storage**: Handled via `IStorageService` (dev: local filesystem at `Storage:UploadsPath`). Files stored with a GUID key (`StorageKey`); display name kept in `Document.Name`. No PUT — use DELETE + POST instead. Uploads use `FormData`, not JSON — don't set `Content-Type` manually.

**JSON Patch**: Jobs support PATCH via `Microsoft.AspNetCore.JsonPatch.SystemTextJson`, applied to `UpdateJobDTO` then mapped to the entity.

**`Data/JobTrackerContextFactory`**: `IDesignTimeDbContextFactory` implementation — required so `dotnet ef` CLI can build the DbContext without hitting the fail-fast JWT validation in `Program.cs`.

### Frontend

**Data flow**: `pages/` → `hooks/` (TanStack Query) → `services/` (fetch wrappers) → API

- `src/services/` — fetch wrappers using `apiFetch` from `src/lib/api.ts` (never plain `fetch`); `apiFetch` attaches the Bearer token, sends credentials, and handles 401 silent refresh automatically; includes `authService.ts`; silent refresh logic in `src/lib/auth.ts`
- `src/hooks/` — TanStack Query hooks
- `src/pages/` — `JobPage` (list), `JobDetailPage` (detail), `LoginPage`, `RegisterPage`, `SettingsPage`, `CheckEmailPage`, `ConfirmEmailPage`, `ForgotPasswordPage`, `ResetPasswordPage`
- `src/components/` — feature components; `src/components/ui/` — shadcn/ui primitives
- `src/types/` — TypeScript types mirroring backend models; enums use `const` object pattern (`enum` keyword disallowed by `erasableSyntaxOnly`)

**Routing**: React Router 7 — `/` → `/jobs`, `/jobs/:id`, `/login`, `/register`, `/settings`, `/check-email`, `/confirm-email`, `/forgot-password`, `/reset-password`. All job + account routes wrapped in `ProtectedRoute`.

**Path alias**: `@/` resolves to `src/` (configured in `vite.config.ts`).

### Tests

Tests use an in-memory EF Core database (unique per test class via `Guid.NewGuid()`). Controllers are instantiated directly — no HTTP pipeline involved. `IStorageService` mocked via Moq in `DocumentsControllerTests`. `ClaimsPrincipal` set up manually for `[Authorize]`.

## Skills

- When working on frontend UI or styling: follow: `.claude/skills/frontend-design/SKILL.md`