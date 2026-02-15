# Job Application Tracker

Full-stack job application tracking system built with ASP.NET Core and React.

## Tech Stack

**Backend:** ASP.NET Core 8 Web API, Entity Framework Core, PostgreSQL
**Frontend:** React + TypeScript
**Testing:** xUnit
**Deployment:** Docker

## Problem

Tracking 50-200+ job applications requires structured data management. Existing tools lack customization for backend engineering job hunts in the NZ market.

## Solution

RESTful API with job tracking, document management (CV/cover letter references), and status pipeline. Documents stored locally for privacy; metadata in database.

## Local Setup
```bash
# Backend
cd backend
dotnet restore
dotnet ef database update
dotnet run

# Frontend
cd frontend
npm install
npm run dev
```

Requires: .NET SDK 8, Node.js 18+, PostgreSQL 14+

## Status Pipeline

Wishlist → Applied → Screening → Interview → Offer/Rejected

## Project Goals

1. **Functional:** Daily-use job tracking tool
2. **Portfolio:** Demonstrate C#/.NET + full-stack capability
3. **Market:** Open Wellington .NET job opportunities
