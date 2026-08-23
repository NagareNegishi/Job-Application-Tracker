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

The current stack costs roughly $25-28/month running 24/7 (`docs/stack-
decisions.md`). The $200 sign-up credit covers about 7-8 months of that, but
AWS's free plan itself closes at 6 months regardless of remaining credit,
forcing a switch to a paid account. To stretch the credits before launch, the
app runs a nightly maintenance window (8 PM-7 AM NZ, `MaintenanceError` in
`src/lib/api.ts`, `docs/plans/maintenance-page.md`) that takes it fully
offline — real downtime for anyone trying to use it, which doesn't hold up
once this is meant to be a real, launched product.

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

## stack
🌱 idea

Current: ASP.NET Core backend, PostgreSQL, React/Vite frontend, Docker-based
deploy via GitHub Actions. Target platform is undecided — see open questions.

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

- What's the actual monthly budget ceiling? This decides which platforms are
  even in scope (e.g. a small paid PaaS tier vs. a cheap VPS vs. a managed
  Postgres + object storage combo).
- Does "stable" specifically rule out free-tier cold starts (Render, Railway,
  and Fly.io's free tiers commonly sleep an idle service) — because that
  would just reproduce the same downtime under a different name?
- Is leaving Docker/EC2 entirely acceptable (e.g. a PaaS that builds straight
  from git), or should the container-based deploy be kept and only the
  compute/DB provider change?
- Does file storage need to move too, or can S3 stay as-is (it's already
  cheap, ~$0.10/month) while compute and the database move elsewhere?
- What happens to the existing GitHub Actions pipeline (`deploy.yml`,
  `renew-cert.yml`) — rewritten from scratch or partially reused?
- Is there a hard deadline — e.g. before the AWS free plan's 6-month window
  or credit exhaustion — that this migration needs to land by?
- `docs/stack-decisions.md` already flags that AWS's free-tier terms changed
  once and warns against trusting cached pricing knowledge. Any new
  comparison should apply the same discipline: verify live pricing at
  decision time.
