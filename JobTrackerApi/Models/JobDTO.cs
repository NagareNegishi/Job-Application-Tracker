namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// DTO for creating or updating a job application
/// </summary>
public class JobDTO
{
    [Required]
    public string Company { get; set; } = string.Empty;
    [Required]
    public string Role { get; set; } = string.Empty;
    [Required]
    public JobStatus Status { get; set; } = JobStatus.Wishlist;
    public Priority? Priority { get; set; }
    public DateTime? AppliedAt { get; set; }
    public DateTime? ClosedAt { get; set; }
    public string? Description { get; set; }
    public string? Notes { get; set; }
    public List<Contact>? Contacts { get; set; }

    public Job ToJob()
    {
        return new Job
        {
            Company = Company,
            Role = Role,
            Status = Status,
            Priority = Priority,
            AppliedAt = AppliedAt,
            ClosedAt = ClosedAt,
            Description = Description,
            Notes = Notes,
            Contacts = Contacts ?? []
        };
    }
}
