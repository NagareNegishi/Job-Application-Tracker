namespace JobTrackerApi.Models;
/// <summary>
/// Represents a document associated with a job application
/// ** DO NOT directly instantiate this class in your code. **
/// User provides the file itself to DTO class,
/// DTO class generates the file path and name,
/// and then creates a Document instance to be saved in the database.
/// </summary>
public class Document
{
    public int Id { get; set; }
    public DocumentType Type { get; set; }
    public required string Name { get; set; } // Original, display name
    public required string StoredName { get; set; } // Randomly generated name for storage
    public required string StorageKey { get; set; } // Opaque key used by IStorageService (local: filename; S3: object key)
    public DateTime CreatedAt { get; set; }
    public int JobId { get; set; }


    // Method to convert Document to DocumentResponseDto
    public DocumentResponseDto ToResponseDto()
    {
        return new DocumentResponseDto
        {
            JobId = this.JobId,
            DocId = this.Id,
            Type = this.Type,
            Name = this.Name
        };
    }
}