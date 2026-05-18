# Job Application Tracker

Keeping track of dozens of job applications in a spreadsheet gets messy fast.
Job Application Tracker is a web app that gives you a single place to manage your entire job search,
log every application, track where it stands, attach your CV and cover letters,
record contacts and conversations, and get a clear view of what needs attention next.

Switch between a table view and a Kanban board, filter by location or work mode, and set priorities so nothing slips through the cracks.

## Tech Stack

- **Backend:** ASP.NET Core 10 Web API, Entity Framework Core, PostgreSQL, ASP.NET Identity + JWT
- **Frontend:** React 19 + TypeScript + Vite
- **Storage:** AWS S3 (production), local filesystem (development)
- **Infrastructure:** EC2 + Docker Compose, RDS PostgreSQL, ECR
- **Testing:** xUnit
- **CI/CD:** GitHub Actions (test → build → migrate → deploy)

## Features

- Track job applications through a status pipeline (Wishlist → Applied → Screening → Interview → Offer / Rejected)
- Tab views on the job table: Active, Closing Soon, All, Rejected
- Kanban board view — toggle from the table; drag cards across Low / Medium / High priority columns
- Customisable table columns — show or hide columns; preferences saved per user
- Sorting and filtering — sort by any column; filter by location or work mode
- Attach documents (CV, cover letter) per application
- Contact and correspondence history per application
- JWT authentication with httpOnly refresh token rotation
- Email verification on registration; forgot / reset password flow
- Change password from the Settings page
- Demo mode — try the app without registering

## Demo

A live demo is available at [jobtracker.nagarenegishi.com](https://jobtracker.nagarenegishi.com).

Click **Try Demo** on the login page — no account required. The demo account is pre-loaded with sample job applications across different statuses and priorities.

**Demo limitations:**
- Document upload and delete are disabled — upload UI is visible but actions return a clear message
- Password changes are blocked

**Data reset:**
- On every demo login, any missing sample jobs are automatically restored — visitor deletions come back, visitor additions are left alone
- Full reset runs nightly via a scheduled GitHub Actions workflow — clears all data and re-seeds from scratch

**Availability:**
- Offline daily midnight–8 AM Sydney time — RDS stopped overnight to reduce demo hosting costs

To get the full experience (documents, password change), [register a free account](https://jobtracker.nagarenegishi.com/register).

---

## Project Goals

1. **Functional:** Daily-use job tracking tool
2. **Portfolio:** Demonstrate C#/.NET + full-stack capability
3. **Market:** Open Wellington .NET job opportunities

---

## Local Development

The project runs in a Dev Container (recommended — PostgreSQL included as a Docker service).

1. Open in VS Code with the Dev Containers extension
2. Create `JobTrackerApi/appsettings.Development.json` (gitignored):
```json
{
  "ConnectionStrings": { "JobTrackerContext": "<your-connection-string>" },
  "Jwt": {
    "Key": "<min-32-char-secret>",
    "Issuer": "JobTrackerApi",
    "Audience": "JobTrackerClient",
    "ExpiryMinutes": 15,
    "RefreshExpiryDays": 7
  },
  "Storage": { "UploadsPath": "<path-to-uploads-folder>" },
  "Cors": { "AllowedOrigins": ["http://localhost:5173"] }
}
```
3. Run migrations: `cd JobTrackerApi && dotnet ef database update`
4. Start backend: `cd JobTrackerApi && dotnet run --launch-profile https`
5. Start frontend: `cd job-tracker-ui && npm install && npm run dev`
6. Run tests: `cd JobTrackerApi.Tests && dotnet test`

In development, documents are stored in the local filesystem path set in `Storage:UploadsPath`. The folder is created automatically on startup if it does not exist.

---

## Production Deployment

Deployed on AWS: EC2 (Docker Compose) + RDS PostgreSQL + S3 document storage. nginx handles SSL termination and serves the React frontend; the backend runs on the internal Docker network only.

See [`docs/deployment-setup.md`](docs/deployment-setup.md) for required AWS infrastructure, GitHub Actions secrets, and EC2 setup.

---

## Claude Code

Claude Code is used selectively as an AI coding assistant for targeted tasks, under developer direction. The Dev Container (`.devcontainer/`) with `project-firewall.sh` restricts its outbound network access to an allowlist of domains. `.claude/` contains custom skills (frontend design, OWASP scanning, dev research, learning mode) and `CLAUDE.md` loads codebase context into every session. Architecture decisions and plans are documented in `docs/`.
