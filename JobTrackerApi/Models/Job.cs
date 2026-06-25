namespace JobTrackerApi.Models;

/// <summary>EF Core entity representing a job application.</summary>
public class Job
{
    // EF Core automatically recognizes Id as the primary key
    public int Id { get; set; }
    public string UserId { get; set; } = string.Empty; // for owner ship, can't be null
    public string Company { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public JobStatus Status { get; set; } = JobStatus.Wishlist;
    public Priority Priority { get; set; } = Priority.Low;
    public DateTime? AppliedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    // Navigation property for related documents (CV, cover letter, etc.)
    public List<Document> Documents { get; set; } = [];
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


    // Method to convert Job to JobResponseDto
    public JobResponseDto ToResponseDto()
    {
        return new JobResponseDto
        {
            Id = this.Id,
            Company = this.Company,
            Role = this.Role,
            Status = this.Status,
            Priority = this.Priority,
            AppliedAt = this.AppliedAt,
            ClosedAt = this.ClosedAt,
            Documents = this.Documents?.Select(d => d.ToResponseDto()).ToList() ?? [],
            Description = this.Description,
            Notes = this.Notes,
            Contacts = this.Contacts,
            Correspondences = this.Correspondences,
            JobUrl = this.JobUrl,
            Source = this.Source,
            SalaryMin = this.SalaryMin,
            SalaryMax = this.SalaryMax,
            Location = this.Location,
            WorkMode = this.WorkMode,
            InterviewAt = this.InterviewAt
        };
    }
}
