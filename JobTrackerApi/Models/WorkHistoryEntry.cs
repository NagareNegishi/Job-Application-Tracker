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

    // [Required], but missing value deserialises as 0, which [Range] rejects.
    [Range(1900, 2099)]
    public int FromYear { get; set; }

    [Range(1, 12)]
    public int? FromMonth { get; set; }

    // null = currently in this role
    [Range(1900, 2099)]
    public int? ToYear { get; set; }

    [Range(1, 12)]
    public int? ToMonth { get; set; }

    [MaxLength(ValidationConstants.MaxProfileWorkHistoryDescriptionLength)]
    public string? Description { get; set; }

    /// <summary>Cross-field date rules: From not future; To ≥ From and not future when present.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var now = DateTime.UtcNow;

        if (FromYear > now.Year || (FromYear == now.Year && FromMonth > now.Month))
            yield return new ValidationResult("From date cannot be in the future.", [nameof(FromYear)]);

        if (ToYear.HasValue)
        {
            if (ToYear > now.Year || (ToYear == now.Year && ToMonth > now.Month))
                yield return new ValidationResult("To date cannot be in the future.", [nameof(ToYear)]);

            if (ToYear < FromYear)
                yield return new ValidationResult("To must be on or after From.", [nameof(ToYear)]);

            if (ToYear == FromYear && ToMonth.HasValue && FromMonth.HasValue && ToMonth < FromMonth)
                yield return new ValidationResult("To must be on or after From.", [nameof(ToMonth)]);
        }
    }
}
