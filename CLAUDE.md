# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack job application tracker with:
- **Backend**: ASP.NET Core 10 Web API (`JobTrackerApi/`)
- **Frontend**: React 19 + TypeScript + Vite (`job-tracker-ui/`)
- **Database**: PostgreSQL 14 via Entity Framework Core + Npgsql
- **Test project**: xUnit + Moq (`JobTrackerApi.Tests/`)

The dev environment runs in a Dev Container (`.devcontainer/`) with the PostgreSQL DB as a separate Docker service.

## Commands

### Backend (from `JobTrackerApi/`)

```bash
dotnet build                          # Build
dotnet run --launch-profile https     # Run (HTTPS on 7100, HTTP on 5286)
dotnet run --launch-profile http      # Run (HTTP only on 5286)
```

### Database Migrations (from `JobTrackerApi/`)

```bash
dotnet ef migrations add <Name>       # Create a new migration
dotnet ef database update             # Apply migrations to the DB
```

### Tests (from repo root or `JobTrackerApi.Tests/`)

```bash
dotnet test                           # Run all tests
dotnet test --filter "FullyQualifiedName~ClassName"  # Run a single test class
dotnet test --filter "FullyQualifiedName~TestName"   # Run a single test
```

### Frontend (from `job-tracker-ui/`)

```bash
npm run dev      # Dev server on http://127.0.0.1:5173
npm run build    # TypeScript compile + Vite build
npm run lint     # ESLint
```

## Configuration

### Backend

The API requires two configuration values (use `appsettings.Development.json` or environment variables):

- **`ConnectionStrings:JobTrackerContext`** — PostgreSQL connection string. Environment variables take precedence over `appsettings.json` (Docker → OS env vars → config file).
- **`Storage:UploadsPath`** — Absolute path where uploaded documents are stored. The `DocumentsController` throws at startup if this is missing.
- **`Cors:AllowedOrigins`** — Array of allowed origins (e.g. `["http://localhost:5173"]`).

### Frontend

The frontend reads the API base URL from an environment variable. Create `job-tracker-ui/.env.local`:

```
VITE_API_BASE_URL=http://localhost:5286
```

## Architecture

### Backend

**Controllers** (`JobTrackerApi/Controllers/`) inject `JobTrackerContext` directly — no service/repository layer. There are two controllers:
- `JobsController` — CRUD + JSON Patch for jobs, routes to `/jobs`
- `DocumentsController` — CRUD for file uploads, nested under `/jobs/{jobId}/documents`

**Models** (`JobTrackerApi/Models/`):
- `Job` / `Document` — EF Core entities with `ToResponseDto()` methods
- `JobDTO` / `UpdateJobDTO` / `DocumentDTO` / `UpdateDocumentDTO` — request DTOs with validation attributes
- `JobResponseDto` / `DocumentResponseDto` — response shapes
- `Contact` / `Correspondence` — owned types stored as JSON columns in the `Jobs` table (not separate tables), configured via `OwnsMany(...).ToJson()` in `JobTrackerContext.OnModelCreating`
- `ValidationConstants` — centralized constraints (max lengths, file size, allowed extensions: `.pdf`, `.doc`, `.docx`)
- Enums: `JobStatus`, `Priority`, `DocumentType` — serialized as strings in JSON

**Data** (`JobTrackerApi/Data/JobTrackerContext.cs`): Single EF context with `DbSet<Job>` and `DbSet<Document>`.

**Document storage**: Files are saved to disk at `Storage:UploadsPath` with a GUID-based filename (`StoredName`). The original display name is kept in `Document.Name`. No PUT for documents — use DELETE + POST instead.

**JSON Patch**: Jobs support PATCH via `Microsoft.AspNetCore.JsonPatch.SystemTextJson`. The patch is applied to an `UpdateJobDTO`, validated, then mapped back to the entity.

**OpenAPI/Swagger UI**: Available in Development at `/openapi/v1.json` and Swagger UI is served via NSwag.

### Frontend

**Data flow**: `pages/` → `hooks/` (TanStack Query) → `services/` (fetch calls) → API

- `src/services/jobService.ts` / `documentService.ts` — raw fetch wrappers using `handleResponse`/`handleEmptyResponse` from `src/lib/api.ts`
- `src/hooks/jobQuery.ts` / `documentQuery.ts` — TanStack Query hooks (`useJobs`, `useJob`, `useCreateJob`, `useReplaceJob`, `usePatchJob`, `useDeleteJob`)
- `src/pages/` — `JobPage` (list) and `JobDetailPage` (detail)
- `src/components/` — feature components; `src/components/ui/` — shadcn/ui primitives + custom UI atoms
- `src/types/` — TypeScript types mirroring backend models

**Routing**: React Router 7 — `/` redirects to `/jobs`, detail at `/jobs/:id`.

**Path alias**: `@/` resolves to `src/` (configured in `vite.config.ts`).

### Tests

Tests use an in-memory EF Core database (unique per test class via `Guid.NewGuid()`). Controllers are instantiated directly — no HTTP pipeline involved. `DocumentsControllerTests` uses Moq for `IConfiguration` to supply the uploads path.
