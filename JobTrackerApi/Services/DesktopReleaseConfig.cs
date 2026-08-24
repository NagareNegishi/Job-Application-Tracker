namespace JobTrackerApi.Services;

/// <summary>Source repo and cache configuration for the desktop release lookup.</summary>
internal static class DesktopReleaseConfig
{
    // Public releases repo only — the private source repo must never be referenced here.
    public const string RepoOwner = "NagareNegishi";
    public const string RepoName  = "job-tracker-desktop-releases";

    public const string CacheKey = "desktop-release:latest";
    public static readonly TimeSpan CacheTtl = TimeSpan.FromHours(1);
}
