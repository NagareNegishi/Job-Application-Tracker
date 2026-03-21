# Stage 1: Build
# sdk image has the compiler — we use it to compile, then discard it
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Copy solution + all .csproj files before source code.
# Docker caches each layer — if these don't change, restore is skipped on rebuild.
COPY Job-Application-Tracker.sln ./
COPY JobTrackerApi/JobTrackerApi.csproj JobTrackerApi/
# Tests project is never built here, but the .sln references it so restore needs it
COPY JobTrackerApi.Tests/JobTrackerApi.Tests.csproj JobTrackerApi.Tests/

RUN dotnet restore

# Now copy source and publish (Release = optimized, no debug symbols)
COPY JobTrackerApi/ JobTrackerApi/
RUN dotnet publish JobTrackerApi/JobTrackerApi.csproj -c Release -o /app/publish

# Stage 2: Runtime
# aspnet image has the runtime but not the compiler (~200MB vs ~800MB for sdk)
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

# curl is not in the base image — needed for the HEALTHCHECK directive below
# --no-install-recommends: skip optional packages to keep image small
# rm -rf /var/lib/apt/lists/*: delete package index after install (standard Docker layer hygiene)
RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

# Only the compiled output crosses into this stage — no source, no SDK
COPY --from=build /app/publish .

# Docker runs this every 30s; 3 consecutive failures → container marked unhealthy
# --start-period=30s: grace period for app startup before failures count
# -f: curl exits non-zero on HTTP error responses (4xx/5xx), not just network failures
# Port 8080: Kestrel's default in the aspnet base image
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
    CMD curl -f --max-time 5 --no-verbose http://localhost:8080/health || exit 1

ENTRYPOINT ["dotnet", "JobTrackerApi.dll"]
