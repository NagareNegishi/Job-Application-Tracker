namespace JobTrackerApi.Models;

/// <summary>Safe API response shape for a job application, without owner identity or raw document internals.</summary>
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
    // Navigation property for related documents, Don't expose internal Document
    public List<DocumentResponseDto> Documents { get; set; } = [];
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<Contact> Contacts { get; set; } = [];
    public List<Correspondence> Correspondences { get; set; } = [];
    public string? JobUrl { get; set; }
    public string? Source { get; set; }
    public int? SalaryMin { get; set; }
    public int? SalaryMax { get; set; }
    public string? Location { get; set; }
    public WorkMode? WorkMode { get; set; }
    public DateTime? InterviewAt { get; set; }
}
