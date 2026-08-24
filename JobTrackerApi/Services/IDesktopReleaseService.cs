using JobTrackerApi.Models;

namespace JobTrackerApi.Services;

/// <summary>Abstraction for fetching the latest desktop app release info.</summary>
public interface IDesktopReleaseService
{
    /// <summary>
    /// Returns the latest desktop release's version and per-platform installer downloads,
    /// serving from cache when available. Throws <see cref="DesktopReleaseUnavailableException"/>
    /// if the upstream call fails and nothing is cached yet.
    /// </summary>
    Task<DesktopReleaseResponseDto> GetLatestReleaseAsync();
}
