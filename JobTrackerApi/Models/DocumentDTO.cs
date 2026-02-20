namespace JobTrackerApi.Models;
/// <summary>
/// DTO for creating a new document associated with a job application
/// </summary>
public class DocumentDTO {
    public required IFormFile File { get; set; }
    public DocumentType Type { get; set; } = DocumentType.Other;
    public string? Name { get; set; } // optional override

    /// <summary>
    /// Converts this DTO to a Document entity, generating the file path and name.
    /// </summary>
    /// <param name="jobId">The ID of the job this document belongs to.</param>
    /// <param name="path">Absolute path to the directory where files are stored.</param>
    /// <returns>A <see cref="Document"/> ready to be saved to the database.</returns>
    public Document ToDocument(int jobId, string path) {
        var fileName = Name ?? File.FileName;
        var filePath = Path.Combine(path, fileName);
        return new Document {
            Type = Type,
            Name = fileName,
            FilePath = filePath,
            CreatedAt = DateTime.UtcNow, // use UTC for consistency
            JobId = jobId
        };
    }
}
