using Amazon.S3;
using Amazon.S3.Model;

namespace JobTrackerApi.Services;

public class S3StorageService : IStorageService
{
    private readonly IAmazonS3 _s3;
    private readonly string _bucketName;

    // Injects IAmazonS3 (provided by AddAWSService<IAmazonS3>() in DI) and reads the bucket name from config
    public S3StorageService(IAmazonS3 s3, IConfiguration configuration)
    {
        _s3 = s3;
        _bucketName = configuration["Storage:S3BucketName"]
            ?? throw new InvalidOperationException("Storage:S3BucketName is not configured.");
    }

    public async Task<string> SaveAsync(IFormFile file, string storedName)
    {
        // PutObjectRequest is the SDK's upload model
        var request = new PutObjectRequest
        {
            BucketName = _bucketName,
            Key = storedName,
            InputStream = file.OpenReadStream(),
            ContentType = file.ContentType,
        };
        await _s3.PutObjectAsync(request);
        return storedName;
    }

    public async Task DeleteAsync(string storageKey)
    {
        await _s3.DeleteObjectAsync(_bucketName, storageKey);
    }

    public async Task<Stream> GetAsync(string storageKey)
    {
        var response = await _s3.GetObjectAsync(_bucketName, storageKey);
        return response.ResponseStream;
    }

    public Task<string?> GetDownloadUrlAsync(string storageKey)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = storageKey,
            Expires = DateTime.UtcNow.AddMinutes(15),
        };
        var url = _s3.GetPreSignedURL(request);
        return Task.FromResult<string?>(url);
    }
}
