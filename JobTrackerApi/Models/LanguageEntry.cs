namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>A language the candidate speaks, with a general fluency level.</summary>
public class LanguageEntry
{
    [Required]
    [MaxLength(ValidationConstants.MaxProfileLanguageItemLength)]
    public string Language { get; set; } = null!;

    // Nullable so [Required] rejects an omitted value
    [Required]
    public LanguageFluency? Fluency { get; set; }
}
