C#/.NET job application tracker project. Full-stack ASP.NET Core 10 Web API + React 19, EF Core 10, PostgreSQL, Docker. Dev environment runs in a Dev Container. Live at [jobtracker.nagarenegishi.com](https://jobtracker.nagarenegishi.com).


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
- Rate limiting: `"auth"` (5 req/min), `"resend-confirmation"` (3 req/hour), `"parse"` (2 req/min) — global per policy, not per IP (`AddFixedWindowLimiter` never reads the caller's IP); per-IP fix is backlog, covers all policies incl. the planned `"analyse"` one

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

All planned production steps complete. See `docs/plans/production-build.md` for full detail.

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

All planned steps complete. See `docs/plans/demo-auth-features.md` for full detail.

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
| AI access admin | `Admin` + `AiUser` roles; `AdminController`; `/admin` page |
| Auto-fill parsing | `ParseListingDialog`; Claude Haiku; `POST /api/jobs/parse`; 2/min rate limit |
| RDS maintenance window | EventBridge stops DB 20:00–07:00 NZ; backend 503 on `DbException`; frontend `MaintenanceError` with time-aware message |
| Company Verification API | External repo; live at `https://company-verification.onrender.com`; NZ + AU registries; not yet integrated into this project |
| Dark mode + custom themes | Dark/light toggle in NavBar; 4 color themes; stored in `UserPreferences.theme` |
| Assessment + Withdrawn statuses | New enum values; auto-fill `appliedAt` on POST/PATCH→Applied with confirm dialog if already set |

## Active / Upcoming Work

| Plan | Item | Status |
|---|---|---|
| Dashboard / Analytics | Funnel, response rate, weekly chart, stale jobs | Done |
| Interview reminder email | Scheduled job emails user day-before interviewAt via IEmailService | Early planning |
| Stale application indicator | `StaleIndicator` component — amber Clock icon + tooltip in jobs list and Kanban card; `staleDaysSince` helper extracted in `dashboardUtils.ts` | Done |
| Job analysis | `UserProfile` table + 5 AI analysis endpoints + Job Detail UI + ad-hoc triage dialog | Done. See `docs/plans/job-analysis.md` for deferred polish items. |
| Company verification integration | Wire `GET /verify` into job create/edit UI; see `docs/company-verification-api-reference.md` | Pending |
| Preferences PATCH refactor | `PUT /api/account/preferences` → `PATCH` with merge semantics | Postponed |
| Job application rating API | Crowdsourced company ratings; separate product; scoring weights not finalized | Early planning |
| Table scroll accessibility | Viewport-contained flex chain; `table-plain.tsx`; sticky `TableHeader`; see `docs/plans/table-scroll-accessibility.md` | Done |
| Action bar layout fix | Anchor "Add New Job" + "Show/Hide Columns" to the view toggle row (`JobPage.tsx`) — prevents clipping on narrow viewports | Pending |
| Auto-fill rate-limit error message | `ParseListingDialog` and `lib/api.ts` have no distinct message for a 429; falls back to generic error. Same gap applies to the `"analyse"` policy | Pending |
| Maintenance page | Redirect to `/maintenance` on in-window 503; health-poll auto-recovery; see `docs/plans/maintenance-page.md` | Done |
| Profile inline view/edit | Read-only sections with pencil → in-place edit; see `docs/plans/profile-inline-edit.md` | Done — remaining items are optional polish |
