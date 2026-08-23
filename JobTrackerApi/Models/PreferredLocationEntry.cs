namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>A place the candidate wants to work: a country, optionally narrowed to specific areas.</summary>
public class PreferredLocationEntry
{
    [Required]
    [MaxLength(2)]
    // ISO 3166-1 alpha-2 code, e.g. "NZ", "AU"
    [RegularExpression(@"^[A-Z]{2}$", ErrorMessage = "Country must be a valid ISO 3166-1 alpha-2 code (e.g. NZ, AU).")]
    public string Country { get; set; } = null!;

    // Empty = anywhere in the country; otherwise specific cities/regions.
    [MaxLength(ValidationConstants.MaxProfileLocationAreasCount)]
    public List<string> Areas { get; set; } = [];
}
