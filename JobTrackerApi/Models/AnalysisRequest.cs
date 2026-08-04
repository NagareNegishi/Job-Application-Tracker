namespace JobTrackerApi.Models;

/// <summary>Request DTO for the AI job analysis endpoints.</summary>
public class AnalysisRequest
{
    public string Description { get; set; } = string.Empty;
    public string? Role { get; set; }
    public string? Company { get; set; }
}
