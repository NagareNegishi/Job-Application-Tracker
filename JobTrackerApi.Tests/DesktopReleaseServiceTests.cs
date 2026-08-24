namespace JobTrackerApi.Tests;
using JobTrackerApi.Models;
using JobTrackerApi.Services;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging.Abstractions;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;

/// <summary>Tests for DesktopReleaseService — filename-based platform matching and cache/upstream-failure behavior.</summary>
public class DesktopReleaseServiceTests
{
    // Routes every request to a canned response; records how many times it was invoked
    private class FakeHandler : HttpMessageHandler
    {
        private readonly Func<HttpResponseMessage> _respond;
        public int CallCount { get; private set; }

        public FakeHandler(Func<HttpResponseMessage> respond) => _respond = respond;

        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            CallCount++;
            return Task.FromResult(_respond());
        }
    }

    private static HttpResponseMessage JsonResponse(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static DesktopReleaseService CreateService(FakeHandler handler) =>
        new(new HttpClient(handler), new MemoryCache(new MemoryCacheOptions()), NullLogger<DesktopReleaseService>.Instance);

    private static GitHubReleaseResponse Deserialize(string json) =>
        JsonSerializer.Deserialize<GitHubReleaseResponse>(json)!;

    // Mirrors the real v0.1.2 release: an .msi, a universal .dmg, and an aarch64-only .dmg, no .deb
    private const string ReleaseJson = """
        {
          "tag_name": "v0.1.2",
          "assets": [
            { "name": "Job.Application.Tracker_0.1.2_x64_en-US.msi", "browser_download_url": "https://example.com/win.msi" },
            { "name": "Job.Application.Tracker_0.1.2_universal.dmg", "browser_download_url": "https://example.com/mac-universal.dmg" },
            { "name": "Job.Application.Tracker_0.1.2_aarch64.dmg", "browser_download_url": "https://example.com/mac-aarch64.dmg" }
          ]
        }
        """;

    // ---- MapToDto: filename-pattern matching ----

    [Fact]
    public void MapToDto_MsiAsset_PicksWindows()
    {
        var dto = DesktopReleaseService.MapToDto(Deserialize(ReleaseJson));
        var windows = Assert.Single(dto.Platforms, p => p.Platform == "windows");
        Assert.Equal("Windows", windows.Label);
        Assert.Equal("https://example.com/win.msi", windows.Url);
    }

    [Fact]
    public void MapToDto_UniversalDmg_PicksMacOSOverAarch64OnlyBuild()
    {
        var dto = DesktopReleaseService.MapToDto(Deserialize(ReleaseJson));
        var macos = Assert.Single(dto.Platforms, p => p.Platform == "macos");
        Assert.Equal("https://example.com/mac-universal.dmg", macos.Url);
    }

    [Fact]
    public void MapToDto_NoDebAsset_OmitsLinuxEntirely()
    {
        var dto = DesktopReleaseService.MapToDto(Deserialize(ReleaseJson));
        Assert.DoesNotContain(dto.Platforms, p => p.Platform == "linux");
    }

    [Fact]
    public void MapToDto_DebAsset_PicksLinux()
    {
        const string json = """
            {
              "tag_name": "v0.1.0",
              "assets": [
                { "name": "job-tracker_0.1.0_amd64.deb", "browser_download_url": "https://example.com/linux.deb" }
              ]
            }
            """;
        var dto = DesktopReleaseService.MapToDto(Deserialize(json));
        var linux = Assert.Single(dto.Platforms, p => p.Platform == "linux");
        Assert.Equal("https://example.com/linux.deb", linux.Url);
    }

    [Fact]
    public void MapToDto_UsesTagNameAsVersion()
    {
        var dto = DesktopReleaseService.MapToDto(Deserialize(ReleaseJson));
        Assert.Equal("v0.1.2", dto.Version);
    }

    [Fact]
    public void MapToDto_NoMatchingAssets_ReturnsEmptyPlatforms()
    {
        const string json = """{ "tag_name": "v0.1.3", "assets": [] }""";
        var dto = DesktopReleaseService.MapToDto(Deserialize(json));
        Assert.Empty(dto.Platforms);
    }

    // ---- GetLatestReleaseAsync: cache + upstream failure ----

    [Fact]
    public async Task GetLatestReleaseAsync_UpstreamSucceeds_ReturnsMappedRelease()
    {
        var handler = new FakeHandler(() => JsonResponse(HttpStatusCode.OK, ReleaseJson));
        var svc = CreateService(handler);

        var result = await svc.GetLatestReleaseAsync();

        Assert.Equal("v0.1.2", result.Version);
        Assert.Contains(result.Platforms, p => p.Platform == "windows");
    }

    [Fact]
    public async Task GetLatestReleaseAsync_SecondCallWithinTtl_ServesFromCacheWithoutCallingUpstreamAgain()
    {
        var handler = new FakeHandler(() => JsonResponse(HttpStatusCode.OK, ReleaseJson));
        var svc = CreateService(handler);

        await svc.GetLatestReleaseAsync();
        await svc.GetLatestReleaseAsync();

        Assert.Equal(1, handler.CallCount);
    }

    [Fact]
    public async Task GetLatestReleaseAsync_UpstreamFailsAndCacheEmpty_ThrowsDesktopReleaseUnavailableException()
    {
        var handler = new FakeHandler(() => new HttpResponseMessage(HttpStatusCode.ServiceUnavailable));
        var svc = CreateService(handler);

        await Assert.ThrowsAsync<DesktopReleaseUnavailableException>(() => svc.GetLatestReleaseAsync());
    }

    [Fact]
    public async Task GetLatestReleaseAsync_UpstreamReturnsEmptyBody_ThrowsDesktopReleaseUnavailableException()
    {
        var handler = new FakeHandler(() => JsonResponse(HttpStatusCode.OK, "null"));
        var svc = CreateService(handler);

        await Assert.ThrowsAsync<DesktopReleaseUnavailableException>(() => svc.GetLatestReleaseAsync());
    }
}
