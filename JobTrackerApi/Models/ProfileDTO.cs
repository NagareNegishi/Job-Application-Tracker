namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>Request DTO for PUT (create) and PATCH (merge-patch) on /api/account/profile.</summary>
/// <remarks>All fields are nullable — null means "omitted in PATCH, leave unchanged"; [] clears the array.</remarks>
public class ProfileDTO : IValidatableObject
{
    [MaxLength(ValidationConstants.MaxProfileTargetRolesCount)]
    public List<string>? TargetRoles { get; set; }

    [MaxLength(ValidationConstants.MaxProfileWorkModesCount)]
    public List<WorkMode>? WorkModes { get; set; }

    [MaxLength(ValidationConstants.MaxProfileContractTypesCount)]
    public List<ContractType>? ContractTypes { get; set; }

    [MaxLength(ValidationConstants.MaxProfileSalaryExpectationsCount)]
    public List<SalaryExpectation>? SalaryExpectations { get; set; }

    [MaxLength(ValidationConstants.MaxProfileLocationsCount)]
    public List<PreferredLocationEntry>? PreferredLocations { get; set; }

    [MaxLength(ValidationConstants.MaxProfileAdditionalConditionsLength)]
    public string? AdditionalConditions { get; set; }

    [MaxLength(ValidationConstants.MaxProfileSkillsCount)]
    public List<string>? Skills { get; set; }

    [MaxLength(ValidationConstants.MaxProfileCertificationsCount)]
    public List<string>? Certifications { get; set; }

    [MaxLength(ValidationConstants.MaxProfileLanguagesCount)]
    public List<string>? Languages { get; set; }

    [MaxLength(ValidationConstants.MaxProfileWorkingRightsCount)]
    public List<WorkingRightEntry>? WorkingRights { get; set; }

    [MaxLength(ValidationConstants.MaxProfileWorkHistoryCount)]
    public List<WorkHistoryEntry>? WorkHistory { get; set; }

    [MaxLength(ValidationConstants.MaxProfileEducationCount)]
    public List<EducationEntry>? Education { get; set; }

    /// <summary>Per-item length checks for the primitive string list fields.</summary>
    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        if (TargetRoles?.Any(s => s?.Length > ValidationConstants.MaxProfileTargetRoleItemLength) == true)
            yield return new ValidationResult(
                $"Each target role must be {ValidationConstants.MaxProfileTargetRoleItemLength} characters or fewer.",
                [nameof(TargetRoles)]);

        if (Skills?.Any(s => s?.Length > ValidationConstants.MaxProfileSkillItemLength) == true)
            yield return new ValidationResult(
                $"Each skill must be {ValidationConstants.MaxProfileSkillItemLength} characters or fewer.",
                [nameof(Skills)]);

        if (Certifications?.Any(s => s?.Length > ValidationConstants.MaxProfileCertificationItemLength) == true)
            yield return new ValidationResult(
                $"Each certification must be {ValidationConstants.MaxProfileCertificationItemLength} characters or fewer.",
                [nameof(Certifications)]);

        if (Languages?.Any(s => s?.Length > ValidationConstants.MaxProfileLanguageItemLength) == true)
            yield return new ValidationResult(
                $"Each language must be {ValidationConstants.MaxProfileLanguageItemLength} characters or fewer.",
                [nameof(Languages)]);

        if (PreferredLocations?.Any(l => l.Areas.Any(a => a?.Length > ValidationConstants.MaxProfileLocationAreaItemLength)) == true)
            yield return new ValidationResult(
                $"Each location area must be {ValidationConstants.MaxProfileLocationAreaItemLength} characters or fewer.",
                [nameof(PreferredLocations)]);

        if (AdditionalConditions != null && System.Text.RegularExpressions.Regex.IsMatch(AdditionalConditions, @"<[a-zA-Z/]"))
            yield return new ValidationResult(
                "Additional conditions must not contain HTML.",
                [nameof(AdditionalConditions)]);

        // One expectation per currency
        if (SalaryExpectations?.Where(s => s.Currency != null)
                .GroupBy(s => s.Currency).Any(g => g.Count() > 1) == true)
            yield return new ValidationResult(
                "Each salary expectation must use a distinct currency.",
                [nameof(SalaryExpectations)]);
    }

    /// <summary>Creates a new UserProfile entity from this DTO (used by PUT).</summary>
    public UserProfile ToProfile(string userId) => new()
    {
        UserId = userId,
        TargetRoles = TargetRoles ?? [],
        WorkModes = WorkModes ?? [],
        ContractTypes = ContractTypes ?? [],
        SalaryExpectations = SalaryExpectations ?? [],
        PreferredLocations = PreferredLocations ?? [],
        AdditionalConditions = AdditionalConditions, // nullable on entity; null = not set
        Skills = Skills ?? [],
        Certifications = Certifications ?? [],
        Languages = Languages ?? [],
        WorkingRights = WorkingRights ?? [],
        WorkHistory = WorkHistory ?? [],
        Education = Education ?? []
    };

    /// <summary>Applies non-null fields to an existing profile (used by PATCH merge-patch).</summary>
    public void ApplyTo(UserProfile profile)
    {
        if (TargetRoles != null) profile.TargetRoles = TargetRoles;
        if (WorkModes != null) profile.WorkModes = WorkModes;
        if (ContractTypes != null) profile.ContractTypes = ContractTypes;
        if (SalaryExpectations != null) profile.SalaryExpectations = SalaryExpectations;
        if (PreferredLocations != null) profile.PreferredLocations = PreferredLocations;
        if (AdditionalConditions != null) profile.AdditionalConditions = AdditionalConditions;
        if (Skills != null) profile.Skills = Skills;
        if (Certifications != null) profile.Certifications = Certifications;
        if (Languages != null) profile.Languages = Languages;
        if (WorkingRights != null) profile.WorkingRights = WorkingRights;
        if (WorkHistory != null) profile.WorkHistory = WorkHistory;
        if (Education != null) profile.Education = Education;
    }
}
