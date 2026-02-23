namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;
/// <summary>
/// DTO for creating a new document associated with a job application
/// </summary>
public class DocumentDTO {
    [Required]
    public required IFormFile File { get; set; }

    public DocumentType Type { get; set; } = DocumentType.Other;

    [MaxLength(ValidationConstants.MaxDocumentNameLength)]
    public string? Name { get; set; } // optional override

    /// <summary>
    /// Converts this DTO to a Document entity, generating the file path and name.
    /// </summary>
    /// <param name="jobId">The ID of the job this document belongs to.</param>
    /// <param name="path">Absolute path to the directory where files are stored.</param>
    /// <returns>A <see cref="Document"/> ready to be saved to the database.</returns>
    public Document ToDocument(int jobId, string path) {
        // Do not use the FileName property of IFormFile, removes the path from the file name
        // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/file-uploads?view=aspnetcore-10.0#validation
        string fileName = Path.GetFileName(Name ?? File.FileName);
        var filePath = Path.Combine(path, fileName);
        return new Document {
            Type = Type,
            Name = fileName,
            FilePath = filePath,
            CreatedAt = DateTime.UtcNow, // use UTC for consistency
            JobId = jobId
        };
    }

    // Allowed file extensions for upload
    public static readonly string[] AllowedExtensions = [".pdf", ".doc", ".docx"];

    /// <summary>
    /// Checks if the uploaded file has a valid extension.
    /// </summary>
    /// <returns>>true if the file has an allowed extension; otherwise, false.</returns>
    public bool HasValidExtension() {
        // file extension need to be consistent, regardless of the culture
        var extension = Path.GetExtension(File.FileName).ToLowerInvariant();
        return AllowedExtensions.Contains(extension);
    }

}
