namespace JobTrackerApi.Models;

public class JobResponseDto
{
    // EF Core automatically recognizes Id as the primary key
    public int Id { get; set; }
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public JobStatus Status { get; set; } = JobStatus.Wishlist;
    public Priority Priority { get; set; } = Priority.Low;
    public DateTime? AppliedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    // Navigation property for related documents (CV, cover letter, etc.)
    public List<DocumentResponseDto>? Documents { get; set; } // Don't expose internal Document
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<Contact>? Contacts { get; set; }
    public List<Correspondence>? Correspondences { get; set; }
}
