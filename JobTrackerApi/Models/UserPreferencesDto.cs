using System.ComponentModel.DataAnnotations;

namespace JobTrackerApi.Models;

// Shape for GET and PUT /api/account/preferences.
// VisibleColumns holds the keys of columns the user has chosen to show in the job table.
// Fixed columns (company, role) are never included — they are always visible.
// Valid keys: status, priority, appliedAt, closedAt, location, workMode, salary, interviewAt, jobUrl
// Default (no saved preference): status, priority, appliedAt, closedAt
public class UserPreferencesDto
{
    [Required]
    public List<string> VisibleColumns { get; set; } = [];
}
