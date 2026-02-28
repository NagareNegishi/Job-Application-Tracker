namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// DTO for updating a job application
/// </summary>
public class UpdateJobDTO
{
    [Required(AllowEmptyStrings = false)]
    [MaxLength(ValidationConstants.MaxCompanyLength)]
    public string Company { get; set; } = string.Empty;

    [Required]
    [MaxLength(ValidationConstants.MaxRoleLength)]
    public string Role { get; set; } = string.Empty;

    [Required]
    public JobStatus Status { get; set; } = JobStatus.Wishlist;

    [Required]
    public Priority Priority { get; set; } = Priority.Low;

    public DateTime? AppliedAt { get; set; }

    public DateTime? ClosedAt { get; set; }

    [MaxLength(ValidationConstants.MaxDescriptionLength)]
    public string? Description { get; set; }

    [MaxLength(ValidationConstants.MaxNotesLength)]
    public string? Notes { get; set; }

    [MaxLength(ValidationConstants.MaxContactSize)]
    public List<Contact>? Contacts { get; set; }
    
    [MaxLength(ValidationConstants.MaxCorrespondenceSize)]
    public List<Correspondence>? Correspondences { get; set; }
}
