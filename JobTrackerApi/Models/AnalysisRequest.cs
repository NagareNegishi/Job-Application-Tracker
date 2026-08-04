using System.ComponentModel.DataAnnotations;

namespace JobTrackerApi.Models;

/// <summary>Request DTO for the AI job analysis endpoints.</summary>
public class AnalysisRequest
{
    [Required(AllowEmptyStrings = false)]
    [MinLength(ValidationConstants.MinAnalysisDescription)]
    [MaxLength(ValidationConstants.MaxDescriptionLength)]
    public string Description { get; set; } = string.Empty;
    [MaxLength(ValidationConstants.MaxRoleLength)]
    public string? Role { get; set; }
    [MaxLength(ValidationConstants.MaxCompanyLength)]
    public string? Company { get; set; }
}
