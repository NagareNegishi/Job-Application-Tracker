using Amazon.S3;
using Amazon.S3.Model;

namespace JobTrackerApi.Services;

/// <summary>Production IStorageService implementation that stores files in an S3 bucket.</summary>
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
        // Key is S3's term for the file path/name within the bucket
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

    public Task<Stream> GetAsync(string storageKey)
    {
        // S3 files are served via pre-signed URLs (GetDownloadUrlAsync).
        // Streaming through the server is not supported — it would incur EC2 egress costs.
        // Uncomment below if direct streaming is ever needed:
        // var response = await _s3.GetObjectAsync(_bucketName, storageKey);
        // return response.ResponseStream;
        throw new NotSupportedException("S3StorageService does not support streaming. Use GetDownloadUrlAsync instead.");
    }

    // NOTE:
    // S3 bucket is private, can't access files without AWS credentials.
    // A pre-signed URL is a regular HTTPS URL with AWS credentials and an expiry baked into the query string as a signature.
    // Anyone who has the URL can fetch that one file, until it expires. No credentials needed on the browser side.  
    public Task<string?> GetDownloadUrlAsync(string storageKey)
    {
        // GetPreSignedUrlRequest is a data object telling the SDK what you want signed
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _bucketName,
            Key = storageKey,
            Expires = DateTime.UtcNow.AddMinutes(15),
        };
        // pure local computation
        var url = _s3.GetPreSignedURL(request);
        return Task.FromResult<string?>(url);
    }
}
