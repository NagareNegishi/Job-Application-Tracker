namespace JobTrackerApi.Models;
/// <summary>
/// DTO for creating a new document associated with a job application
/// </summary>
public class DocumentDTO {
    public required IFormFile File { get; set; }
    public string? Name { get; set; } // optional override
}

// builds the entity:
// - generates FilePath from the saved file
// - sets Name to File.FileName if not provided
// - sets CreatedAt = DateTime.Now
// - sets JobId from the route