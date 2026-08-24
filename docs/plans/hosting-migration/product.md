# Product plan: hosting-migration

## Maturity
lowest: 🌱 idea
🌱 idea 10 · 🤖 ai-audited 0 · 👤 human-ok 0 · ✅ settled 0

## about
🌱 idea

Move hosting off the current AWS setup (EC2 + RDS + S3 + ECR) to a platform
that's stable and cost-effective to run continuously, ahead of an actual
public launch.

## problem / motivation
🌱 idea

The current stack costs an estimated ~$25-28/month at true 24/7 usage
(`docs/stack-decisions.md`) — but that's not what's actually being paid
today. The nightly maintenance window isn't just an app-layer block: RDS is
genuinely stopped 20:00–07:00 NZ via EventBridge Scheduler, specifically to
save ~$10/month (`docs/plans/rds-maintenance-window.md`), while EC2 stays up
24/7 the whole time (a scheduled EC2 stop wasn't worth it — the Elastic IP
charge ate most of the saving). So going to true 24/7 uptime is a real cost
increase over current spend, not a free change — and real reported spend has
exceeded $30/month even with the nightly RDS stop in place, meaning the
actual cost driver is larger than `stack-decisions.md` documents and not yet
identified (a NAT Gateway is the leading suspect — see open questions).

The $200 sign-up credit covers a few months of this, but AWS's free plan
itself closes at 6 months regardless of remaining credit, forcing a switch to
a paid account. To stretch the credits before launch, the app runs the
nightly window (`MaintenanceError` in `src/lib/api.ts`,
`docs/plans/maintenance-page.md`) that takes it fully offline — real downtime
for anyone trying to use it, which doesn't hold up once this is meant to be a
real, launched product.

## goal
🌱 idea

The app runs continuously, with no cost-driven nightly shutdown, on a
platform whose ongoing cost is one the user is prepared to pay indefinitely —
not a free trial that just delays the same problem.

## audience
🌱 idea

End users (no more nightly outage), and the user, as the one paying the
hosting bill and maintaining the infrastructure.

## requirements
🌱 idea

- When candidate platforms are evaluated, the comparison shall include:
  real ongoing monthly cost at 24/7 usage, managed Postgres support, file
  storage support (or a plan for keeping/replacing S3), and operational
  complexity relative to the current EC2/RDS/S3/ECR setup.
- When a platform is chosen, the system shall have a migration plan covering
  the Postgres database (actual data, not just schema), file storage, DNS/
  domain cutover, SSL, and CI/CD (currently GitHub Actions to ECR to EC2).
- When migration is complete, the system shall no longer need the nightly
  maintenance-window shutdown for cost reasons.
- When the new platform is live, the system shall have downtime and cost
  monitoring comparable to today's AWS Budgets alerts.
- When migrating file storage, the system shall replace S3's implicit
  IAM-role-based credentials (today provided by EC2's `jobtracker_ec2_role`)
  with an explicit AWS access key/secret, since Render's compute has no AWS
  IAM role to assume.
- When migrating the database, the system shall replace `deploy.yml`'s
  SSH-tunnel-based migration step (`ssh -L 5432:$RDS_ENDPOINT:5432` through
  EC2, needed because RDS isn't internet-facing) with a direct connection to
  Render Postgres, which doesn't require VPC tunneling.
- When migrating, the system shall retire `compose.prod.yml`'s nginx
  container and `renew-cert.yml`'s Certbot renewal workflow, since Render's
  Static Site handles the frontend + CDN and Render manages TLS
  automatically.
- When migrating, the system shall re-plumb the ~11 secrets currently
  injected via GitHub Actions/SSH heredoc into Render's own secrets
  management — treated as a security review moment, not a copy-paste.

## stack
🌱 idea

Current: ASP.NET Core backend, PostgreSQL, React/Vite frontend, Docker-based
deploy via GitHub Actions.

**Target platform: Render.** Backend as a Web Service (Starter, $7/mo, native
Dockerfile deploy — `deploy.yml`'s build step mostly carries over, minus the
ECR push). Frontend as a Static Site ($0/mo, CDN-backed — replaces the nginx
container entirely). Database as Render Postgres, Basic-256mb tier ($6/mo) —
sized against measured production data (`pg_database_size` = 8.6MB, cache hit
ratio 0.9988), not against RDS's `db.t4g.micro` tier, which was itself only
an AWS free-tier onboarding default, not a capacity-planned choice. File
storage stays on S3 (cheap, ~$0.10/mo, decoupled from compute either way) —
but needs an explicit AWS access key/secret added as a Render secret, since
today's `S3StorageService` relies on EC2's IAM role (`jobtracker_ec2_role`)
for implicit credentials, which won't exist off-AWS compute.

**Total: ~$13/mo**, verified directly against Render's own pricing page
(2026-08-24) — versus AWS's documented true-24/7 figure of ~$25-28/mo, itself
likely an underestimate given the unexplained >$30/mo real spend noted above.

Alternatives considered and ruled out:
- **Railway** — usage-based billing, real estimate ~$30-42/mo; pricier than
  Render and the opposite of predictable. Weaker default DB reliability
  (opt-in HA/PITR; comparison sources flag a visible incident history).
- **Decoupled DB** (Render for compute + managed Postgres elsewhere — Neon,
  Supabase, DigitalOcean, Aiven) — best case found (DigitalOcean, ~$15/mo,
  unverified against DO's own pricing page) saves ~$4/mo over Render's own
  Postgres. Not worth trading same-network locality for a saving that small,
  or reopening the public-internet DB exposure question RDS's VPC isolation
  closes today.
- **Self-hosting Postgres on personal hardware** — cheaper in raw dollars,
  but a real reliability and security downgrade (no static IP guarantee, no
  UPS, exposes a personal device to the internet) — directly against this
  migration's own goal.

## target device / platform
🌱 idea

Server-side hosting/infrastructure — not user-facing.

## constraints
🌱 idea

No data loss during migration (jobs, documents, user accounts, auth state).
Whatever's chosen needs a real number for ongoing cost at actual usage, not
another free-tier cliff.

## non-goals
🌱 idea

- Not redesigning the app itself (backend/frontend split, database choice) —
  this is an infra move, not a rewrite.
- Not the desktop app's distribution — that's the separate
  `job-tracker-desktop-releases` repo and unrelated to where the web backend
  runs.
- Not necessarily removing the maintenance-page mechanism entirely — it may
  still be useful for genuine planned maintenance, just not as a nightly
  cost workaround.

## open questions
🌱 idea

- What's actually driving AWS's real spend above $30/month despite the
  nightly RDS stop? A NAT Gateway is the leading suspect (~$32-33/mo just for
  existing, running 24/7, and easy to end up with unintentionally via a VPC
  wizard even though nothing in `stack-decisions.md`'s checklist calls for
  one) — check EC2 → VPC → NAT Gateways, and Billing → Cost Explorer grouped
  by service, to confirm before treating $25-28/mo as the real baseline being
  moved away from. Doesn't change the Render recommendation either way.
- Render's Basic-256mb Postgres tier was sized against a pre-launch database
  (8.6MB). Worth re-checking `pg_database_size` after real user traffic
  begins — that's the number to watch, not the cache hit ratio, which will
  likely stay near 100% regardless of growth for a long while.
- Is there a hard deadline — e.g. before the AWS free plan's 6-month window
  or credit exhaustion — that this migration needs to land by?
- What happens to `renew-cert.yml`, `rds-maintenance-window.md`'s EventBridge
  scheduler, and the DST-timing logic in `MaintenanceError`/`api.ts` once
  Render is live — fully retired, or does the maintenance-page mechanism get
  repurposed for genuine planned maintenance (per the existing non-goal)?
- Render's Postgres storage is listed as "expandable" at $0.30/GB — worth
  confirming there's no hard cap behind that before committing, though it
  reads as pay-as-you-grow rather than a wall you can hit.
- `docs/stack-decisions.md` already flags that AWS's free-tier terms changed
  once and warns against trusting cached pricing knowledge. The Render
  numbers above were checked against Render's own pricing page directly
  (2026-08-24); re-verify at decision time if this plan sits for a while
  before implementation starts.
