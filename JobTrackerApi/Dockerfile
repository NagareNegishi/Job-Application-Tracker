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
# Only the compiled output crosses into this stage — no source, no SDK
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "JobTrackerApi.dll"]
