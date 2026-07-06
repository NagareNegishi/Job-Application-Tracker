namespace JobTrackerApi.Models;

/// <summary>A single work history entry in a user's profile.</summary>
public class WorkHistoryEntry
{
    public string Title { get; set; } = null!;
    public string Company { get; set; } = null!;
    // YYYY-MM format
    public string From { get; set; } = null!;
    // null = currently in this role
    public string? To { get; set; }
    public string Description { get; set; } = null!;
}
