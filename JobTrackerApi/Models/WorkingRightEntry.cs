namespace JobTrackerApi.Models;

/// <summary>Work authorisation held in a specific country.</summary>
public class WorkingRightEntry
{
    // ISO 3166-1 alpha-2 code, e.g. "NZ", "AU"
    public string Country { get; set; } = null!;
    public WorkingRight Status { get; set; }
}
