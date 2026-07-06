namespace JobTrackerApi.Tests;
using JobTrackerApi.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Moq;

/// <summary>Tests for LocalStorageService covering constructor, save, delete, get, and URL operations.</summary>
public class LocalStorageServiceTests : IDisposable
{
    private readonly string _tempDir;

    public LocalStorageServiceTests()
    {
        _tempDir = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDir))
            Directory.Delete(_tempDir, recursive: true);
        GC.SuppressFinalize(this);
    }

    private LocalStorageService CreateService(string? uploadsPath = null)
    {
        var config = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:UploadsPath"] = uploadsPath ?? _tempDir
            })
            .Build();
        return new LocalStorageService(config);
    }

    private static Mock<IFormFile> CreateFileMock(string content = "test content")
    {
        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        var mock = new Mock<IFormFile>();
        mock.Setup(f => f.CopyToAsync(It.IsAny<Stream>(), It.IsAny<CancellationToken>()))
            .Returns<Stream, CancellationToken>((dest, _) =>
            {
                dest.Write(bytes, 0, bytes.Length);
                return Task.CompletedTask;
            });
        return mock;
    }

    // Constructor: missing config key throws
    [Fact]
    public void Constructor_MissingConfig_ThrowsInvalidOperationException()
    {
        var config = new ConfigurationBuilder().Build();
        Assert.Throws<InvalidOperationException>(() => new LocalStorageService(config));
    }

    // Constructor: valid config creates the uploads directory
    [Fact]
    public void Constructor_ValidConfig_CreatesUploadsDirectory()
    {
        var dirPath = Path.Combine(Path.GetTempPath(), Guid.NewGuid().ToString());
        try
        {
            Assert.False(Directory.Exists(dirPath));
            _ = CreateService(dirPath);
            Assert.True(Directory.Exists(dirPath));
        }
        finally
        {
            if (Directory.Exists(dirPath)) Directory.Delete(dirPath, recursive: true);
        }
    }

    // SaveAsync: returns the storedName as the storage key
    [Fact]
    public async Task SaveAsync_ValidFile_ReturnsStoredName()
    {
        var svc = CreateService();
        var result = await svc.SaveAsync(CreateFileMock().Object, "file.pdf");
        Assert.Equal("file.pdf", result);
    }

    // SaveAsync: writes file bytes to disk at the expected path
    [Fact]
    public async Task SaveAsync_ValidFile_WritesContentToDisk()
    {
        var svc = CreateService();
        await svc.SaveAsync(CreateFileMock("hello").Object, "hello.txt");
        var written = await File.ReadAllTextAsync(Path.Combine(_tempDir, "hello.txt"));
        Assert.Equal("hello", written);
    }

    // DeleteAsync: removes an existing file from disk
    [Fact]
    public async Task DeleteAsync_ExistingFile_RemovesFile()
    {
        var svc = CreateService();
        var fileName = "todelete.txt";
        await File.WriteAllTextAsync(Path.Combine(_tempDir, fileName), "data");
        await svc.DeleteAsync(fileName);
        Assert.False(File.Exists(Path.Combine(_tempDir, fileName)));
    }

    // DeleteAsync: does not throw when the file is already absent (File.Delete contract)
    [Fact]
    public async Task DeleteAsync_MissingFile_DoesNotThrow()
    {
        var svc = CreateService();
        var ex = await Record.ExceptionAsync(() => svc.DeleteAsync("nonexistent.txt"));
        Assert.Null(ex);
    }

    // GetAsync: returns a readable stream containing the file's content
    [Fact]
    public async Task GetAsync_ExistingFile_ReturnsReadableStream()
    {
        var svc = CreateService();
        var fileName = "readable.txt";
        await File.WriteAllTextAsync(Path.Combine(_tempDir, fileName), "stream content");
        using var stream = await svc.GetAsync(fileName);
        using var reader = new StreamReader(stream);
        Assert.Equal("stream content", await reader.ReadToEndAsync());
    }

    // GetAsync: throws FileNotFoundException for an unknown storage key
    [Fact]
    public async Task GetAsync_MissingFile_ThrowsFileNotFoundException()
    {
        var svc = CreateService();
        await Assert.ThrowsAsync<FileNotFoundException>(() => svc.GetAsync("missing.txt"));
    }

    // GetDownloadUrlAsync: local storage has no remote URL — always null
    [Fact]
    public async Task GetDownloadUrlAsync_AnyKey_ReturnsNull()
    {
        var svc = CreateService();
        var result = await svc.GetDownloadUrlAsync("any-key.pdf");
        Assert.Null(result);
    }
}
