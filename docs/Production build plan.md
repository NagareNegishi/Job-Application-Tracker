# Production Build Plan

## Progress

| Step | Item | Status |
|---|---|---|
| 1 | Auth (JWT, ASP.NET Identity, httpOnly refresh cookie) | Done |
| 2a | AWS infrastructure + DNS setup | Done — see `docs/stack-decisions.md` |
| 2b | S3 file storage refactor + Dockerfiles + compose.prod.yml | Done |
| 3 | appsettings.Production.json + .env.example | Done |
| 4 | Global exception handler + structured logging (Serilog) | Done |
| 5 | Health check endpoint | Done |
| 6 | Security headers | Done |
| 7 | GitHub Actions CI/CD | Done |
| 8a | DB migration automation in CI | Done |
| 8b | First production deploy (merge to main) | Done |
| 8b-1 | SSL via Certbot (nginx, standalone) | Done |
| 8c | Rate limiting | Done |
| 9 | Monitoring/metrics | Backlog — revisit when user traffic grows |
| — | SSL: Migrate to Caddy (optional, when certbot maintenance becomes friction) | Backlog |

---

## Architecture (locked — see `docs/stack-decisions.md` for full rationale)

```
User Browser
    │ (HTTPS)
    ▼
┌─── EC2 Instance (t3.micro, ap-southeast-2) ───────┐
│                                                    │
│   Nginx Container                                  │
│   ├── / → serves React static files (dist/)        │
│   ├── /api/* → proxy to backend (internal HTTP)    │
│   └── SSL termination (Let's Encrypt / Certbot)    │
│                                                    │
│   ASP.NET Backend Container                        │
│   ├── NOT exposed to host — Docker network only    │
│   └── Connects to RDS + S3                         │
│                                                    │
│   Docker Compose (compose.prod.yml)                │
└───────────────────────────────────────────────────┘
         │                        │
         ▼                        ▼
    RDS PostgreSQL              S3 Bucket
    (db.t4g.micro)          (signed URL access)
    ap-southeast-2a         Account Regional namespace
```

One origin — no CORS needed. `try_files $uri $uri/ /index.html` for SPA routing.

---

## Step 2b — S3 Refactor + Dockerfiles + compose.prod.yml

### 2b-1: Refactor file storage to S3
- `IStorageService` interface + `LocalStorageService` already existed — added `GetDownloadUrlAsync(storageKey) → Task<string?>`
- `S3StorageService` created: `SaveAsync` → `PutObjectAsync`, `DeleteAsync` → `DeleteObjectAsync`, `GetDownloadUrlAsync` → pre-signed URL (15 min expiry), `GetAsync` throws `NotSupportedException` (streaming not supported, use pre-signed URL)
- `DocumentsController` download endpoint updated: redirects to pre-signed URL if available, falls back to stream (local dev only)
- DI wired in `Program.cs`: `AddAWSService<IAmazonS3>()` + env-conditional registration (`LocalStorageService` in dev, `S3StorageService` in prod)
- NuGet: `AWSSDK.S3`, `AWSSDK.Extensions.NETCore.Setup`
- Still needed: IAM role on EC2 with S3 permissions — `Storage:S3BucketName` and `AWS_REGION` already wired in `compose.prod.yml`

### 2b-2: Backend Dockerfile
- `JobTrackerApi/Dockerfile` — multi-stage: `dotnet/sdk:10.0` → `dotnet/aspnet:10.0`
- `.csproj` files copied before source for layer cache; Tests `.csproj` included because `.sln` references it
- Build context must be repo root (needs `.sln`) — set in `compose.prod.yml` via `context: .`

### 2b-3: Frontend Dockerfile + nginx.conf
- `job-tracker-ui/Dockerfile` — multi-stage: `node:lts-alpine` → `nginx:alpine`
- `job-tracker-ui/nginx.conf` — serves static files, `try_files` SPA routing, proxies `/api/*` to `http://backend:8080/api/`
- `proxy_set_header` lines pass real client IP through to backend
- **Note:** nginx `proxy_pass` preserves the `/api/` prefix — backend controllers must use `[Route("api/[controller]")]` not `[Route("[controller]")]`

### 2b-4: compose.prod.yml
- Written fresh at repo root as `compose.prod.yml`
- `nginx` service: exposes ports 80 + 443, depends on backend
- `backend` service: no host ports — Docker-internal only; env vars via `${VAR}` substitution at deploy time
- `__` double-underscore maps env var names to nested ASP.NET config keys
- Two fixes made to `Program.cs`: `UseHttpsRedirection` and `AddCors`/`UseCors` wrapped in `IsDevelopment()` — both would break the production container

### 2b-5: appsettings.Production.json (completed in Step 3)

---

## Step 3 — appsettings.Production.json + .env.example
- `appsettings.Production.json`: `AllowedHosts: "*"` + log levels raised to `Warning` — locked to real domain in step 6
- `job-tracker-ui/.env.production`: `VITE_API_BASE_URL=/api` — relative URL, works on any domain; Vite bakes this in at `npm run build` automatically, no Docker build args needed
- `.env.example` at repo root: documents all 5 env vars needed by `compose.prod.yml` (`DB_CONNECTION_STRING`, `JWT_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `S3_BUCKET_NAME`)
- `Program.cs`: fail-fast startup validation for all JWT + S3 config keys — crashes at startup with named env var in message rather than mid-request

---

## Step 4 — Global Exception Handler + Structured Logging
- NuGet: `Serilog.AspNetCore` 10.0.0, `Serilog.Sinks.Console` 6.1.1
- `builder.Services.AddSerilog(...)` — uses `AddSerilog` (current pattern; `UseSerilog` on host builder is outdated)
  - Dev: `MinimumLevel.Information` + plain `Console()` — human-readable
  - Prod: `MinimumLevel.Warning` + `Console(new JsonFormatter())` — structured JSON to stdout; Docker captures it; compatible with any log aggregator (Grafana Loki, Datadog, etc. — TBD; CloudWatch ruled out)
- `app.UseExceptionHandler(...)` — catches unhandled exceptions; logs full details via `ILogger<Program>` (Serilog-backed); returns `{ "error": "An unexpected error occurred." }` JSON 500 to client
- `app.UseSerilogRequestLogging()` — one structured event per request (method, path, status, duration); placed after exception handler

---

## Step 5 — Health Check Endpoint
- NuGet: `Microsoft.Extensions.Diagnostics.HealthChecks.EntityFrameworkCore` 10.0.5
- `builder.Services.AddHealthChecks().AddDbContextCheck<JobTrackerContext>()` — runs a test query against RDS; returns `Unhealthy` (503) if DB unreachable
- `app.MapHealthChecks("/health", ...)` — anonymous (no JWT), JSON response with per-check status and duration
- `JobTrackerApi/Dockerfile`: `curl` installed in runtime stage; `HEALTHCHECK` directive pings `http://localhost:8080/health` every 30s (3 failures → container marked unhealthy, start-period 30s)

---

## Step 6 — Security Headers
- `appsettings.Production.json`: `AllowedHosts` locked to real domain (was `"*"`)
- `job-tracker-ui/nginx.conf`: all headers added at `server {}` level with `always` (covers 4xx/5xx too)
  - `X-Content-Type-Options: nosniff` — prevents MIME sniffing / JS execution from wrong content type
  - `X-Frame-Options: DENY` — blocks clickjacking via iframe embedding
  - `Referrer-Policy: strict-origin-when-cross-origin` — keeps internal paths off third-party logs
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()` — disables unused browser features
  - `Content-Security-Policy` — XSS allowlist; `style-src 'unsafe-inline'` for Tailwind, `connect-src` includes S3 bucket domain for `fetch()` doc download redirects, `frame-ancestors 'none'` as modern X-Frame-Options replacement
  - HSTS comment placeholder left in nginx.conf — must go in the HTTPS (443) server block certbot creates; line to add: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`
- **nginx `add_header` gotcha**: adding `add_header` inside any `location {}` block drops ALL headers defined at `server {}` level for that location — keep all headers at server level

---

## Step 7 — GitHub Actions CI/CD
Pipeline: test → build+push images to ECR → deploy to EC2

Build strategy: build in GitHub Actions (free 7GB RAM runners), push to ECR, pull on EC2 — keeps t3.micro free for running the app.

### GitHub Actions workflow — `.github/workflows/deploy.yml`

Three jobs, chained via `needs`:
- `test` — runs xUnit tests; downstream jobs skipped if this fails
- `build-push` — authenticates to AWS, builds backend + nginx images, pushes to ECR
- `deploy` — SCPs `compose.prod.yml` to EC2, SSHs in, ECR login on EC2, `docker pull` both images, `docker compose up --no-build -d`

Key details:
- `docker/setup-buildx-action` required as precondition for `docker/build-push-action`
- Backend build context is repo root (needs `.sln`); nginx build context is `job-tracker-ui/` only
- SCP + SSH use plain `run:` steps with standard CLI tools — no third-party actions for secret transfer
- ECR login runs on EC2 (not runner) — EC2 is the machine pulling images; uses IAM instance role (see below) — no AWS credentials needed on EC2
- `docker pull` both images before `up` — minimises mixed-version window during restart
- EC2 username is `ubuntu` (Ubuntu AMI), home at `/home/ubuntu/`
- `compose.prod.yml` deployed to `/home/ubuntu/app/`
- `compose.prod.yml` `${VAR}` substitution requires env vars exported in the SSH session — done via `export` statements before `docker compose up`
- `workflow_dispatch` added alongside `push` trigger — enables manual deploys from GitHub Actions UI without a code change

### Confirmed GitHub Actions versions (verified March 2026)

| Action | Version |
|---|---|
| `actions/checkout` | `@v6` |
| `actions/setup-dotnet` | `@v5` |
| `aws-actions/configure-aws-credentials` | `@v5` |
| `aws-actions/amazon-ecr-login` | `@v2` |
| `docker/setup-buildx-action` | `@v4` |
| `docker/build-push-action` | `@v7` |

### GitHub Actions secrets

| Secret | Source |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM `jobtracker-deploy` access key |
| `AWS_SECRET_ACCESS_KEY` | IAM `jobtracker-deploy` secret key |
| `ECR_REGISTRY` | ECR registry URI |
| `S3_BUCKET_NAME` | Full bucket name (with account regional suffix) |
| `DB_CONNECTION_STRING` | `Host=RDS_ENDPOINT;Port=5432;Database=jobtracker;Username=postgres;Password=...` |
| `EC2_HOST` | Elastic IP |
| `EC2_SSH_KEY` | Contents of `.pem` file |
| `JWT_SECRET` | Long random string |
| `JWT_ISSUER` | `https://jobtracker.yourdomain.com` |
| `JWT_AUDIENCE` | `https://jobtracker.yourdomain.com` |

### EC2 one-time setup

Ubuntu AMI — installed via SSH from WSL:
- Docker 28.x + Docker Compose v5 plugin
- AWS CLI v2 (installed via official installer — apt package unavailable on this Ubuntu version)
- `/home/ubuntu/app/` directory created for compose file
- IAM instance role: `jobtracker_ec2_role` — `AmazonEC2ContainerRegistryReadOnly` (managed) + `jobtracker-s3-access` (inline: `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` scoped to app bucket). Replaced original `jobtracker_ec2_ecr_pull` role (ECR only — caused 500 on document upload). IAM role names are immutable — new role created and swapped via EC2 console → Actions → Security → Modify IAM role.

---

## Step 8a — DB Migration Automation in CI
**Approach:** `migrate` job in `deploy.yml` runs between `build-push` and `deploy`. SSH port-forward tunnels `localhost:5432` on the runner through EC2 to RDS (RDS is VPC-only via `rds-ec2-1` SG — not internet-accessible). `dotnet ef database update` connects to `localhost:5432`; tunnel routes it to RDS. Failed migration exits non-zero → pipeline stops → old containers stay up.

**Key details:**
- `RDS_ENDPOINT` secret added (hostname only) — used by SSH `-L` flag
- `DB_CONNECTION_STRING` unchanged — migrate job swaps `Host=` to `localhost` via `sed` at runtime
- `ExitOnForwardFailure=yes` — SSH fails fast if EC2 can't reach RDS
- `timeout 30 bash -c 'until nc -z localhost 5432; do sleep 1; done'` — readiness poll, not a fixed sleep
- `$GITHUB_PATH` used to add `~/.dotnet/tools` to PATH after `dotnet tool install --global dotnet-ef`
- `dotnet restore` added before SSH tunnel setup — required to generate `project.assets.json` before `dotnet ef database update`
- `IDesignTimeDbContextFactory<JobTrackerContext>` added at `JobTrackerApi/Data/JobTrackerContextFactory.cs` — EF CLI tools use it instead of building the full DI container via `Program.cs`, bypassing fail-fast JWT validation that would otherwise block migrations
- `deploy` job changed to `needs: [migrate]`

---

## Step 8b — First Production Deploy
**What happened:** merge `experiment_claude` → `main` triggered the full pipeline. Containers are running on EC2.

**Outcome:**
- Pipeline: all 4 jobs pass (test → build-push → migrate → deploy)
- Backend container: healthy, DB connection confirmed
- nginx container: up, serving React static files over HTTP
- HTTP accessible: `curl http://jobtracker.nagarenegishi.com` returns React HTML
- HTTPS: pending — Certbot not yet configured (see Step 8b-1)

**Issues fixed post-first-deploy (merged experiment_claude → main):**
- `DocumentsController.cs`: `IsDemo()` now uses `ClaimTypes.Email` instead of hardcoded `"email"` string — JWT middleware remaps the claim; hardcoded string caused demo restrictions to silently fail
- `LocalStorageService.cs`: auto-creates uploads directory on startup if missing (dev mode)
- Demo mode 403 error messages updated to be user-facing
- EC2 IAM role swapped to `jobtracker_ec2_role` — fixed 500 on S3 document upload (see EC2 one-time setup above)
- S3 bucket CORS configured: `AllowedOrigins: ["https://jobtracker.nagarenegishi.com"]`, `AllowedMethods: ["GET"]` — required for browser `fetch()` to follow the 302 pre-signed URL redirect cross-origin. CSP `connect-src` was already set; CORS is the S3-side counterpart that was missing.

**Issues fixed during first deploy:**
- `jobTable.tsx` → `JobTable.tsx` — case mismatch caused Docker build failure on Linux
- `dotnet restore` added to `migrate` job — `project.assets.json` missing
- `IDesignTimeDbContextFactory` added — EF CLI was hitting JWT fail-fast validation in Program.cs
- EC2 IAM role `jobtracker_ec2_ecr_pull` attached — ECR pull auth for EC2
- Env var exports added to deploy SSH session — `compose.prod.yml` `${VAR}` substitution
- `workflow_dispatch` added — enables manual pipeline trigger from GitHub Actions UI
- `AllowedHosts` updated to include `localhost` — Docker HEALTHCHECK was getting 400
- Dockerfile HEALTHCHECK updated with `-H "Host: localhost"`

---

## Step 8b-1 — SSL via Certbot

### Why this approach

Four options were considered (March 2026):

| Option | Decision |
|---|---|
| ACM + ALB | ~$16–25/mo minimum — exceeds EC2 cost, overkill for solo app |
| CloudFront + ACM | $1–5/mo, adds AWS complexity (cache behaviors, invalidation), revisit later if CDN needed |
| certbot Docker + webroot | Everything stays in Docker but has a chicken-and-egg bootstrap problem — nginx won't start without a cert, can't get cert without nginx running |
| **Certbot standalone on host (chosen)** | Simpler first-time setup; teaches ACME, TLS cert structure, nginx SSL termination, and renewal automation — all transferable concepts |

**Why not Caddy (which handles HTTPS automatically):** Caddy's built-in ACME client (certmagic) abstracts away the entire cert process. Since the point of this project is understanding how things work, Caddy hides too much. Doing certbot first means actually encountering how domain validation, cert files, and renewal work. **Caddy is a standing backlog option once this is understood — see bottom of doc.**

### Maintenance reality

- Let's Encrypt certs expire every **90 days**
- Renewal cron runs automatically, renews when <30 days remain (~every 60 days in practice)
- **No proactive notification if cron fails** — but Let's Encrypt emails you at 20 days and 7 days before expiry if the cert hasn't renewed yet. That's your safety net — 20 days to SSH in and fix it manually
- Renewal briefly stops nginx (pre-hook) and restarts it (post-hook) — a few seconds of downtime every ~60 days

### Step-by-step

**Context:** nginx is running in a Docker container on EC2, serving HTTP on port 80. Our nginx config is baked into the Docker image. Certbot runs on the EC2 host using `--standalone` mode — temporarily stops nginx, gets the cert from Let's Encrypt, then the cert is mounted into the nginx container via `compose.prod.yml`.

1. **SSH into EC2**
   ```
   ssh -i YOUR_KEY.pem ubuntu@YOUR_ELASTIC_IP
   ```

2. **Install Certbot on EC2 host**
   ```
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

3. **Stop nginx container temporarily** (Certbot standalone needs port 80)
   ```
   cd /home/ubuntu/app
   docker compose -f compose.prod.yml stop nginx
   ```

4. **Get the certificate**
   ```
   sudo certbot certonly --standalone -d jobtracker.nagarenegishi.com
   ```
   Enter email when prompted. Certs saved to `/etc/letsencrypt/live/jobtracker.nagarenegishi.com/`.

5. **Update `compose.prod.yml`** — mount certs into nginx container:
   Add under the nginx service `volumes:`:
   ```yaml
   - /etc/letsencrypt:/etc/letsencrypt:ro
   ```

6. **Update `nginx.conf`** — add HTTPS server block (443) and redirect HTTP → HTTPS.
   Certbot's cert files:
   - `ssl_certificate /etc/letsencrypt/live/jobtracker.nagarenegishi.com/fullchain.pem;`
   - `ssl_certificate_key /etc/letsencrypt/live/jobtracker.nagarenegishi.com/privkey.pem;`
   Also add HSTS header here (placeholder already in nginx.conf):
   `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`

7. **Rebuild nginx image + redeploy** — nginx.conf change requires a new image build (push to ECR, pull on EC2). Or for a faster first-time approach, copy the updated nginx.conf directly into the running container and reload:
   ```
   docker exec app-nginx-1 nginx -s reload
   ```

8. **Set up auto-renewal** — Let's Encrypt certs expire every 90 days:
   ```
   sudo crontab -e
   ```
   Add: `0 3 * * * certbot renew --quiet --deploy-hook "docker exec app-nginx-1 nginx -s reload"`

**Note:** The demo-reset GitHub Actions workflow runs at `0 4 * * *` UTC — offset by 1 hour from certbot to avoid nginx being briefly down during renewal.

**Note:** After getting certs, the nginx container needs to be restarted with the volume mount. The cert renewal hook reloads nginx inside the container so it picks up the new cert without a restart.

---

## Step 8c — Rate Limiting

- Built-in `Microsoft.AspNetCore.RateLimiting` namespace — no NuGet package required
- Two fixed-window policies registered in `Program.cs` via `builder.Services.AddRateLimiter(...)`:
  - `"auth"` — 5 requests per minute per IP; applied to login, register, refresh, logout, and password change
  - `"resend-confirmation"` — 3 requests per hour per IP; applied to the resend confirmation endpoint (each call triggers a real SES send, so tighter limit)
- `[EnableRateLimiting("auth")]` / `[EnableRateLimiting("resend-confirmation")]` attributes on individual action methods in `AuthController` and `AccountController` — not applied globally, so CRUD endpoints are unaffected
- `app.UseRateLimiter()` added to the middleware pipeline in `Program.cs` after `UseAuthorization`
- Returns `429 Too Many Requests` when limit exceeded

---

## SSL: Migrate to Caddy (Backlog — no fixed sequence)

**When to do this:** When the certbot 90-day renewal cycle starts feeling like overhead, or when revisiting the nginx config for another reason. Not sequenced — pick it up after all planned steps are done, or later. Option A (certbot) gives ~90 days before renewal is even relevant.

**What Caddy is:** A reverse proxy with a built-in ACME client (certmagic — written in Go, not certbot). Uses the same Let's Encrypt ACME protocol as certbot but handles cert issuance and renewal internally on a background timer. No cron jobs, no host packages, no renewal downtime.

**Migration scope — what changes:**

| File | Change |
|---|---|
| `job-tracker-ui/Dockerfile` | 2 lines: base image `nginx:alpine` → `caddy:alpine`, copy `Caddyfile` instead of `nginx.conf` |
| `job-tracker-ui/Caddyfile` | New file (~20 lines). Replaces nginx.conf — same responsibilities: static files, SPA routing, API proxy, security headers, HTTPS |
| `compose.prod.yml` | Add named volume `caddy_data:/data` — critical, see gotcha below. Remove `/etc/letsencrypt` mount |
| EC2 host | Remove certbot cron. Certbot snap can be left or removed |

**nginx.conf is kept** as reference — coexists alongside Caddyfile. The Dockerfile decides which is used. Switching back to Option A is the same two-line Dockerfile swap.

**Critical gotcha — `/data` volume:** Caddy stores certs in `/data` inside the container. Without a named Docker volume, every container restart triggers a new cert request from Let's Encrypt. Rate limit: 5 duplicate requests per 7 days — hit this and you're locked out for the rest of the week. Always mount a named volume for `/data`.

**Testing before going live:** Use Let's Encrypt staging while verifying Caddyfile config — staging has no rate limits but issues untrusted certs. Add to Caddyfile global block:
```
{
  acme_ca https://acme-staging-v02.api.letsencrypt.org/directory
}
```
Remove once config is verified and ready for production.

---

## Step 9 — Monitoring/Metrics (Backlog)

Deferred until the app has real user traffic worth observing. Current coverage is sufficient for a low-traffic solo app:
- Structured JSON logs to stdout (Serilog) — readable via `docker logs`
- Health check at `/health` — DB connectivity confirmed on every deploy
- Let's Encrypt emails before cert expiry — cert renewal safety net

When to revisit: sustained traffic, repeated error patterns, or on-call needs. Options when ready:
- **Grafana Loki** — pairs well with existing structured JSON logs; lightweight
- **Datadog** — managed, more setup but richer alerting
- **Prometheus + Grafana** — self-hosted, most control
- CloudWatch ruled out (vendor lock-in, cost)
