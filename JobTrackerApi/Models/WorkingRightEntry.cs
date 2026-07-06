namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>Work authorisation held in a specific country.</summary>
public class WorkingRightEntry
{
    [Required]
    [MaxLength(2)]
    // ISO 3166-1 alpha-2 code, e.g. "NZ", "AU"
    [RegularExpression(@"^[A-Z]{2}$", ErrorMessage = "Country must be a valid ISO 3166-1 alpha-2 code (e.g. NZ, AU).")]
    public string Country { get; set; } = null!;

    [Required]
    public WorkingRight Status { get; set; }
}
