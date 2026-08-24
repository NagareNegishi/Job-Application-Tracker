namespace JobTrackerApi.Models;

/// <summary>Response shape for GET /api/desktop-release.</summary>
public record DesktopReleaseResponseDto(string Version, List<PlatformDownloadDto> Platforms);

/// <summary>One platform's desktop installer download.</summary>
public record PlatformDownloadDto(string Platform, string Label, string Url);

/// <summary>Thrown when the GitHub Releases API call fails and nothing is cached yet.</summary>
public class DesktopReleaseUnavailableException : Exception
{
    public DesktopReleaseUnavailableException(string message, Exception? inner = null) : base(message, inner) { }
}
