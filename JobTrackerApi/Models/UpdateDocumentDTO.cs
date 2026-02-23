namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;
/// <summary>
/// DTO for updating an existing document associated with a job application
/// </summary>
public class UpdateDocumentDTO {
    public DocumentType? Type { get; set; }

    [MaxLength(ValidationConstants.MaxDocumentNameLength)]
    public string? Name { get; set; }
}
