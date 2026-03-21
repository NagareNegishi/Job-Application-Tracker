namespace JobTrackerApi.Services;

public interface IStorageService
{
    /// <summary>Saves a file and returns its storage key.</summary>
    Task<string> SaveAsync(IFormFile file, string storedName);

    /// <summary>Deletes a file by its storage key.</summary>
    Task DeleteAsync(string storageKey);

    /// <summary>Returns a readable stream for the file at the given storage key.</summary>
    Task<Stream> GetAsync(string storageKey);

    /// <summary>
    /// Returns a time-limited download URL for the file, or null if not supported
    /// (e.g. local storage). When null, callers should fall back to GetAsync.
    /// </summary>
    Task<string?> GetDownloadUrlAsync(string storageKey);
}
