namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// DTO for updating a job application
/// </summary>
public class UpdateJobDTO
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
    public List<Correspondence>? Correspondences { get; set; }
}
