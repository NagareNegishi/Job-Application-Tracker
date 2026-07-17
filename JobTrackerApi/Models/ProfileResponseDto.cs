namespace JobTrackerApi.Models;

/// <summary>Response shape for GET /api/account/profile.</summary>
public class ProfileResponseDto
{
    // What I'm looking for
    public List<string> TargetRoles { get; set; } = [];
    public List<WorkMode> WorkModes { get; set; } = [];
    public List<ContractType> ContractTypes { get; set; } = [];
    public List<SalaryExpectation> SalaryExpectations { get; set; } = [];
    public List<PreferredLocationEntry> PreferredLocations { get; set; } = [];
    public string? AdditionalConditions { get; set; }

    // Background
    public List<string> Skills { get; set; } = [];
    public List<string> Certifications { get; set; } = [];
    public List<string> Languages { get; set; } = [];
    public List<WorkingRightEntry> WorkingRights { get; set; } = [];
    public List<WorkHistoryEntry> WorkHistory { get; set; } = [];
    public List<EducationEntry> Education { get; set; } = [];
}
