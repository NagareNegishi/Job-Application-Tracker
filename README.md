# Job Application Tracker

Full-stack job application tracking system built with ASP.NET Core and React.

## Tech Stack

**Backend:** ASP.NET Core 10 Web API, Entity Framework Core, PostgreSQL, ASP.NET Identity + JWT
**Frontend:** React 19 + TypeScript + Vite
**Storage:** AWS S3 (production), local filesystem (development)
**Infrastructure:** EC2 + Docker Compose, RDS PostgreSQL, ECR
**Testing:** xUnit
**CI/CD:** GitHub Actions (test → build → migrate → deploy)

## Features

- Track job applications through a status pipeline (Wishlist → Applied → Screening → Interview → Offer / Rejected)
- Attach documents (CV, cover letter) per application
- Contact and correspondence history per application
- JWT authentication with httpOnly refresh token rotation
- Demo mode — try the app without registering

## Demo

A live demo is available at [jobtracker.nagarenegishi.com](https://jobtracker.nagarenegishi.com).

Click **Try Demo** on the login page — no account required. The demo account is pre-loaded with sample job applications across different statuses and priorities.

**Demo limitations:**
- Document upload and delete are disabled — upload UI is visible but actions return a clear message
- Password changes are blocked

**Data reset:**
- On every demo login, any missing sample jobs are automatically restored — visitor deletions come back, visitor additions are left alone
- Full reset runs nightly at 3am UTC via a scheduled GitHub Actions workflow — clears all data and re-seeds from scratch

To get the full experience (documents, password change), [register a free account](https://jobtracker.nagarenegishi.com/register).

---

## Problem

Tracking 50-200+ job applications requires structured data management.

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

In development, documents are stored in the local filesystem path set in `Storage:UploadsPath`. The folder is created automatically on startup if it does not exist.

---

## Production Deployment

Deployed on AWS: EC2 (Docker Compose) + RDS PostgreSQL + S3 document storage. nginx handles SSL termination and serves the React frontend; the backend runs on the internal Docker network only.

See [`docs/deployment-setup.md`](docs/deployment-setup.md) for required AWS infrastructure, GitHub Actions secrets, and EC2 setup.
