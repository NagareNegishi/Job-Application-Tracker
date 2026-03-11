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
- **`Storage:UploadsPath`** — upload directory; `DocumentsController` throws at startup if missing
- **`Cors:AllowedOrigins`** — e.g. `["http://localhost:5173"]`

### Frontend

API base URL is read from `VITE_API_BASE_URL` (`.env`).

## Architecture

### Backend

**Controllers** (`Controllers/`) inject `JobTrackerContext` directly — no service/repository layer.
- `JobsController` — CRUD + JSON Patch, routes to `/jobs`
- `DocumentsController` — file upload CRUD, nested under `/jobs/{jobId}/documents`

**Models** (`Models/`):
- `Job` / `Document` — EF Core entities with `ToResponseDto()` methods
- `JobDTO` / `UpdateJobDTO` / `DocumentDTO` / `UpdateDocumentDTO` — request DTOs with validation attributes
- `JobResponseDto` / `DocumentResponseDto` — response shapes
- `Contact` / `Correspondence` — owned types, stored as JSON columns in `Jobs` table (not separate tables)
- `ValidationConstants` — max lengths, file size, allowed extensions (`.pdf`, `.doc`, `.docx`)
- Enums: `JobStatus`, `Priority`, `DocumentType` — serialized as strings

**Document storage**: Files saved to `Storage:UploadsPath` with a GUID filename (`StoredName`); display name kept in `Document.Name`. No PUT — use DELETE + POST instead.

**JSON Patch**: Jobs support PATCH via `Microsoft.AspNetCore.JsonPatch.SystemTextJson`, applied to `UpdateJobDTO` then mapped to the entity.

### Frontend

**Data flow**: `pages/` → `hooks/` (TanStack Query) → `services/` (fetch wrappers) → API

- `src/services/` — fetch wrappers using `handleResponse`/`handleEmptyResponse` from `src/lib/api.ts`
- `src/hooks/` — TanStack Query hooks
- `src/pages/` — `JobPage` (list), `JobDetailPage` (detail)
- `src/components/` — feature components; `src/components/ui/` — shadcn/ui primitives
- `src/types/` — TypeScript types mirroring backend models

**Routing**: React Router 7 — `/` redirects to `/jobs`, detail at `/jobs/:id`.

**Path alias**: `@/` resolves to `src/` (configured in `vite.config.ts`).

### Tests

Tests use an in-memory EF Core database (unique per test class via `Guid.NewGuid()`). Controllers are instantiated directly — no HTTP pipeline involved. `DocumentsControllerTests` uses Moq for `IConfiguration` to supply the uploads path.