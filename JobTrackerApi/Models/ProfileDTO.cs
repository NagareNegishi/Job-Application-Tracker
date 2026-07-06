namespace JobTrackerApi.Models;
using System.ComponentModel.DataAnnotations;

/// <summary>Request DTO for PUT (create) and PATCH (merge-patch) on /api/account/profile.</summary>
/// <remarks>All fields are nullable — null means "omitted in PATCH, leave unchanged"; [] clears the array.</remarks>
public class ProfileDTO : IValidatableObject
{
    [MaxLength(ValidationConstants.MaxProfileTargetRolesCount)]
    public List<string>? TargetRoles { get; set; }

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
    }

    /// <summary>Creates a new UserProfile entity from this DTO (used by PUT).</summary>
    public UserProfile ToProfile(string userId) => new()
    {
        UserId = userId,
        TargetRoles = TargetRoles ?? [],
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
        if (Skills != null) profile.Skills = Skills;
        if (Certifications != null) profile.Certifications = Certifications;
        if (Languages != null) profile.Languages = Languages;
        if (WorkingRights != null) profile.WorkingRights = WorkingRights;
        if (WorkHistory != null) profile.WorkHistory = WorkHistory;
        if (Education != null) profile.Education = Education;
    }
}
