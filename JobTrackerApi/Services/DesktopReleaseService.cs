using System.Net.Http.Headers;
using Microsoft.Extensions.Caching.Memory;
using JobTrackerApi.Models;

namespace JobTrackerApi.Services;

/// <summary>Production implementation — fetches the latest desktop release from the GitHub Releases API, caching the result.</summary>
public class DesktopReleaseService : IDesktopReleaseService
{
    private readonly HttpClient _httpClient;
    private readonly IMemoryCache _cache;
    private readonly ILogger<DesktopReleaseService> _logger;

    public DesktopReleaseService(HttpClient httpClient, IMemoryCache cache, ILogger<DesktopReleaseService> logger)
    {
        _httpClient = httpClient;
        _cache = cache;
        _logger = logger;

        _httpClient.BaseAddress = new Uri("https://api.github.com/");
        // GitHub API rejects requests with no User-Agent
        _httpClient.DefaultRequestHeaders.UserAgent.Add(new ProductInfoHeaderValue("JobTrackerApi", "1.0"));
        _httpClient.DefaultRequestHeaders.Accept.Add(new MediaTypeWithQualityHeaderValue("application/vnd.github+json"));
    }

    public async Task<DesktopReleaseResponseDto> GetLatestReleaseAsync()
    {
        if (_cache.TryGetValue(DesktopReleaseConfig.CacheKey, out DesktopReleaseResponseDto? cached) && cached is not null)
            return cached;

        GitHubReleaseResponse release;
        try
        {
            var response = await _httpClient.GetAsync(
                $"repos/{DesktopReleaseConfig.RepoOwner}/{DesktopReleaseConfig.RepoName}/releases/latest");
            response.EnsureSuccessStatusCode();

            release = await response.Content.ReadFromJsonAsync<GitHubReleaseResponse>()
                ?? throw new DesktopReleaseUnavailableException("GitHub returned an empty release payload.");
        }
        catch (Exception ex) when (ex is not DesktopReleaseUnavailableException)
        {
            _logger.LogWarning(ex, "Failed to fetch latest desktop release from GitHub.");
            throw new DesktopReleaseUnavailableException("Unable to reach the desktop release source.", ex);
        }

        var dto = MapToDto(release);
        _cache.Set(DesktopReleaseConfig.CacheKey, dto, DesktopReleaseConfig.CacheTtl);
        return dto;
    }

    // Picks the human installer per platform by filename — matches the current build's naming
    // (e.g. Job.Application.Tracker_0.1.2_x64_en-US.msi, _universal.dmg). No entry when no
    // matching asset exists (e.g. Linux, which isn't shipped in every release).
    internal static DesktopReleaseResponseDto MapToDto(GitHubReleaseResponse release)
    {
        var platforms = new List<PlatformDownloadDto>();

        var windows = release.Assets.FirstOrDefault(a =>
            a.Name.EndsWith(".msi", StringComparison.OrdinalIgnoreCase));
        if (windows is not null)
            platforms.Add(new PlatformDownloadDto("windows", "Windows", windows.BrowserDownloadUrl));

        // Only the universal build — the separate aarch64-only .dmg is intentionally not offered
        var macos = release.Assets.FirstOrDefault(a =>
            a.Name.EndsWith(".dmg", StringComparison.OrdinalIgnoreCase) &&
            a.Name.Contains("universal", StringComparison.OrdinalIgnoreCase));
        if (macos is not null)
            platforms.Add(new PlatformDownloadDto("macos", "macOS", macos.BrowserDownloadUrl));

        var linux = release.Assets.FirstOrDefault(a =>
            a.Name.EndsWith(".deb", StringComparison.OrdinalIgnoreCase));
        if (linux is not null)
            platforms.Add(new PlatformDownloadDto("linux", "Linux", linux.BrowserDownloadUrl));

        return new DesktopReleaseResponseDto(release.TagName, platforms);
    }
}
