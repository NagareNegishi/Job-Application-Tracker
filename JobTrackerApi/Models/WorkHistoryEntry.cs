namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>A single work history entry in a user's profile.</summary>
public class WorkHistoryEntry : IValidatableObject
{
    [Required]
    [MaxLength(ValidationConstants.MaxProfileWorkHistoryTitleLength)]
    public string Title { get; set; } = null!;

    [Required]
    [MaxLength(ValidationConstants.MaxProfileWorkHistoryCompanyLength)]
    public string Company { get; set; } = null!;

    [Required]
    // YYYY-MM format
    [RegularExpression(@"^(19|20)\d{2}-(0[1-9]|1[0-2])$", ErrorMessage = "From must be in YYYY-MM format (1900–2099).")]
    public string From { get; set; } = null!;

    // null = currently in this role
    [RegularExpression(@"^(19|20)\d{2}-(0[1-9]|1[0-2])$", ErrorMessage = "To must be in YYYY-MM format (1900–2099).")]
    public string? To { get; set; }

    [Required]
    [MaxLength(ValidationConstants.MaxProfileWorkHistoryDescriptionLength)]
    public string Description { get; set; } = null!;

    /// <summary>Cross-field date rules: From not future; To ≥ From and not future when present.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        // Lexicographic compare works for YYYY-MM because the format is zero-padded
        var now = DateTime.UtcNow.ToString("yyyy-MM");
        if (From != null && string.Compare(From, now, StringComparison.Ordinal) > 0)
            yield return new ValidationResult("From date cannot be in the future.", [nameof(From)]);
        if (To != null)
        {
            if (string.Compare(To, now, StringComparison.Ordinal) > 0)
                yield return new ValidationResult("To date cannot be in the future.", [nameof(To)]);
            if (From != null && string.Compare(To, From, StringComparison.Ordinal) < 0)
                yield return new ValidationResult("To must be on or after From.", [nameof(To)]);
        }
    }
}
