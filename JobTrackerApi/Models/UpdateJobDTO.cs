namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>
/// DTO for updating a job application
/// </summary>
public class UpdateJobDTO : IValidatableObject
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
    public List<Contact> Contacts { get; set; } = [];
    
    [MaxLength(ValidationConstants.MaxCorrespondenceSize)]
    public List<Correspondence> Correspondences { get; set; } = [];

    [Url]
    [MaxLength(ValidationConstants.MaxJobUrlLength)]
    [RegularExpression(@"^https?://", ErrorMessage = "URL must use http or https.")]
    public string? JobUrl { get; set; }

    [MaxLength(ValidationConstants.MaxSourceLength)]
    public string? Source { get; set; }

    public int? SalaryMin { get; set; }

    public int? SalaryMax { get; set; }

    [MaxLength(ValidationConstants.MaxLocationLength)]
    public string? Location { get; set; }

    public WorkMode? WorkMode { get; set; }

    public DateTime? InterviewAt { get; set; }

    // Cross-field validation — runs after per-property attributes pass.
    // https://learn.microsoft.com/en-us/aspnet/core/mvc/models/validation#ivalidatableobject
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (SalaryMin.HasValue && SalaryMax.HasValue && SalaryMin > SalaryMax)
            yield return new ValidationResult(
                "SalaryMin must be less than or equal to SalaryMax.",
                [nameof(SalaryMin), nameof(SalaryMax)]);
    }
}
