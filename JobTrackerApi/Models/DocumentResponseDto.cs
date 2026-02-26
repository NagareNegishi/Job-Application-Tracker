namespace JobTrackerApi.Models;
/// <summary>
/// Data Transfer Object for returning document information in API responses.
/// </summary>
public class DocumentResponseDto
{
    public int JobId { get; set; } // Associated Job ID
    public int DocId { get; set; } // Document ID
    public DocumentType Type { get; set; }
    public required string Name { get; set; }
}