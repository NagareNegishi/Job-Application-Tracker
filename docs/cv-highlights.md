# Job Tracker — CV & Cover Letter Reference

## What it is

A production-deployed, full-stack job application tracker built with ASP.NET Core 10 and React 19. The app is live with real users, a CI/CD pipeline, and a complete auth system — not a tutorial project. Built end-to-end: API design, database schema, frontend SPA, cloud infrastructure, and deployment automation.

---

## Backend

- **ASP.NET Core 10 Web API** with ASP.NET Identity — full auth system built from scratch: registration, login, email verification, forgot/reset password, refresh token rotation and revocation
- **JWT + httpOnly refresh cookie** — access token in response body, refresh token in httpOnly cookie; XSS-safe token storage with SameSite policy adjusted per environment (None in dev, Strict in prod)
- **`IStorageService` and `IEmailService` abstractions** — storage and email providers are swappable behind interfaces; swapped both in production with zero changes to controllers
- **JSON columns via EF Core owned types** — Contact and Correspondence data stored as JSON in PostgreSQL (not separate tables); avoids joins, simpler schema for nested structures
- **JSON Patch** for partial job updates — clients send only changed fields
- **Rate limiting** on auth endpoints using built-in ASP.NET middleware — no third-party packages required
- **Structured logging** with Serilog — plain text in dev, JSON to stdout in prod (compatible with any log aggregator)
- **Health check endpoint** — DB connectivity verified on every deploy; Docker HEALTHCHECK directive monitors container status

---

## Frontend

- **React 19 + TypeScript** SPA with **TanStack Query** for server state — cache invalidation, background refetch, loading/error states handled declaratively
- **Silent refresh** — 401 responses trigger a transparent token refresh and request retry via a shared `apiFetch` wrapper; users never see an auth interruption
- **React Router 7** with protected routes and router state for passing context between pages (e.g. email address carried from register → check-email page)
- **Demo mode** — blocked actions (upload, password change) return contextual inline messages instead of generic errors; UX distinction between demo limitations and real errors
- **shadcn/ui + Tailwind CSS v4** — component library built on Radix primitives for accessible UI

---

## Infrastructure & DevOps

- **AWS production stack**: EC2 (t3.micro) + RDS PostgreSQL (db.t4g.micro) + S3 document storage + ECR image registry
- **Docker Compose production deployment** — nginx container serves React static files and proxies `/api/*` to backend; backend container not exposed to host (Docker-internal only)
- **GitHub Actions CI/CD pipeline** — four jobs chained via `needs`: test → build/push images to ECR → migrate DB → deploy; pipeline halts on any failure, leaving previous containers running
- **SSL via Let's Encrypt/Certbot** — standalone cert issuance, automated renewal via cron, nginx reload hook
- **Dependabot** configured across NuGet, npm, and GitHub Actions ecosystems

---

## Security

- **Security headers** — Content Security Policy, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy; all applied at nginx level with `always` flag (covers 4xx/5xx responses)
- **No user enumeration** — forgot password and email confirmation endpoints always return 200 with identical responses regardless of whether the email exists
- **Server-side demo restrictions** — upload and password change blocked in controllers, not just hidden in the UI
- **Fail-fast startup validation** — app refuses to start if JWT or S3 config is missing; named config key included in the error message

---

## Interesting Problems Solved

**DB migration through a VPC-private RDS instance**
RDS is not internet-accessible (VPC security group only allows EC2). The CI pipeline creates an SSH tunnel from the GitHub Actions runner through EC2 to RDS, so `dotnet ef database update` connects to `localhost:5432` on the runner and the tunnel routes it to RDS. A readiness poll (`nc -z`) replaces a fixed sleep.

**EF CLI bypassing fail-fast startup validation**
The app validates JWT and S3 config at startup and crashes if missing — intentional for production safety, but it blocked EF CLI from running migrations (CLI calls `Program.cs`). Solution: `IDesignTimeDbContextFactory<JobTrackerContext>` gives EF CLI a direct path to the DbContext without going through the DI container or startup validation.

**S3 pre-signed URL downloads required two separate systems**
Document downloads redirect to a pre-signed S3 URL. Getting the browser to follow that cross-origin redirect required configuring both S3 bucket CORS (AWS-side: `AllowedOrigins`, `AllowedMethods: GET`) *and* the nginx Content Security Policy (`connect-src` including the S3 bucket domain). Each system independently enforces cross-origin access — both had to be correct.

**Email provider swap validated the abstraction**
AWS SES production access was denied after domain verification was complete. Because email sending was behind `IEmailService`, switching to Resend required one new implementation class and one DI registration change — no controller, no auth flow, no frontend change. The abstraction paid off immediately.

**Demo re-seed strategy**
Two reset mechanisms with different behaviours: on every demo login, missing sample jobs are restored (visitor deletions come back, visitor additions are left alone); a nightly GitHub Actions workflow does a full wipe and re-seed from scratch. The nightly reset endpoint is authenticated by a secret header rather than JWT — it's called from a cron, not a logged-in user.
