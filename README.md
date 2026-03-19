# Job Application Tracker

Full-stack job application tracking system built with ASP.NET Core and React.

## Tech Stack

**Backend:** ASP.NET Core 10 Web API, Entity Framework Core, PostgreSQL, ASP.NET Identity + JWT
**Frontend:** React 19 + TypeScript + Vite
**Testing:** xUnit
**Deployment:** Docker (Dev Container)

## Problem

Tracking 50-200+ job applications requires structured data management.

## Solution

RESTful API with job tracking, document management (CV/cover letter references), and status pipeline. Documents stored locally for privacy; metadata in database. All endpoints protected by JWT Bearer auth with httpOnly cookie refresh token rotation.

## Local Setup

```bash
# Backend
cd JobTrackerApi
dotnet restore
dotnet ef database update
dotnet run --launch-profile https

# Frontend
cd job-tracker-ui
npm install
npm run dev
```

Requires: .NET SDK 10, Node.js 18+, PostgreSQL 14+

> **Note:** The backend requires `appsettings.Development.json` (gitignored).
> Create it in `JobTrackerApi/` with your JWT config:
> ```json
> {
>   "ConnectionStrings": { "JobTrackerContext": "<your-connection-string>" },
>   "Jwt": {
>     "Key": "<min-32-char-secret>",
>     "Issuer": "JobTrackerApi",
>     "Audience": "JobTrackerClient",
>     "ExpiryMinutes": 15,
>     "RefreshExpiryDays": 7
>   },
>   "Storage": { "UploadsPath": "<path-to-uploads-folder>" },
>   "Cors": { "AllowedOrigins": ["http://localhost:5173"] }
> }
> ```

## Status Pipeline

Wishlist → Applied → Screening → Interview → Offer/Rejected

## Project Goals

1. **Functional:** Daily-use job tracking tool
2. **Portfolio:** Demonstrate C#/.NET + full-stack capability
3. **Market:** Open Wellington .NET job opportunities
