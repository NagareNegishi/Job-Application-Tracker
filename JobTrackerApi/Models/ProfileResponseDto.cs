namespace JobTrackerApi.Models;

/// <summary>Response shape for GET /api/account/profile.</summary>
public class ProfileResponseDto
{
    public List<string> TargetRoles { get; set; } = [];
    public List<string> Skills { get; set; } = [];
    public List<string> Certifications { get; set; } = [];
    public List<string> Languages { get; set; } = [];
    public List<WorkingRightEntry> WorkingRights { get; set; } = [];
    public List<WorkHistoryEntry> WorkHistory { get; set; } = [];
    public List<EducationEntry> Education { get; set; } = [];
}
