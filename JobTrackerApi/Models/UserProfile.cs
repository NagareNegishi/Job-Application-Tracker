namespace JobTrackerApi.Models;

/// <summary>User career profile used as context for AI job analysis.</summary>
public class UserProfile
{
    public int Id { get; set; }
    public string UserId { get; set; } = null!;
    public ApplicationUser User { get; set; } = null!;

    // text[] via Npgsql native array support
    public List<string> TargetRoles { get; set; } = [];
    public List<string> Skills { get; set; } = [];
    public List<string> Certifications { get; set; } = [];

    // JSONB via OwnsMany + ToJson() — see JobTrackerContext
    public List<LanguageEntry> Languages { get; set; } = [];
    public List<WorkingRightEntry> WorkingRights { get; set; } = [];
    public List<WorkHistoryEntry> WorkHistory { get; set; } = [];
    public List<EducationEntry> Education { get; set; } = [];
    public List<SalaryExpectation> SalaryExpectations { get; set; } = [];
    public List<PreferredLocationEntry> PreferredLocations { get; set; } = [];

    // JSONB via PrimitiveCollection — see JobTrackerContext
    public List<WorkMode> WorkModes { get; set; } = [];
    public List<ContractType> ContractTypes { get; set; } = [];

    public string? AdditionalConditions { get; set; }

    public ProfileResponseDto ToResponseDto() => new()
    {
        TargetRoles = TargetRoles,
        WorkModes = WorkModes,
        ContractTypes = ContractTypes,
        SalaryExpectations = SalaryExpectations,
        PreferredLocations = PreferredLocations,
        AdditionalConditions = AdditionalConditions,
        Skills = Skills,
        Certifications = Certifications,
        Languages = Languages,
        WorkingRights = WorkingRights,
        WorkHistory = WorkHistory,
        Education = Education
    };
}
