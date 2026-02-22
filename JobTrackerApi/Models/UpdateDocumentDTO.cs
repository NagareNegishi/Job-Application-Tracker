namespace JobTrackerApi.Models;
/// <summary>
/// DTO for updating an existing document associated with a job application
/// </summary>
public class UpdateDocumentDTO {
    public DocumentType? Type { get; set; }
    public string? Name { get; set; }
}
