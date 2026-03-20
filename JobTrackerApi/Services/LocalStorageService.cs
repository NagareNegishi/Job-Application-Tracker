namespace JobTrackerApi.Services;

public class LocalStorageService : IStorageService
{
    private readonly string _uploadsPath;

    public LocalStorageService(IConfiguration configuration)
    {
        var path = configuration["Storage:UploadsPath"];
        if (string.IsNullOrEmpty(path))
            throw new InvalidOperationException("Storage:UploadsPath is not configured in appsettings.");
        _uploadsPath = path;
    }

    public async Task<string> SaveAsync(IFormFile file, string storedName)
    {
        var filePath = Path.Combine(_uploadsPath, storedName);
        using var stream = File.Create(filePath);
        await file.CopyToAsync(stream);
        return storedName; // storage key is the file name; service owns the base path
    }

    public Task DeleteAsync(string storageKey)
    {
        var filePath = Path.Combine(_uploadsPath, storageKey);
        File.Delete(filePath);
        return Task.CompletedTask;
    }

    public Task<Stream> GetAsync(string storageKey)
    {
        var filePath = Path.Combine(_uploadsPath, storageKey);
        Stream stream = File.OpenRead(filePath);
        return Task.FromResult(stream);
    }

    public Task<string?> GetDownloadUrlAsync(string storageKey)
    {
        // S3 needs async. But local disk has no async work to do here
        return Task.FromResult<string?>(null);
    }
}