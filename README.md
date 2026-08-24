# Job Application Tracker

Keeping track of dozens of job applications in a spreadsheet gets messy fast.<br>
Job Application Tracker is a web app that gives you a single place to log every application, track where it stands, attach your CV and cover letters, and record contacts and conversations.<br>
Switch between a table view and a Kanban board, filter by location or work mode, and set priorities.

## Tech Stack

- **Backend:** ASP.NET Core 10 Web API, Entity Framework Core, PostgreSQL, ASP.NET Identity + JWT
- **Frontend:** React 19 + TypeScript + Vite
- **Storage:** AWS S3 (production), local filesystem (development)
- **Infrastructure:** EC2 + Docker Compose, RDS PostgreSQL, ECR
- **External APIs:** Resend (email), Anthropic (AI features)
- **Testing:** xUnit (backend), Vitest + Testing Library (frontend)
- **CI/CD:** GitHub Actions — tests, lint, and build run on every PR; merging to `main` builds, migrates, and deploys automatically

## Features

- Track job applications through a status pipeline (Wishlist → Applied → Screening → Interview → Offer / Rejected / No Response)
- Tab views on the job table: Active, Closing Soon, All, Closed
- Kanban board view: drag cards to move jobs between stages
- Customisable table columns: show or hide columns, preferences saved per user
- Dark mode and colour themes: four built-in palettes, preference saved per user
- Sort by any column and filter by location or work mode
- Attach documents (CV, cover letter) per application
- Contact and correspondence history per application
- JWT authentication with httpOnly refresh token rotation
- Email verification on registration, with forgot/reset password
- Change password from the Settings page
- Demo mode: try the app without registering
- AI auto-fill: paste a job listing and fields fill in automatically (AI-enabled accounts only)
- AI job insights: alignment score, skill gaps, and interview prep from your saved profile (AI-enabled accounts only)
- Analytics dashboard: summary counts, status funnel, weekly applications chart, and stale applications list
- Desktop app: native Windows/macOS/Linux client, installers at [job-tracker-desktop-releases](https://github.com/NagareNegishi/job-tracker-desktop-releases)

## Demo

Live demo at [jobtracker.nagarenegishi.com](https://jobtracker.nagarenegishi.com).

Click **Try Demo** on the login page. No account required. The demo account has sample applications across all statuses and priorities.

**Demo limitations:**
- Document upload and delete are disabled. The upload UI is visible but actions return a clear message.
- Password changes are blocked

**AI features:**
AI auto-fill and AI insights are limited to approved accounts. Open access would expose the API key to unlimited use.
To try it, leave a comment on this repo or reach out directly and I'll enable it for your account.

**Data reset:**
- On every demo login, any missing sample jobs are automatically restored. Visitor deletions come back; visitor additions are left alone.
- The demo profile is wiped, not reseeded, on nightly reset
- Full reset runs nightly via a scheduled GitHub Actions workflow, clearing all data and re-seeding from scratch

**Availability:**
- Offline daily from 8 PM to 7 AM New Zealand time. RDS stops overnight to reduce demo hosting costs.

To get the full experience (documents, password change), [register a free account](https://jobtracker.nagarenegishi.com/register).

---

## Project Goals

1. **Functional:** Daily-use job tracking tool
2. **Portfolio:** Demonstrate C#/.NET + full-stack capability
3. **Market:** Open Wellington .NET job opportunities

---

## Local Development

The project runs in a Dev Container (recommended). PostgreSQL runs as a separate Docker service.

1. Open in VS Code with the Dev Containers extension
2. Copy [`JobTrackerApi/appsettings.Development.example.json`](JobTrackerApi/appsettings.Development.example.json) to `JobTrackerApi/appsettings.Development.json` (gitignored) and fill in the placeholders
3. Run migrations: `cd JobTrackerApi && dotnet ef database update`
4. Start backend: `cd JobTrackerApi && dotnet run --launch-profile https`
5. Start frontend: `cd job-tracker-ui && npm install && npm run dev`
6. Run tests: `dotnet test` (backend, from repo root or `JobTrackerApi.Tests/`), `npm run test` (frontend, from `job-tracker-ui/`)

In development, documents are stored at the path set in `Storage:UploadsPath`. The folder is created automatically on startup.

---

## Production Deployment

Deployed on AWS: EC2 (Docker Compose) + RDS PostgreSQL + S3 document storage. nginx handles SSL termination and serves the React frontend. The backend runs on the internal Docker network only.

See [`docs/deployment-setup.md`](docs/deployment-setup.md) for required AWS infrastructure, GitHub Actions secrets, and EC2 setup.

---

## Claude Code

Claude Code is used as a coding assistant on specific tasks, under developer direction. The Dev Container's `project-firewall.sh` restricts its outbound network to an allowlist of domains. `.claude/skills/` holds custom skills covering planning, implementation, review, security scanning, and release workflow, and `CLAUDE.md` loads codebase context into every session. Architecture decisions and plans are in `docs/`.
