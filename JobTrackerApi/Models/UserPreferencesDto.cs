using System.ComponentModel.DataAnnotations;

namespace JobTrackerApi.Models;

/// <summary>Shape for GET and PUT /api/account/preferences.</summary>
public class UserPreferencesDto
{
    // Keys of columns the user has chosen to show in the job table.
    // Fixed columns (company, role) are never included — they are always visible.
    // Valid keys: status, priority, appliedAt, closedAt, location, workMode, salary, interviewAt, jobUrl
    // Default (no saved preference): status, priority, appliedAt, closedAt
    [Required]
    public List<string> VisibleColumns { get; set; } = [];

    // Whether the AI auto-fill dialog appears before the Add Job sheet for AI users.
    public bool AutoFillEnabled { get; set; } = true;

    // "blue" | "red" | "yellow" | "pink" | null (no color theme)
    public string? Theme { get; set; }
}
