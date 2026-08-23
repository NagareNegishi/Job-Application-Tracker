namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>A single education entry in a user's profile.</summary>
public class EducationEntry : IValidatableObject
{
    [Required]
    [MaxLength(ValidationConstants.MaxProfileEducationInstitutionLength)]
    public string Institution { get; set; } = null!;

    [Required]
    [MaxLength(ValidationConstants.MaxProfileEducationDegreeLength)]
    public string Degree { get; set; } = null!;

    [Range(1900, 2099)]
    public int From { get; set; }

    // null = currently enrolled
    [Range(1900, 2099)]
    public int? To { get; set; }

    /// <summary>Cross-field date rules: From not future; To ≥ From and not future when present.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var currentYear = DateTime.UtcNow.Year;
        if (From > currentYear)
            yield return new ValidationResult("From year cannot be in the future.", [nameof(From)]);
        if (To.HasValue)
        {
            if (To > currentYear)
                yield return new ValidationResult("To year cannot be in the future.", [nameof(To)]);
            if (To < From)
                yield return new ValidationResult("To must be on or after From.", [nameof(To)]);
        }
    }
}
