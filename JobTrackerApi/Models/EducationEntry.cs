namespace JobTrackerApi.Models;

/// <summary>A single education entry in a user's profile.</summary>
public class EducationEntry
{
    public string Institution { get; set; } = null!;
    public string Degree { get; set; } = null!;
    public int From { get; set; }
    // null = currently enrolled
    public int? To { get; set; }
}
