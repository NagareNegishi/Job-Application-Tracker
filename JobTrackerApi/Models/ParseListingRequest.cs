using System.ComponentModel.DataAnnotations;
using System.Text.RegularExpressions;

namespace JobTrackerApi.Models;

/// <summary>Request DTO for the AI job listing parser endpoint.</summary>
public class ParseListingRequest : IValidatableObject
{
    [Required(AllowEmptyStrings = false)]
    [MaxLength(8000)]
    public string Text { get; set; } = string.Empty;

    // HTML in a textarea paste is stripped by the browser — presence signals a crafted request.
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (Regex.IsMatch(Text, @"<[a-zA-Z/]"))
            yield return new ValidationResult("Invalid request.", [nameof(Text)]);
    }
}
