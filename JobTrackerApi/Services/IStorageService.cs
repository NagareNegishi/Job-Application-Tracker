namespace JobTrackerApi.Services;

public interface IStorageService
{
    /// <summary>Saves a file and returns its storage key.</summary>
    Task<string> SaveAsync(IFormFile file, string storedName);

    /// <summary>Deletes a file by its storage key.</summary>
    Task DeleteAsync(string storageKey);

    /// <summary>Returns a readable stream for the file at the given storage key.</summary>
    Task<Stream> GetAsync(string storageKey);
}
